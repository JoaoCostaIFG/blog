import crypto from "node:crypto";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import RSS from "rss";
import { unified } from "unified";
import { getSortedPostsData, type PostData } from "@/lib/posts";

/**
 * Render a markdown string to an HTML fragment for use in the feed.
 *
 * Mirrors the GitHub Flavored Markdown support used by the blog post view
 * (see {@link "@/lib/blog/BlogMarkdown"}), but produces a plain HTML string
 * rather than React elements. Used for RSS `<description>`, where raw
 * markdown syntax would otherwise show up verbatim in feed readers.
 */
async function renderMarkdownToHtml(md: string): Promise<string> {
	const file = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkHtml)
		.process(md);
	return String(file);
}

interface CachedFeed {
	body: string;
	lastModified: Date;
	etag: string;
}

let cachedFeed: CachedFeed | null = null;

async function generateRssFeed(posts: PostData[]): Promise<RSS> {
	const site_url = "https://joaocosta.dev";
	const feed_url = `${site_url}/rss`;
	const date = new Date();

	const feedOptions = {
		title: "JoaoCostaIFG's Blog",
		description: "Blog posts from joaocosta.dev",
		site_url: site_url,
		feed_url: feed_url,
		image_url: `${site_url}/irao.png`,
		pubDate: date,
		copyright: `All rights reserved ${date.getFullYear()}`,
		managingEditor: "JoaoCostaIFG@joaocosta.dev",
		webMaster: "JoaoCostaIFG@joaocosta.dev",
		language: "en",
		ttl: 60,
	};
	const feed = new RSS(feedOptions);

	for (const post of posts) {
		const description = await renderMarkdownToHtml(post.intro);
		const fullHtml = await renderMarkdownToHtml(
			`${post.intro}\n\n${post.content}`,
		);
		feed.item({
			title: post.title,
			description,
			url: `${site_url}/blog/${post.id}`,
			date: post.date,
			author: "JoaoCostaIFG",
			guid: post.id,
			custom_elements: [{ "content:encoded": { _cdata: fullHtml } }],
		});
	}

	return feed;
}

/**
 * Build (and memoize) the feed body along with its validators.
 *
 * The cache is a module-level variable: in production it persists for the
 * process lifetime, and a fresh deploy spins up a new process (resetting it).
 * In dev (Turbopack) only edits to JS/TS source hot-reload this module, so
 * editing a markdown post does NOT invalidate the cache: restart the dev server
 * after changing posts. This trades a small staleness window for avoiding a
 * filesystem read on every request.
 *
 * ETag is derived from the canonical last-modified timestamp (not the body)
 * so it stays stable across server restarts for unchanged content.
 *
 * Returns null only if generation itself throws; in that case callers should
 * emit an error response WITHOUT validator headers.
 */
async function getFeed(): Promise<CachedFeed | null> {
	if (cachedFeed) return cachedFeed;
	try {
		const posts = getSortedPostsData();
		const feed = await generateRssFeed(posts);
		const body = feed.xml();
		const lastModified =
			posts.length > 0
				? new Date(posts.reduce((max, p) => Math.max(max, p.date.getTime()), 0))
				: new Date();
		// Deterministic across restarts for unchanged content.
		const etag = `"${crypto
			.createHash("sha256")
			.update(String(Math.floor(lastModified.getTime() / 1000)))
			.digest("hex")
			.slice(0, 32)}"`;
		cachedFeed = { body, lastModified, etag };
		return cachedFeed;
	} catch (error) {
		console.error(`[rss] Error generating feed: ${(error as Error).message}`);
		return null;
	}
}

/**
 * Shared handler for GET and HEAD.
 *
 * Lenient 304 (deviation from RFC 7232 precedence, intentional for
 * feed-reader compatibility): returns Not Modified if either If-None-Match
 * matches the current ETag (including "*") OR If-Modified-Since is newer-or-
 * equal to the feed's last-modified date. Malformed If-Modified-Since dates
 * and weak (W/"...") ETags on input are ignored (do not produce a 304).
 * 304 responses carry Last-Modified and ETag but no body; HEAD 200 responses
 * carry no body either.
 */
async function handleFeed(request: Request, head: boolean): Promise<Response> {
	const feed = await getFeed();
	if (!feed) {
		return new Response("Internal Server Error", { status: 500 });
	}

	const { body, lastModified, etag } = feed;
	const lmString = lastModified.toUTCString();
	const ifNoneMatch = request.headers.get("if-none-match");
	const ifModifiedSince = request.headers.get("if-modified-since");

	let noneMatch = false;
	if (ifNoneMatch !== null) {
		const trimmed = ifNoneMatch.trim();
		if (trimmed === "*") {
			noneMatch = true;
		} else {
			const tags = trimmed.split(",").map((t) => t.trim());
			// Strong-to-strong comparison: a weak W/"..." input won't match.
			noneMatch = tags.includes(etag);
		}
	}

	let modifiedSince = false;
	if (ifModifiedSince !== null) {
		const since = new Date(ifModifiedSince);
		if (!Number.isNaN(since.getTime())) {
			// Truncate to whole seconds; "newer-or-equal" → 304.
			const lmSec = Math.floor(lastModified.getTime() / 1000);
			const sinceSec = Math.floor(since.getTime() / 1000);
			modifiedSince = sinceSec >= lmSec;
		}
		// Malformed date → ignore this validator (no 304 from it).
	}

	const hasValidators = ifNoneMatch !== null || ifModifiedSince !== null;
	const notModified = hasValidators && (noneMatch || modifiedSince);

	if (notModified) {
		return new Response(null, {
			status: 304,
			headers: { "Last-Modified": lmString, ETag: etag },
		});
	}

	return new Response(head ? null : body, {
		status: 200,
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Last-Modified": lmString,
			ETag: etag,
		},
	});
}

export async function GET(request: Request) {
	return handleFeed(request, false);
}

export async function HEAD(request: Request) {
	return handleFeed(request, true);
}
