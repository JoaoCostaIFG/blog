import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * llms.txt v2 support (https://llmstxt.org/), implemented with the
 * Next.js `proxy` file convention (the successor to `middleware`).
 *
 * - Content negotiation: requests whose `Accept` header includes
 *   `text/markdown` are rewritten to the markdown version of the page,
 *   so `curl -H "Accept: text/markdown" joaocosta.dev/blog/1` returns
 *   markdown. Clients that don't ask for it (browsers, plain `curl`)
 *   keep getting the canonical HTML.
 * - Discovery: HTML responses carry a `Link` header pointing to the
 *   markdown alternate (`rel="alternate" type="text/markdown"`) and to
 *   the site's llms.txt index (`rel="describedby"`). The `<link>` tags
 *   in the page metadata provide the same hints in the HTML itself.
 *
 * Static pages are served by literal route folders (e.g.
 * `src/app/about.md/route.ts`). Blog posts are served by the
 * `/blog/<id>/md` route handler, because dynamic segments with a
 * literal suffix (an `[id].md` folder) are not supported by Next's
 * production router — the public `/blog/<id>.md` URL is mapped there by
 * the rewrite below.
 */

/**
 * Public markdown URL for a page: what agents see (and what goes into
 * `Link` headers and metadata alternates).
 */
function alternateMarkdownUrl(pathname: string): string | null {
	switch (pathname) {
		case "/":
			return "/index.md";
		case "/blog":
			return "/blog/index.md";
		case "/about":
			return "/about.md";
	}
	const post = /^\/blog\/([^/]+)$/.exec(pathname);
	if (post) {
		return `/blog/${post[1]}.md`;
	}
	return null;
}

/** Internal route that actually serves the markdown for a page. */
function internalMarkdownRoute(pathname: string): string | null {
	switch (pathname) {
		case "/":
			return "/index.md";
		case "/blog":
			return "/blog/index.md";
		case "/about":
			return "/about.md";
	}
	const post = /^\/blog\/([^/]+)$/.exec(pathname);
	if (post) {
		return `/blog/${post[1]}/md`;
	}
	return null;
}

/**
 * Direct `/blog/<id>.md` requests: rewrite to the post markdown route.
 * `/blog/index.md` is excluded because it is a real route folder.
 */
function postMdRewrite(pathname: string): string | null {
	const match = /^\/blog\/([^/]+)\.md$/.exec(pathname);
	if (!match || match[1] === "index") {
		return null;
	}
	return `/blog/${match[1]}/md`;
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const mdRewrite = postMdRewrite(pathname);
	if (mdRewrite) {
		return NextResponse.rewrite(new URL(mdRewrite, request.url));
	}

	// Markdown files themselves (and anything else with an extension)
	// get no alternate/llms.txt hints.
	const alternate = pathname.endsWith(".md")
		? null
		: alternateMarkdownUrl(pathname);
	if (!alternate) {
		return NextResponse.next();
	}

	const accept = request.headers.get("accept") ?? "";
	if (accept.includes("text/markdown")) {
		const internal = internalMarkdownRoute(pathname);
		if (internal) {
			return NextResponse.rewrite(new URL(internal, request.url));
		}
	}

	const response = NextResponse.next();
	response.headers.set(
		"Link",
		`<${alternate}>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"`,
	);
	return response;
}

export const config = {
	// Only run on pages that have a markdown version (not on /llms.txt,
	// /rss or static assets).
	matcher: ["/", "/about", "/blog", "/blog/:path*"],
};
