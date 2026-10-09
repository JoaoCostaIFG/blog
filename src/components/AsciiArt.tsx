"use client";

import type { MountOptions } from "ascii.rest/react";
import { Ascii } from "ascii.rest/react";
import clsx from "clsx";
import type { CSSProperties } from "react";

/**
 * The pieces this site uses, with the frame metadata AsciiArt sizes them by.
 * Each loads as its own lazy chunk when it first mounts.
 */
const META = {
	donut: { cols: 40, rows: 22, cell: 2, palette: false },
	"boot-log": { cols: 64, rows: 16, cell: 2, palette: false },
	"not-found": { cols: 60, rows: 21, cell: 2, palette: false },
	"tokyo-rain": { cols: 200, rows: 100, cell: 1, palette: true },
} as const;

type SitePiece = keyof typeof META;

/** Inks a piece can be drawn in. */
type AsciiInk = "ink" | "dim" | "green" | "green-soft" | "red";

const INKS: Record<AsciiInk, string> = {
	ink: "text-term-ink",
	dim: "text-term-dim",
	green: "text-term-green",
	"green-soft": "text-term-green-soft",
	red: "text-term-red",
};

interface AsciiArtProps {
	/** A piece name from META. */
	piece: SitePiece;
	/** Option overrides for the piece, plus `fps`. */
	options?: MountOptions;
	/** Largest font size the art may scale up to (it always fits the container). */
	cap?: string;
	/** Center each line inside the container. */
	center?: boolean;
	/** Pure decoration: hide the art from assistive technology. */
	decorative?: boolean;
	/** What the art shows; the piece's name by default. */
	label?: string;
	/** Ink the piece is drawn in. */
	ink?: AsciiInk;
	/** Fade the art into the background (for large decorative scenes). */
	faded?: boolean;
}

/**
 * An animated ascii.rest piece fitted to its container's width. Text and
 * mono-rendered pieces draw in the page's own monospace face and one ink,
 * and hold their first frame for readers who prefer reduced motion.
 */
export default function AsciiArt({
	piece,
	options,
	cap = "14px",
	center = false,
	decorative = false,
	label,
	ink = "ink",
	faded = false,
}: AsciiArtProps) {
	const { cols, rows, cell, palette } = META[piece];

	return (
		<div
			aria-hidden={decorative || undefined}
			className={clsx(
				"ascii-art",
				INKS[ink],
				center && "text-center",
				faded && "opacity-80",
			)}
			style={
				{
					"--cols": cols,
					"--rows": rows,
					// square-celled pieces (scenes) tighten rows to keep their aspect
					"--lh": cell === 1 ? 0.6 : 1.1,
					"--cap": cap,
				} as CSSProperties
			}
		>
			<Ascii label={label} mono={palette} options={options} piece={piece} />
		</div>
	);
}
