#!/usr/bin/env bun
/**
 * Convert an animated GIF into an ascii.rest piece module.
 *
 * Two conversion modes, picked automatically:
 *  - photo: painted/shaded art. Finds the drawing's bounding box by
 *    distance from the dominant background tone, calibrates ink contrast
 *    by percentile, and scales with smooth interpolation.
 *  - sprite: flat pixel art with transparency (few colors, mostly alpha).
 *    Ink comes from the alpha mask plus tone, and scaling is
 *    nearest-neighbour so pixels stay crisp; the grid is kept 1:1 with the
 *    source pixels when COLS matches the source width.
 *
 * Usage:
 *   bun run scripts/generate-ascii-gif.ts <gif-url-or-path> <name> [cols] [frames] [note]
 *
 * Arguments:
 *   <gif-url-or-path>  where to read the GIF from (local path or http(s))
 *   <name>             piece/module name (used for the output file)
 *   [cols]             grid width in characters (default 56)
 *   [frames]           frames to sample (default 48, clamped to the gif)
 *   [note]             one-line description for the piece's meta
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const RAMP = " .:-=+*#%@";

const urlOrPath = process.argv[2];
const name = process.argv[3];
if (!urlOrPath || !name) {
	console.error(
		"usage: bun run scripts/generate-ascii-gif.ts <gif-url-or-path> <name> [cols] [frames] [note]",
	);
	process.exit(1);
}
const COLS = Number(process.argv[4] ?? 56);
const FRAMES = Number(process.argv[5] ?? 48);
const note = process.argv[6] ?? `a looping drawing, converted from a gif`;

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "ascii-gif-"));
const gifPath = path.join(workdir, "in.gif");

if (/^https?:\/\//.test(urlOrPath)) {
	execSync(`curl -sL -o ${gifPath} ${JSON.stringify(urlOrPath)}`);
} else {
	fs.copyFileSync(urlOrPath, gifPath);
}

// Coalesce (compose the delta frames) into numbered PNGs with ffmpeg.
execSync(`ffmpeg -y -loglevel error -i ${gifPath} ${path.join(workdir, "f-%03d.png")}`);
const pngs = fs.readdirSync(workdir).filter((f) => f.startsWith("f-")).sort();
if (pngs.length < 2) {
	console.error(`[generate-ascii-gif] need at least 2 frames, got ${pngs.length}`);
	process.exit(1);
}

// Native frame rate, from ffmpeg's stream info (default 24).
const info = execSync(`ffmpeg -i ${gifPath} 2>&1 || true`).toString();
const nativeFps = Number(info.match(/([\d.]+) fps/)?.[1] ?? 24);

// Sample evenly across the animation (or take every frame if there are
// fewer than requested).
const count = Math.min(FRAMES, pngs.length);
const picked = Array.from(
	{ length: count },
	(_, i) => pngs[Math.round((i * (pngs.length - 1)) / (count - 1))],
);

const read = (f: string) =>
	sharp(path.join(workdir, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// Sprite mode: meaningful transparency, few distinct opaque colors.
const { data: d0, info: i0 } = await read(picked[0]);
const opaque = new Set<string>();
let transparent = 0;
for (let i = 0; i < d0.length; i += i0.channels) {
	if (d0[i + 3] < 128) transparent++;
	else opaque.add(`${d0[i]},${d0[i + 1]},${d0[i + 2]}`);
}
const sprite = transparent / (i0.width * i0.height) > 0.2 && opaque.size <= 32;

let cols = COLS;
let rows: number;
let fps: number;
let frames: string[];

if (sprite) {
	// Keep 1:1 with the source pixels when asked for at least that width.
	cols = Math.min(COLS, i0.width);
	rows = Math.round((i0.height / i0.width) * cols);
	fps = Math.round(nativeFps);

	const grays = await Promise.all(
		picked.map((f) =>
			sharp(path.join(workdir, f))
				.resize({ width: cols, height: rows, fit: "fill", kernel: "nearest" })
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true }),
		),
	);

	// Ink from the alpha mask; tone separates body from outline: a light
	// body maps to the second-densest character, dark strokes to the top.
	frames = grays.map(({ data }) => {
		const lines: string[] = [];
		for (let y = 0; y < rows; y++) {
			let line = "";
			for (let x = 0; x < cols; x++) {
				const k = (y * cols + x) * 4;
				const v = 0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2];
				const a = data[k + 3] / 255;
				const dark = 1 - v / 255;
				const ink = a * (0.75 + 0.25 * dark);
				line += RAMP[Math.min(RAMP.length - 1, Math.floor(ink * RAMP.length))];
			}
			lines.push(line);
		}
		// trimEnd: trailing blank cells are invisible in a <pre>, and some
		// pre-commit hooks (trailing-whitespace) would strip them anyway.
		return lines.map((l) => l.trimEnd()).join("\n");
	});
} else {
	// Photo mode: the background tone is whatever dominates frame 0.
	const hist = new Array<number>(256).fill(0);
	{
		const { data, info } = await sharp(path.join(workdir, picked[0]))
			.grayscale()
			.raw()
			.toBuffer({ resolveWithObject: true });
		for (let i = 0; i < data.length; i++) hist[data[i]]++;
	}
	const bg = hist.indexOf(Math.max(...hist));

	// Union bounding box of anything that differs from the background.
	let minX = 1e9;
	let minY = 1e9;
	let maxX = -1;
	let maxY = -1;
	for (const f of picked) {
		const { data, info } = await sharp(path.join(workdir, f))
			.grayscale()
			.raw()
			.toBuffer({ resolveWithObject: true });
		for (let y = 0; y < info.height; y += 2)
			for (let x = 0; x < info.width; x += 2)
				if (Math.abs(data[y * info.width + x] - bg) > 12) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
	}
	const crop = {
		left: minX,
		top: minY,
		width: maxX - minX + 1,
		height: maxY - minY + 1,
	};

	// Square cells: rows/cols follows the crop's aspect (cell:1 in meta).
	rows = Math.max(2, Math.round((crop.height / crop.width) * cols));
	fps = Math.round((count / pngs.length) * nativeFps);

	// Ink = distance from the paper tone; calibrate so the p98 ink maps to
	// the densest ramp character.
	const grays = await Promise.all(
		picked.map((f) =>
			sharp(path.join(workdir, f))
				.extract(crop)
				.resize({ width: cols, height: rows, fit: "fill" })
				.grayscale()
				.raw()
				.toBuffer({ resolveWithObject: true }),
		),
	);
	const inks: number[] = [];
	for (const { data } of grays) for (const v of data) inks.push(Math.abs(v - bg));
	inks.sort((a, b) => a - b);
	const p98 = inks[Math.floor(inks.length * 0.98)] || 1;

	frames = grays.map(({ data }) => {
		const lines: string[] = [];
		for (let y = 0; y < rows; y++) {
			let line = "";
			for (let x = 0; x < cols; x++) {
				const ink = Math.min(1, Math.abs(data[y * cols + x] - bg) / p98);
				line += RAMP[Math.min(RAMP.length - 1, Math.floor(ink * RAMP.length))];
			}
			lines.push(line);
		}
		// trimEnd: trailing blank cells are invisible in a <pre>, and some
		// pre-commit hooks (trailing-whitespace) would strip them anyway.
		return lines.map((l) => l.trimEnd()).join("\n");
	});
}

const fnName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const out = `/*
 * ${name}: ${note}.
 *
 * GENERATED by scripts/generate-ascii-gif.ts — do not edit by hand.
 *
 * Source: ${urlOrPath}
 * Grid: ${cols}x${rows} square cells, ${frames.length} frames at ${fps} fps (${sprite ? "sprite" : "photo"} mode).
 * Follows the ascii.rest piece contract (MIT, https://ascii.rest).
 *
 * NOTE: the source gif is third-party art; make sure its license allows
 * this use before shipping it.
 */
import type { Frame, Meta } from "ascii.rest";

export const meta = {
	name: ${JSON.stringify(name)},
	category: "objects",
	note: ${JSON.stringify(note.slice(0, 72))},
	cols: ${cols},
	rows: ${rows},
	fps: ${fps},
} satisfies Meta;

const FRAMES: string[] = [
${frames.map((f) => `\t\`${f}\`,`).join("\n")}
];

export default function ${fnName}(): Frame {
	return (t) => FRAMES[Math.floor(t * meta.fps) % FRAMES.length];
}
`;

const outFile = path.join("src", "lib", "ascii", `${name}.ts`);
fs.writeFileSync(outFile, out);
const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
console.log(
	`[generate-ascii-gif] wrote ${outFile} (${kb} kB, ${cols}x${rows}, ${frames.length} frames @ ${fps} fps, ${sprite ? "sprite" : "photo"} mode)`,
);
