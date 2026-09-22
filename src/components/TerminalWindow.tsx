import clsx from "clsx";
import type { ReactNode } from "react";

export default function TerminalWindow({
	title,
	children,
	tight = false,
}: Readonly<{
	title: ReactNode;
	children: ReactNode;
	tight?: boolean;
}>) {
	return (
		<div className={clsx("term", tight && "term-tight")}>
			<div className="term-bar">
				<span className="term-title">{title}</span>
			</div>
			<div className="term-body">{children}</div>
		</div>
	);
}
