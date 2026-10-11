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
const opaque = new Map<string, number>();
let transparent = 0;
let lumSum = 0;
let lumCount = 0;
for (let i = 0; i < d0.length; i += i0.channels) {
	if (d0[i + 3] < 128) transparent++;
	else {
		const key = `${d0[i]},${d0[i + 1]},${d0[i + 2]}`;
		opaque.set(key, (opaque.get(key) ?? 0) + 1);
		lumSum += 0.299 * d0[i] + 0.587 * d0[i + 1] + 0.114 * d0[i + 2];
		lumCount++;
	}
}
const sprite = transparent / (i0.width * i0.height) > 0.2 && opaque.size <= 32;
// Sprite polarity: a light sprite (white body, dark outline) keeps its tone,
// a dark sprite inverts, so in both cases the figure's body is the ink and
// its dark features (outline, eyes) are holes.
const light = lumCount > 0 && lumSum / lumCount >= 128;
// Sprites with few enough colors become coloured pieces on a canvas: every
// cell keeps its source colour. (32 is the sprite-mode cap; 64 the palette.)
const colored = sprite && opaque.size <= 64;

let cols = COLS;
let rows: number;
let fps: number;
let frames: string[];
// For colored pieces: palette hex entries, most frequent color first, and
// frames as index characters (code 35 + palette index, space = empty cell).
let palette: string[] | null = null;

if (sprite) {
	// Keep 1:1 with the source pixels when asked for at least that width.
	cols = Math.min(COLS, i0.width);
	rows = Math.round((i0.height / i0.width) * cols);
	fps = Math.round(nativeFps);

	const grays = await Promise.all(
		picked.map((f) =>
			sharp(path.join(workdir, f)).resize({
				width: cols,
				height: rows,
				fit: "fill",
				// nearest keeps pixels crisp when upscaling to 1:1 cells or
				// beyond; when shrinking, sampling can drift off the sprite's
				// pixel grid and shear edges, so average instead
				kernel: cols >= i0.width ? "nearest" : "cubic",
			})
				.ensureAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true }),
		),
	);

	// trimEnd: trailing blank cells are invisible in a <pre>, and some
	// pre-commit hooks (trailing-whitespace) would strip them anyway.
	const finish = (lines: string[]) =>
		lines.map((l) => l.trimEnd()).join("\n");

	if (colored) {
		// Each cell becomes a full block in its own source color: the sprite
		// is drawn as pixel art on a canvas, and the eye/outline colors stay
		// themselves instead of collapsing into holes.
		palette = [...opaque.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([key]) => {
				const [r, g, b] = key.split(",").map(Number);
				return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
			});
		const palRgb = palette.map((p) =>
			[1, 3, 5].map((i) => parseInt(p.slice(i, i + 2), 16)),
		);
		frames = grays.map(({ data }) => {
			const lines: string[] = [];
			for (let y = 0; y < rows; y++) {
				let line = "";
				for (let x = 0; x < cols; x++) {
					const k = (y * cols + x) * 4;
					if (data[k + 3] < 128) {
						line += " ";
						continue;
					}
					let best = 0;
					let bestD = Infinity;
					for (let i = 0; i < palRgb.length; i++) {
						const dr = data[k] - palRgb[i][0];
						const dg = data[k + 1] - palRgb[i][1];
						const db = data[k + 2] - palRgb[i][2];
						const d = dr * dr + dg * dg + db * db;
						if (d < bestD) {
							bestD = d;
							best = i;
						}
					}
					line += String.fromCharCode(35 + best);
				}
				lines.push(line);
			}
			return finish(lines);
		});
	} else {
		// One ink: brightness follows polarity so the body is solid ink and
		// dark features like eyes are holes. Sprites with very few colors are
		// classified flat (each cell in or out) so scaling smears cannot
		// dither the figure; richer sprites keep the tone ramp.
		const flat = opaque.size <= 3;
		frames = grays.map(({ data }) => {
			const lines: string[] = [];
			for (let y = 0; y < rows; y++) {
				let line = "";
				for (let x = 0; x < cols; x++) {
					const k = (y * cols + x) * 4;
					const v =
						0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2];
					const a = data[k + 3] / 255;
					let ink: number;
					if (flat) {
						const body = light ? v / 255 >= 0.5 : v / 255 < 0.5;
						ink = a >= 0.5 && body ? 1 : 0;
					} else {
						ink = a * (light ? v / 255 : 1 - v / 255);
					}
					line += RAMP[Math.min(RAMP.length - 1, Math.floor(ink * RAMP.length))];
				}
				lines.push(line);
			}
			return finish(lines);
		});
	}
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
const mode = `${sprite ? "sprite" : "photo"} mode${palette ? ", colored" : ""}`;
const out = palette
	? `/*
 * ${name}: ${note}.
 *
 * GENERATED by scripts/generate-ascii-gif.ts — do not edit by hand.
 *
 * Source: ${urlOrPath}
 * Grid: ${cols}x${rows} square cells, ${frames.length} frames at ${fps} fps (${mode}).
 * Follows the ascii.rest piece contract (MIT, https://ascii.rest).
 *
 * Each cell is a full block in its own source color, so the piece draws as
 * pixel art on a canvas (env.color carries the palette index, encoded in
 * each stored character as code 35 + index). Without a canvas it falls
 * back to one ink.
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
	cell: 1,
	palette: [${palette.map((p) => JSON.stringify(p)).join(", ")}],
} satisfies Meta;

const FRAMES: string[] = [
${frames.map((f) => `\t\`${f}\`,`).join("\n")}
];

export default function ${fnName}(): Frame {
	return (t, env) => {
		const s = FRAMES[Math.floor(t * meta.fps) % FRAMES.length];
		const color = env?.color;
		const lines = s.split("\\n");
		while (lines.length < meta.rows) lines.push("");
		const out: string[] = [];
		for (let y = 0; y < meta.rows; y++) {
			// every frame is returned padded to the full grid: mount() diffs
			// frames character by character and only redraws cells it visits,
			// so ragged lines would leave stale cells on screen
			const line = lines[y].padEnd(meta.cols, " ");
			let drawn = "";
			for (let x = 0; x < meta.cols; x++) {
				const c = line[x];
				if (c === " ") {
					drawn += " ";
					continue;
				}
				drawn += "█";
				if (color) color[y * meta.cols + x] = c.charCodeAt(0) - 35;
			}
			out.push(drawn);
		}
		return out.join("\\n");
	};
}
`
	: `/*
 * ${name}: ${note}.
 *
 * GENERATED by scripts/generate-ascii-gif.ts — do not edit by hand.
 *
 * Source: ${urlOrPath}
 * Grid: ${cols}x${rows} square cells, ${frames.length} frames at ${fps} fps (${mode}).
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
	`[generate-ascii-gif] wrote ${outFile} (${kb} kB, ${cols}x${rows}, ${frames.length} frames @ ${fps} fps, ${mode})`,
);
