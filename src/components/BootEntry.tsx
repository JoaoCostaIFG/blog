import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

const ACCENT_VARS = {
	green: "var(--color-term-green)",
	cyan: "var(--color-term-cyan)",
	orange: "var(--color-term-orange)",
	purple: "var(--color-term-purple)",
	blue: "var(--color-term-blue)",
} as const;

export type BootEntryAccent = keyof typeof ACCENT_VARS;

export const BOOT_ACCENTS: BootEntryAccent[] = [
	"green",
	"cyan",
	"orange",
	"purple",
	"blue",
];

interface BootEntryProps {
	idx: number;
	href: string;
	kind: string;
	title: string;
	desc?: ReactNode;
	accent?: BootEntryAccent;
}

export default function BootEntry({
	idx,
	href,
	kind,
	title,
	desc,
	accent = "green",
}: Readonly<BootEntryProps>) {
	return (
		<Link
			href={href}
			data-boot-entry
			className="boot-entry"
			style={{ "--lc": ACCENT_VARS[accent] } as CSSProperties}
		>
			<span className="idx">{idx}</span>
			<span className="min-w-0 flex-1">
				<span className="kind">{kind}</span>
				<span className="ti">{title}</span>
				{desc && (
					<span className="ds line-clamp-1 sm:line-clamp-2">{desc}</span>
				)}
			</span>
			<span className="go" aria-hidden>
				→
			</span>
		</Link>
	);
}
