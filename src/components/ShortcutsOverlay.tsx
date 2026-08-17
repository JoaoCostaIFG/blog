"use client";

import { useEffect, useRef } from "react";

const BINDINGS: ReadonlyArray<{ keys: string; desc: string }> = [
	{ keys: "gg", desc: "scroll to top" },
	{ keys: "G", desc: "scroll to bottom" },
	{ keys: "d / u", desc: "scroll half page down / up" },
	{ keys: "j / k", desc: "next / prev boot entry, then scroll page" },
	{ keys: "l / enter", desc: "open selected boot entry" },
	{ keys: "1–9", desc: "open boot entry n" },
	{ keys: "gh", desc: "go home" },
	{ keys: "gp", desc: "go to posts" },
	{ keys: "ga", desc: "go to about" },
	{ keys: "h", desc: "go up (post → posts, else home)" },
	{ keys: "?", desc: "toggle this help" },
	{ keys: "q / enter", desc: "close help" },
	{ keys: "esc", desc: "close help / clear selection" },
];

export default function ShortcutsOverlay({
	onClose,
}: Readonly<{
	onClose: () => void;
}>) {
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		closeRef.current?.focus();
	}, []);

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-term-bg/80 p-4 backdrop-blur-sm"
			role="presentation"
		>
			{/* Backdrop button: dismiss on click and with the keyboard */}
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				aria-label="Close shortcuts help"
				onClick={onClose}
			/>
			<div
				className="term relative w-full max-w-md animate-fade-up"
				role="dialog"
				aria-modal="true"
				aria-label="Keyboard shortcuts"
			>
				<div className="term-bar">
					<span className="term-title">:help shortcuts</span>
				</div>
				<div className="term-body max-h-[70vh] overflow-y-auto py-5">
					<p className="prompt mb-4">
						&gt; normal-mode mappings <span className="cursor animate-blink" />
					</p>
					<ul className="space-y-1.5">
						{BINDINGS.map((b) => (
							<li
								key={b.keys}
								className="flex items-baseline justify-between gap-4 text-xs"
							>
								<span className="key shrink-0">{b.keys}</span>
								<span className="text-term-dim">{b.desc}</span>
							</li>
						))}
					</ul>
					<button
						ref={closeRef}
						type="button"
						className="btn btn-green mt-6 w-full"
						onClick={onClose}
					>
						[ q — close ]
					</button>
				</div>
			</div>
		</div>
	);
}
