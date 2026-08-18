"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// defer the @giscus/react wrapper chunk until the comments
// section nears the viewport; the iframe itself is lazy too
const Giscus = dynamic(() => import("@giscus/react"), {
	ssr: false,
});

/** start loading this far before the comments scroll into view */
const LOAD_ROOT_MARGIN = "600px";

export default function GiscusComments() {
	const ref = useRef<HTMLDivElement>(null);
	const [nearView, setNearView] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el || nearView) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setNearView(true);
			},
			{ rootMargin: LOAD_ROOT_MARGIN },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [nearView]);

	return (
		<>
			{/* hoisted to <head>; cheap DNS warm-up for the lazy
			    comments iframe (full preconnect would idle out) */}
			<link rel="dns-prefetch" href="https://giscus.app" />
			<div ref={ref}>
				{nearView && (
					<Giscus
						id="comments"
						repo="JoaoCostaIFG/website"
						repoId="MDEwOlJlcG9zaXRvcnkyNjA5NzQyMjM="
						category="Announcements"
						categoryId="DIC_kwDOD44mj84Cxdzp"
						mapping="title"
						term="Welcome to @giscus/react component!"
						reactionsEnabled="1"
						emitMetadata="0"
						inputPosition="top"
						theme="transparent_dark"
						lang="en"
						loading="lazy"
					/>
				)}
			</div>
		</>
	);
}
