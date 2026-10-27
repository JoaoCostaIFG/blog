import { getSortedPostsData, type PostData } from "@/lib/posts";
import { readingTime } from "@/lib/word-utils";

export const SITE_URL = "https://joaocosta.dev";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

/**
 * Build a `Response` for a markdown document, as recommended by the
 * llms.txt v2 spec (https://llmstxt.org/).
 */
export function markdownResponse(body: string, init?: ResponseInit): Response {
	return new Response(body, {
		...init,
		headers: {
			"Content-Type": MARKDOWN_CONTENT_TYPE,
			...init?.headers,
		},
	});
}

/**
 * Themed markdown 404, mirroring the site's HTML not-found page. Served
 * with the same content type as the other markdown routes so clients
 * that asked for `text/markdown` get a consistent error, with a link
 * back to the post index.
 */
export function markdownNotFoundResponse(message: string): Response {
	return markdownResponse(
		[
			"# 404 - kernel panic D:",
			"",
			`> ${message}`,
			"",
			`No post exists at this id. See the index: ${SITE_URL}/blog/index.md`,
			"",
		].join("\n"),
		{ status: 404 },
	);
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Escape square brackets so arbitrary titles are safe inside link text. */
function mdLinkText(text: string): string {
	return text.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

/** One-line summary of a paragraph, truncated at a word boundary. */
function summarize(text: string, max = 140): string {
	const flat = text.replaceAll("\n", " ").trim();
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max);
	const lastSpace = cut.lastIndexOf(" ");
	return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

export function postMarkdownUrl(id: string): string {
	return `/blog/${encodeURIComponent(id)}.md`;
}

export function postPageUrl(id: string): string {
	return `/blog/${encodeURIComponent(id)}`;
}

/**
 * Markdown version of a blog post: title, canonical metadata, then the
 * full original markdown content (frontmatter is not included).
 */
export function renderPostMarkdown(post: PostData): string {
	const minutes = readingTime(post.intro + post.content);
	return [
		`# ${post.title}`,
		"",
		`URL: ${SITE_URL}${postPageUrl(post.id)}`,
		`Published: ${formatDate(post.date)} · ${minutes} min read`,
		"",
		post.intro,
		"",
		post.content,
		"",
	].join("\n");
}

/** Markdown version of the home page (`/index.md`). */
export function renderHomeMarkdown(): string {
	const posts = getSortedPostsData().slice(0, 3);
	const lines: string[] = [
		"# Joao Costa",
		"",
		`URL: ${SITE_URL}`,
		"",
		"Software engineer working professionally in embedded systems and Linux.",
		"This is my personal corner of the internet.",
		"",
		"## Recent posts",
		"",
	];

	for (const post of posts) {
		lines.push(
			`- [${mdLinkText(post.title)}](${postMarkdownUrl(post.id)}): ${formatDate(post.date)} — ${summarize(post.intro)}`,
		);
	}

	lines.push(
		"",
		`- [All posts](${SITE_URL}/blog/index.md)`,
		"",
		"## Elsewhere",
		"",
		`- [About me](${SITE_URL}/about.md)`,
		"- [My wiki](https://wiki.joaocosta.dev): cookbooks, cheat-sheets and general guides/annotations",
		"- [GitHub](https://github.com/JoaoCostaIFG)",
		"",
	);

	return lines.join("\n");
}

/** Markdown version of the blog index (`/blog/index.md`). */
export function renderBlogIndexMarkdown(): string {
	const posts = getSortedPostsData();
	const lines: string[] = [
		"# Blog posts",
		"",
		`URL: ${SITE_URL}/blog`,
		"",
		"All posts, newest first:",
		"",
	];

	for (const post of posts) {
		lines.push(
			`- [${mdLinkText(post.title)}](${postMarkdownUrl(post.id)}): ${formatDate(post.date)} — ${summarize(post.intro)}`,
		);
	}

	lines.push("");
	return lines.join("\n");
}

/** Markdown version of the about page (`/about.md`). */
export function renderAboutMarkdown(): string {
	return [
		"# About",
		"",
		`URL: ${SITE_URL}/about`,
		"",
		"I'm a twenty-something year old software engineer. I finished my master's",
		"degree in software engineering at [FEUP](https://fe.up.pt) in 2023.",
		"This website is somewhere where I try to share a bit of my experiences",
		"and thoughts (mostly) relating to informatics. It is hosted on my",
		"personal home-server alongside other self-hosted services I use.",
		"",
		"Professionally, I've been focusing on software development for embedded",
		"and critical systems. I started by working on tests for DO-178C (an",
		"aviation standard) certification of an OS, then moved to tooling,",
		"packaging, CI/CD and server administration. Now I work as a software",
		"developer for Linux and baremetal drivers.",
		"",
		"In my work life, most of the development I've done has been in",
		"Bash/Shell, C, JavaScript and Python. In my personal projects I mostly",
		"use Bash/Shell, TypeScript, Python and C/C++.",
		"",
		"I enjoy contributing to open-source software and always try to release",
		"mine with open licenses (often the MIT license).",
		"",
		"## Contact",
		"",
		"- Email: [blog@joaocosta.dev](mailto:blog@joaocosta.dev)",
		"- [CV](https://github.com/JoaoCostaIFG/cv/blob/master/JoaoCostaCV.pdf)",
		"",
	].join("\n");
}

/**
 * `/llms.txt` (https://llmstxt.org/): a curated, LLM-friendly index of the
 * site. Every link points to a markdown version of a page so agents can
 * skip the HTML layout.
 */
export function renderLlmsTxt(): string {
	const posts = getSortedPostsData();
	const lines: string[] = [
		"# joaocosta.dev",
		"",
		"> Personal website and blog of João Costa (JoaoCostaIFG), a software engineer focused on embedded systems and Linux. Every page is also available as markdown at the same URL with `.md` appended (e.g. `/blog/1.md`), or by sending `Accept: text/markdown` to the page URL. Terminal clients can get an ANSI-styled version with `Accept: text/x-ansi` or a `.ansi` URL.",
		"",
		`Contact: blog@joaocosta.dev · Source: https://github.com/JoaoCostaIFG/blog`,
		"",
		"## Pages",
		"",
		`- [Home](${SITE_URL}/index.md): Introduction and recent posts.`,
		`- [About](${SITE_URL}/about.md): Who I am, what I work on, and how to contact me.`,
		`- [All posts](${SITE_URL}/blog/index.md): Index of all blog posts, newest first.`,
		`- [RSS feed](${SITE_URL}/rss): Full-content RSS feed.`,
		"",
		"## Posts",
		"",
	];

	for (const post of posts) {
		lines.push(
			`- [${mdLinkText(post.title)}](${SITE_URL}${postMarkdownUrl(post.id)}): ${formatDate(post.date)} — ${summarize(post.intro)}`,
		);
	}

	lines.push("");
	return lines.join("\n");
}
