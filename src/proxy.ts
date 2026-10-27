import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Agent/terminal content negotiation, implemented with the Next.js
 * `proxy` file convention (the successor to `middleware`).
 *
 * - llms.txt v2 (https://llmstxt.org/): requests whose `Accept` header
 *   includes `text/markdown` are rewritten to the markdown version of
 *   the page. HTML responses carry `Link` headers with the markdown and
 *   ANSI alternates (`rel="alternate"`) and the llms.txt index
 *   (`rel="describedby"`); the `<link>` tags in the page metadata
 *   provide the same hints in the HTML itself.
 * - Fancy curl sites: requests whose `Accept` header includes
 *   `text/x-ansi` get the terminal-styled ANSI version, so
 *   `curl -H "Accept: text/x-ansi" joaocosta.dev/blog/1` renders the
 *   post in the terminal. Clients that don't ask (browsers, plain
 *   `curl`) keep getting the canonical HTML.
 *
 * Static pages are served by literal route folders (e.g.
 * `src/app/about.md/route.ts` and `src/app/about.ansi/route.ts`).
 * Blog posts are served by the `/blog/<id>/md` and `/blog/<id>/ansi`
 * route handlers, because dynamic segments with a literal suffix (an
 * `[id].md` folder) are not supported by Next's production router —
 * the public `/blog/<id>.md` and `/blog/<id>.ansi` URLs are mapped
 * there by the rewrites below.
 */

interface Alternates {
	/** Public URLs, used for Link headers and metadata alternates. */
	readonly md: string;
	readonly ansi: string;
	/** Internal routes that actually serve each representation. */
	readonly mdRoute: string;
	readonly ansiRoute: string;
}

/**
 * Markdown and ANSI versions for each page. `/blog/<id>` variants are
 * built by the post regex below.
 */
function alternatesFor(pathname: string): Alternates | null {
	switch (pathname) {
		case "/":
			return {
				md: "/index.md",
				ansi: "/index.ansi",
				mdRoute: "/index.md",
				ansiRoute: "/index.ansi",
			};
		case "/blog":
			return {
				md: "/blog/index.md",
				ansi: "/blog/index.ansi",
				mdRoute: "/blog/index.md",
				ansiRoute: "/blog/index.ansi",
			};
		case "/about":
			return {
				md: "/about.md",
				ansi: "/about.ansi",
				mdRoute: "/about.md",
				ansiRoute: "/about.ansi",
			};
	}
	const post = /^\/blog\/([^/]+)$/.exec(pathname);
	if (post) {
		return {
			md: `/blog/${post[1]}.md`,
			ansi: `/blog/${post[1]}.ansi`,
			mdRoute: `/blog/${post[1]}/md`,
			ansiRoute: `/blog/${post[1]}/ansi`,
		};
	}
	return null;
}

/**
 * Direct `/blog/<id>.md` and `/blog/<id>.ansi` requests: rewrite to the
 * post route handlers. `/blog/index.*` is excluded because those are
 * real route folders.
 */
function postExtRewrite(pathname: string, ext: "md" | "ansi"): string | null {
	const match = new RegExp(`^/blog/([^/]+)\\.${ext}$`).exec(pathname);
	if (!match || match[1] === "index") {
		return null;
	}
	return `/blog/${match[1]}/${ext}`;
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	for (const ext of ["md", "ansi"] as const) {
		const rewrite = postExtRewrite(pathname, ext);
		if (rewrite) {
			return NextResponse.rewrite(new URL(rewrite, request.url));
		}
	}

	// Files (markdown, ANSI, or anything else with an extension) get no
	// alternate/llms.txt hints.
	const hasExtension = /\.[A-Za-z0-9]+$/.test(pathname);
	const alternates = hasExtension ? null : alternatesFor(pathname);
	if (!alternates) {
		return NextResponse.next();
	}

	const accept = request.headers.get("accept") ?? "";
	if (accept.includes("text/x-ansi")) {
		return NextResponse.rewrite(new URL(alternates.ansiRoute, request.url));
	}
	if (accept.includes("text/markdown")) {
		return NextResponse.rewrite(new URL(alternates.mdRoute, request.url));
	}

	const response = NextResponse.next();
	response.headers.set(
		"Link",
		`<${alternates.md}>; rel="alternate"; type="text/markdown", ` +
			`<${alternates.ansi}>; rel="alternate"; type="text/x-ansi", ` +
			`</llms.txt>; rel="describedby"`,
	);
	return response;
}

export const config = {
	// Only run on pages that have markdown/ANSI versions (not on
	// /llms.txt, /rss or static assets).
	matcher: ["/", "/about", "/blog", "/blog/:path*"],
};
