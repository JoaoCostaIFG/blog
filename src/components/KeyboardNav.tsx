"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * openstick.de style boot-menu keyboard navigation:
 * press 1-9 to open the matching entry, arrow keys + Enter to
 * select and boot. Entries are picked up from the DOM via the
 * `data-boot-entry` attribute, in document order.
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
			list[i]?.focus({ preventScroll: true });
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
			if (e.key === "ArrowDown") {
				e.preventDefault();
				highlight(sel < count - 1 ? sel + 1 : 0);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				highlight(sel > 0 ? sel - 1 : count - 1);
			} else if (e.key === "Enter" && sel >= 0 && sel < hrefs.length) {
				e.preventDefault();
				router.push(hrefs[sel]);
			}
		}

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [hrefs, router]);

	return null;
}
