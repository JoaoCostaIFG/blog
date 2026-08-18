"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ShortcutsOverlay from "@/components/ShortcutsOverlay";

/** Time window in which a second key completes a `g` prefix (e.g. `gg`). */
const G_PREFIX_TIMEOUT_MS = 600;
/** Step used for j/k page scrolling on pages without boot entries. */
const SCROLL_STEP_PX = 80;

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA" ||
		target.isContentEditable
	);
}

function halfPage(): number {
	return Math.max(1, Math.round(window.innerHeight / 2));
}

/**
 * Global vim-inspired keyboard navigation:
 * gg/G scroll top/bottom, gh/gp/ga navigate, h go back (falls back
 * to home when there is no history), d/u half-page scroll, j/k scroll
 * on pages without boot entries (KeyboardNav owns them otherwise),
 * ? toggles the shortcuts overlay.
 */
export default function VimNav() {
	const router = useRouter();
	const pathname = usePathname();
	const [helpOpen, setHelpOpen] = useState(false);
	const gPendingRef = useRef(false);
	const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearGPrefix = useCallback(() => {
		gPendingRef.current = false;
		if (gTimerRef.current) {
			clearTimeout(gTimerRef.current);
			gTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		function armGPrefix() {
			gPendingRef.current = true;
			if (gTimerRef.current) clearTimeout(gTimerRef.current);
			gTimerRef.current = setTimeout(clearGPrefix, G_PREFIX_TIMEOUT_MS);
		}

		function goUp() {
			// From a post page, `h` goes up to the posts listing;
			// anywhere else it goes home.
			if (pathname.startsWith("/blog/")) {
				router.push("/blog");
			} else {
				router.push("/");
			}
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (isTypingTarget(e.target)) return;

			// held keys auto-repeat; smooth-scrolling each repeat keeps
			// restarting the easing curve (and cancelling the previous
			// animation), so repeated events jump instantly instead
			const behavior: ScrollBehavior = e.repeat ? "instant" : "auto";

			if (e.key === "Escape") {
				if (gPendingRef.current) clearGPrefix();
				if (helpOpen) {
					setHelpOpen(false);
					return;
				}
				// Let KeyboardNav clear the boot-entry selection.
				document.dispatchEvent(new CustomEvent("vimnav:escape"));
				return;
			}

			if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
				e.preventDefault();
				clearGPrefix();
				setHelpOpen((open) => !open);
				return;
			}

			if (helpOpen) {
				if (e.key === "q" || e.key === "Enter") {
					e.preventDefault();
					setHelpOpen(false);
				}
				return;
			}

			// `g` prefix handling: a pending `g` completes with a second
			// key; any other key cancels the prefix and is handled itself.
			if (gPendingRef.current) {
				clearGPrefix();
				switch (e.key) {
					case "g": {
						e.preventDefault();
						window.scrollTo({ top: 0, behavior });
						return;
					}
					case "h": {
						e.preventDefault();
						router.push("/");
						return;
					}
					case "p": {
						e.preventDefault();
						router.push("/blog");
						return;
					}
					case "a": {
						e.preventDefault();
						router.push("/about");
						return;
					}
				}
			}

			const hasBootEntries =
				document.querySelector("[data-boot-entry]") !== null;

			switch (e.key) {
				case "g":
					e.preventDefault();
					armGPrefix();
					return;
				case "G":
					e.preventDefault();
					window.scrollTo({
						top: document.documentElement.scrollHeight,
						behavior,
					});
					return;
				case "h":
					e.preventDefault();
					goUp();
					return;
				case "d":
					e.preventDefault();
					window.scrollBy({ top: halfPage(), behavior });
					return;
				case "u":
					e.preventDefault();
					window.scrollBy({ top: -halfPage(), behavior });
					return;
				case "j":
				case "k":
					// KeyboardNav owns entry navigation when entries exist.
					if (hasBootEntries) return;
					e.preventDefault();
					window.scrollBy({
						top: e.key === "j" ? SCROLL_STEP_PX : -SCROLL_STEP_PX,
						behavior,
					});
					return;
			}
		}

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			if (gTimerRef.current) clearTimeout(gTimerRef.current);
		};
	}, [router, pathname, helpOpen, clearGPrefix]);

	return helpOpen && <ShortcutsOverlay onClose={() => setHelpOpen(false)} />;
}
