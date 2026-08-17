"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Route changes must land exactly at the top: the global
 * `scroll-behavior: smooth` (globals.css) animates the router's
 * scrollTo(0, 0), and the page swap interrupts the animation
 * mid-flight, leaving the viewport short of the top. `behavior:
 * "instant"` jumps regardless of the CSS rule and cancels any
 * in-flight smooth scroll, so in-page anchors (and KeyboardNav)
 * stay smooth. Back/forward navigations and the initial mount
 * (refresh) are skipped so saved offsets are preserved.
 */
export default function ScrollReset() {
	const pathname = usePathname();
	const popPathname = useRef<string | null>(null);
	const mounted = useRef(false);

	useEffect(() => {
		const onPop = () => {
			popPathname.current = window.location.pathname;
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	useEffect(() => {
		// First run is a hard load/refresh: keep the browser's own
		// scroll restoration instead of jumping to the top.
		if (!mounted.current) {
			mounted.current = true;
			return;
		}

		// Back/forward: let Next restore the saved scroll offset.
		// Only skip when the pathname actually changed via popstate,
		// so a stale flag never suppresses a later push-navigation
		// reset.
		if (popPathname.current === pathname) {
			popPathname.current = null;
			return;
		}
		popPathname.current = null;

		window.scrollTo({ top: 0, behavior: "instant" });
	}, [pathname]);

	return null;
}
