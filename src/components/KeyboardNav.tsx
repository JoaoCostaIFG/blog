"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Page scroll step once j/k move past the boot entries. */
const SCROLL_STEP_PX = 80;

/**
 * Boot-menu keyboard navigation for pages with `[data-boot-entry]`
 * elements (home + posts listing): 1-9 opens the matching entry,
 * j/k (and arrows) move the selection; pressed past either end of
 * the list they scroll the page instead. Scrolling back up with k
 * re-engages the selection on the bottom-most visible entry once
 * the list scrolls back into view. l/enter boots the selection,
 * or the first entry while the list is on screen. Activation
 * honors DOM focus: tabbing into an entry adopts it as the
 * selection, tabbing elsewhere clears the selection so enter
 * follows the focused element instead of a stale entry. Listens
 * for the `vimnav:escape` event (from VimNav) to clear the
 * selection.
 */
export default function KeyboardNav({ hrefs }: { hrefs: string[] }) {
	const router = useRouter();

	useEffect(() => {
		let sel = -1;
		// True once j/k have been handed over to page scrolling
		// (past the entry list); a selection (or escape) clears it.
		let freeScroll = false;

		function entries(): HTMLElement[] {
			return Array.from(
				document.querySelectorAll<HTMLElement>("[data-boot-entry]"),
			);
		}

		/**
		 * Index of the bottom-most boot entry visible in the
		 * viewport, or -1 when none is. Visibility (unlike
		 * scrollY) is a range check, so it cannot race the
		 * global smooth-scroll animation.
		 */
		function lastVisibleEntry(list: HTMLElement[]): number {
			const viewH = window.innerHeight;
			let last = -1;
			for (let n = 0; n < list.length; n++) {
				const rect = list[n].getBoundingClientRect();
				if (rect.top < viewH && rect.bottom > 0) {
					last = n;
				}
			}
			return last;
		}

		function anyEntryVisible(): boolean {
			return lastVisibleEntry(entries()) >= 0;
		}

		function clearSelection() {
			entries().forEach((el) => {
				el.classList.remove("sel");
				// Blur the focused link so a native Enter
				// cannot boot an off-screen entry.
				if (el === document.activeElement) el.blur();
			});
			sel = -1;
			freeScroll = false;
		}

		function select(i: number) {
			entries().forEach((el, n) => {
				el.classList.toggle("sel", n === i);
			});
			sel = i;
			freeScroll = false;
		}

		function highlight(i: number) {
			select(i);
			const el = entries()[i];
			if (el) {
				el.focus({ preventScroll: true });
				// "nearest" only scrolls when the entry is outside the
				// viewport; scroll-margin-top (css) keeps it clear of the
				// sticky navbar. behavior follows css scroll-behavior,
				// so it is instant under prefers-reduced-motion.
				el.scrollIntoView({ block: "nearest" });
			}
		}

		function scrollPage(dir: 1 | -1) {
			window.scrollBy({ top: dir * SCROLL_STEP_PX });
		}

		function startFreeScroll() {
			clearSelection();
			freeScroll = true;
		}

		function moveDown() {
			const last = entries().length - 1;
			if (!freeScroll && anyEntryVisible() && sel < last) {
				highlight(sel + 1);
				return;
			}
			// Past the last entry (or the list is
			// off-screen): keep scrolling the page.
			if (!freeScroll) startFreeScroll();
			scrollPage(1);
		}

		function moveUp() {
			if (freeScroll) {
				const target = lastVisibleEntry(entries());
				if (target >= 0 || window.scrollY <= 0) {
					// The list scrolled back into view (or the page
					// hit the top): catch the bottom-most visible
					// entry and re-engage the selection.
					highlight(target >= 0 ? target : 0);
				} else {
					scrollPage(-1);
				}
				return;
			}
			if (anyEntryVisible()) {
				if (sel > 0) {
					highlight(sel - 1);
					return;
				}
				if (sel < 0) {
					highlight(0);
					return;
				}
				// First entry with room above it: scroll up.
				if (window.scrollY > 0) {
					scrollPage(-1);
				}
				return;
			}
			// Entries off-screen: scroll back up towards them.
			startFreeScroll();
			scrollPage(-1);
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

			switch (e.key) {
				case "ArrowDown":
				case "j":
					e.preventDefault();
					moveDown();
					return;
				case "ArrowUp":
				case "k":
					e.preventDefault();
					moveUp();
					return;
				case "l":
				case "Enter": {
					// Only boot when a boot entry (or nothing at all)
					// has focus; with focus on another control (e.g.
					// after Tab), let the browser activate it natively.
					const t = e.target instanceof HTMLElement ? e.target : null;
					const onEntry = t?.closest("[data-boot-entry]") != null;
					const neutral =
						t === null || t === document.body || t === document.documentElement;
					if (!onEntry && !neutral) return;
					if (sel >= 0 && sel < hrefs.length) {
						e.preventDefault();
						router.push(hrefs[sel]);
						return;
					}
					// Nothing selected yet: boot the
					// first entry while it is on screen.
					if (anyEntryVisible()) {
						e.preventDefault();
						router.push(hrefs[0]);
					}
					return;
				}
			}
		}

		function onEscape() {
			clearSelection();
		}

		function onFocusIn(e: FocusEvent) {
			const t = e.target instanceof HTMLElement ? e.target : null;
			// Page background and modals (shortcuts help) merely
			// borrow focus; keep the current selection.
			if (
				!t ||
				t === document.body ||
				t === document.documentElement ||
				t.closest('[aria-modal="true"]')
			) {
				return;
			}
			const idx = entries().findIndex((el) => el === t || el.contains(t));
			if (idx >= 0) {
				// Tabbing into an entry adopts it as the
				// selection so enter/l boots the focused post.
				if (idx !== sel) select(idx);
			} else {
				// Focus moved to a non-entry control (navbar,
				// footer, inline link): drop the selection so
				// enter follows the focused element instead of
				// booting a stale post.
				clearSelection();
			}
		}

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("focusin", onFocusIn);
		document.addEventListener("vimnav:escape", onEscape);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("focusin", onFocusIn);
			document.removeEventListener("vimnav:escape", onEscape);
		};
	}, [hrefs, router]);

	return null;
}
