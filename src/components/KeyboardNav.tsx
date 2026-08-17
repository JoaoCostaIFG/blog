"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Boot-menu keyboard navigation for pages with `[data-boot-entry]`
 * elements (home + posts listing): 1-9 opens the matching entry,
 * j/k (and arrows) move the selection, l/enter boots it.
 * Listens for the `vimnav:escape` event (from VimNav) to clear the
 * selection.
 */
export default function KeyboardNav({ hrefs }: { hrefs: string[] }) {
	const router = useRouter();

	useEffect(() => {
		let sel = -1;

		function entries(): HTMLElement[] {
			return Array.from(
				document.querySelectorAll<HTMLElement>("[data-boot-entry]"),
			);
		}

		function highlight(i: number) {
			const list = entries();
			list.forEach((el, n) => {
				el.classList.toggle("sel", n === i);
			});
			sel = i;
			const el = list[i];
			if (el) {
				el.focus({ preventScroll: true });
				// "nearest" only scrolls when the entry is outside the
				// viewport; scroll-margin-top (css) keeps it clear of the
				// sticky navbar. behavior follows css scroll-behavior,
				// so it is instant under prefers-reduced-motion.
				el.scrollIntoView({ block: "nearest" });
			}
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}

			if (/^[1-9]$/.test(e.key)) {
				const idx = Number(e.key) - 1;
				if (idx < hrefs.length) {
					e.preventDefault();
					router.push(hrefs[idx]);
				}
				return;
			}

			const count = entries().length;
			switch (e.key) {
				case "ArrowDown":
				case "j": {
					e.preventDefault();
					highlight(sel < count - 1 ? sel + 1 : 0);
					return;
				}
				case "ArrowUp":
				case "k": {
					e.preventDefault();
					highlight(sel > 0 ? sel - 1 : count - 1);
					return;
				}
				case "l":
				case "Enter": {
					if (sel < 0 && count > 0) {
						// nothing selected yet: boot the first entry
						e.preventDefault();
						router.push(hrefs[0]);
						return;
					}
					if (sel >= 0 && sel < hrefs.length) {
						e.preventDefault();
						router.push(hrefs[sel]);
					}
					return;
				}
			}
		}

		function onEscape() {
			entries().forEach((el) => {
				el.classList.remove("sel");
			});
			sel = -1;
		}

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("vimnav:escape", onEscape);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("vimnav:escape", onEscape);
		};
	}, [hrefs, router]);

	return null;
}
