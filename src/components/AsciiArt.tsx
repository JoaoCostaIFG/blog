"use client";

import type { MountOptions, Piece, PieceName } from "ascii.rest/react";
import { Ascii } from "ascii.rest/react";
import clsx from "clsx";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

/**
 * Pieces this site uses, with the frame metadata AsciiArt sizes them by.
 * Library names lazy-load their own chunk via ascii.rest; local ones go
 * through LOCAL_LOADERS below. `palette` marks colored pieces; `mono`
 * decides whether they draw in one ink (pre) or in their colors (canvas).
 */
const META = {
	"joao-boot": { cols: 64, rows: 16, cell: 2, palette: false, mono: false },
	"not-found": { cols: 60, rows: 21, cell: 2, palette: false, mono: false },
	slugcat: { cols: 100, rows: 100, cell: 1, palette: true, mono: false },
	"tokyo-rain": { cols: 200, rows: 100, cell: 1, palette: true, mono: true },
} as const;

/** Pieces written for this site, each a lazy chunk of its own. */
const LOCAL_LOADERS = {
	"joao-boot": () => import("@/lib/ascii/joao-boot"),
	slugcat: () => import("@/lib/ascii/slugcat"),
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
	/** Largest width a colored piece may take (canvas pieces fill it). */
	maxw?: string;
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
 * mono-rendered pieces draw in the page's own monospace face and one ink;
 * colored pieces draw their palette on a canvas. All hold their first
 * frame for readers who prefer reduced motion.
 */
export default function AsciiArt({
	piece,
	options,
	cap = "14px",
	maxw,
	center = false,
	decorative = false,
	label,
	ink = "ink",
	faded = false,
}: AsciiArtProps) {
	const { cols, rows, cell, mono } = META[piece];

	// Local pieces resolve to their module inside the client; until then the
	// name string is passed on, which <Ascii> safely ignores (it only loads
	// library names), leaving the reserved frame placeholder in place.
	const isLocal = piece in LOCAL_LOADERS;
	const [mod, setMod] = useState<Piece | null>(null);
	useEffect(() => {
		if (!isLocal) return;
		let live = true;
		LOCAL_LOADERS[piece as keyof typeof LOCAL_LOADERS]().then((m) => {
			if (live) setMod(m as Piece);
		});
		return () => {
			live = false;
		};
	}, [piece, isLocal]);

	// Library pieces load by name; local ones resolve to their module above.
	// A local name passed before its module arrives is simply unknown to
	// <Ascii>, which ignores it and leaves the reserved frame in place.
	const name = piece as PieceName;

	return (
		<div
			aria-hidden={decorative || undefined}
			className={clsx(
				"ascii-art",
				INKS[ink],
				center && "text-center",
				// a canvas piece is sized by mount(); centering it means
				// centering the element itself
				center && !mono && "mx-auto",
				faded && "opacity-80",
			)}
			style={
				{
					"--cols": cols,
					"--rows": rows,
					// square-celled pieces (scenes) tighten rows to keep their aspect
					"--lh": cell === 1 ? 0.6 : 1.1,
					"--cell": cell,
					"--cap": cap,
					"--maxw": maxw,
				} as CSSProperties
			}
		>
			<Ascii label={label} mono={mono} options={options} piece={mod ?? name} />
		</div>
	);
}
