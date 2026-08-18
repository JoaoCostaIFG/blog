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
			// read all geometry before the first class write so the
			// loop never interleaves reads with style invalidation
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

		// geometry reads run in rAF, where the browser lays out for the
		// upcoming paint anyway, instead of forcing a synchronous reflow
		let raf = 0;
		const scheduleUpdate = () => {
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				updateCovered();
			});
		};

		const cleanups: (() => void)[] = [];

		// read phase: resolve sticky offsets before any DOM write so
		// style recalcs aren't forced between sentinel insertions.
		// NaN means the heading isn't sticky (computed "top" is auto);
		// 0 is valid now that headings pin to the viewport top
		const stickyHeadings = headings
			.map((heading) => ({
				heading,
				stickyTop: parseFloat(getComputedStyle(heading).top),
			}))
			.filter(({ stickyTop }) => !Number.isNaN(stickyTop) && stickyTop >= 0);

		// write phase: sentinel insertions only, no reads after
		for (const { heading, stickyTop } of stickyHeadings) {
			// each heading is sticky at the viewport top; a zero-height
			// sentinel placed right before it detects when it gets pinned
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
					// `heading-stuck` only paints a background (no layout),
					// so it can toggle now; the geometry-dependent coverage
					// check waits for the coalesced rAF read
					heading.classList.toggle("heading-stuck", isStuck);
					scheduleUpdate();
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
		window.addEventListener("scroll", scheduleUpdate, { passive: true });
		window.addEventListener("resize", scheduleUpdate);
		cleanups.push(() => {
			cancelAnimationFrame(raf);
			window.removeEventListener("scroll", scheduleUpdate);
			window.removeEventListener("resize", scheduleUpdate);
		});

		cleanups.push(() => {
			for (const heading of headings) {
				heading.classList.remove("heading-stuck", "heading-covered");
			}
		});

		scheduleUpdate();

		return () => {
			for (const cleanup of cleanups) cleanup();
		};
	}, []);

	return null;
}
