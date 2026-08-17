import clsx from "clsx";
import type { ReactNode } from "react";

export default function TerminalWindow({
	title,
	children,
	className,
}: Readonly<{
	title: ReactNode;
	children: ReactNode;
	className?: string;
}>) {
	return (
		<div className={clsx("term", className)}>
			<div className="term-bar">
				<span className="dot r" />
				<span className="dot y" />
				<span className="dot g" />
				<span className="term-title">{title}</span>
			</div>
			<div className="term-body">{children}</div>
		</div>
	);
}
