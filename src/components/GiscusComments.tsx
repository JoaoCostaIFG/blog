"use client";

import Giscus from "@giscus/react";

export default function GiscusComments() {
	return (
		<>
			{/* DNS warm-up for the lazy comments iframe (full preconnect would idle out) */}
			<link rel="dns-prefetch" href="https://giscus.app" />
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
		</>
	);
}
