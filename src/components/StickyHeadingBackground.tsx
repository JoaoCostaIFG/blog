"use client";
import { useEffect } from "react";

const HEADING_SELECTOR = ".blog h2, .blog h3, .blog h4, .blog h5, .blog h6";

/**
 * Tracks sticky blog headings pinned at the top of the viewport:
 * - toggles `heading-stuck` so CSS can give them a background while
 *   scrolled content would otherwise show through them
 * - toggles `heading-covered` on stuck headings the moment a later heading
 *   (still scrolling in normal flow, or already stuck) touches them, so
 *   taller multi-line headings don't peek out from underneath
 */
export default function StickyHeadingBackground() {
	useEffect(() => {
		const blog = document.querySelector<HTMLElement>(".blog");
		if (!blog) return;

		// headings are in document order: later ones paint on top
		const headings = Array.from(
			blog.querySelectorAll<HTMLElement>(HEADING_SELECTOR),
		);
		const stuck = new Set<HTMLElement>();

		const updateCovered = () => {
			const rects = headings.map((h) => h.getBoundingClientRect());
			for (let i = 0; i < headings.length; i++) {
				let covered = false;
				if (stuck.has(headings[i])) {
					for (let j = i + 1; j < headings.length; j++) {
						if (rects[j].top <= rects[i].bottom) {
							covered = true;
							break;
						}
					}
				}
				headings[i].classList.toggle("heading-covered", covered);
			}
		};

		const cleanups: (() => void)[] = [];

		for (const heading of headings) {
			// each heading is sticky at `top-12`; a zero-height sentinel placed
			// right before it detects when the heading gets pinned
			const stickyTop = parseFloat(getComputedStyle(heading).top);
			if (Number.isNaN(stickyTop) || stickyTop <= 0) continue;

			const sentinel = document.createElement("div");
			heading.parentElement?.insertBefore(sentinel, heading);

			const observer = new IntersectionObserver(
				([entry]) => {
					const isStuck =
						!entry.isIntersecting &&
						entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
					if (isStuck) {
						stuck.add(heading);
					} else {
						stuck.delete(heading);
					}
					heading.classList.toggle("heading-stuck", isStuck);
					updateCovered();
				},
				{ rootMargin: `-${stickyTop}px 0px 0px 0px` },
			);

			observer.observe(sentinel);
			cleanups.push(() => {
				observer.disconnect();
				sentinel.remove();
				stuck.delete(heading);
			});
		}

		// the next heading touches the stuck one while still in normal flow,
		// so coverage must also be tracked while scrolling
		let raf = 0;
		const onScroll = () => {
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				updateCovered();
			});
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		cleanups.push(() => {
			cancelAnimationFrame(raf);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		});

		cleanups.push(() => {
			for (const heading of headings) {
				heading.classList.remove("heading-stuck", "heading-covered");
			}
		});

		updateCovered();

		return () => {
			for (const cleanup of cleanups) cleanup();
		};
	}, []);

	return null;
}
