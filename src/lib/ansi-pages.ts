import { renderAboutMarkdown, SITE_URL } from "@/lib/markdown-pages";
import { getSortedPostsData, type PostData } from "@/lib/posts";
import { readingTime } from "@/lib/word-utils";

export const ANSI_CONTENT_TYPE = "text/x-ansi; charset=utf-8";

/** Wrapped width for 80-column terminals. */
const WIDTH = 80;

const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const fg = (n: number) => `${ESC}38;5;${n}m`;

// 256-color approximations of the site palette (globals.css), so
// `curl` output matches the look of the HTML version.
const INK = fg(255); // #e2e8f0
const DIM_C = fg(245); // #94a3b8
const MUTE = fg(244); // #7c8fa4
const GREEN = fg(40); // #22c55e
const CYAN = fg(38); // #06b6d4
const PURPLE = fg(135); // #a855f7
const ORANGE = fg(208); // #f97316
const YELLOW = fg(178); // #eab308
const RED = fg(203); // #ef4444

/** Accent colors cycled through boot entries, like BOOT_ACCENTS. */
const ACCENTS = [GREEN, CYAN, PURPLE, ORANGE];

const HEADING_COLORS = [GREEN, CYAN, PURPLE, ORANGE, YELLOW, MUTE];

/** Visible length of a string, ignoring ANSI escape sequences. */
function visibleLen(s: string): number {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: matches ANSI SGR escape sequences on purpose
	return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/**
 * Word-wrap styled text. Words longer than the width (e.g. URLs) are
 * left to overflow rather than broken.
 */
function wrapStyled(
	text: string,
	width = WIDTH,
	firstPrefix = "",
	contPrefix = "",
): string[] {
	const words = text.split(" ").filter(Boolean);
	const lines: string[] = [];
	let prefix = firstPrefix;
	let cur = prefix;
	for (const word of words) {
		if (cur === prefix) {
			cur = prefix + word;
		} else if (visibleLen(cur) + 1 + visibleLen(word) > width) {
			lines.push(cur);
			prefix = contPrefix;
			cur = prefix + word;
		} else {
			cur += ` ${word}`;
		}
	}
	lines.push(cur);
	return lines;
}

function decodeEntities(s: string): string {
	return s
		.replaceAll("&amp;", "&")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#32;", " ");
}

/** Strip inline markdown to plain text (for teasers and summaries). */
function plainText(md: string): string {
	return decodeEntities(md)
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/__([^_]+)__/g, "$1")
		.replace(/~~([^~]+)~~/g, "$1");
}
/** Resolve possibly-relative markdown URLs against a page URL. */
function absUrl(url: string, base?: string): string {
	try {
		return new URL(url, base ?? SITE_URL).toString();
	} catch {
		return url;
	}
}

/** Render inline markdown (code, links, images, emphasis) to ANSI. */
function renderInline(md: string, base?: string): string {
	let text = decodeEntities(md);

	// Code spans first, protected from the emphasis rules.
	const codes: string[] = [];
	text = text.replace(/`([^`]+)`/g, (_m, code: string) => {
		codes.push(`${CYAN}${code}${RESET}`);
		return `\u0000${codes.length - 1}\u0000`;
	});

	text = text.replace(
		/!\[([^\]]*)\]\(([^)]+)\)/g,
		(_m, alt: string, url: string) =>
			`${GREEN}→${RESET} ${DIM_C}[image]${RESET} ${alt} ${MUTE}${absUrl(url, base)}${RESET}`,
	);
	text = text.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		(_m, label: string, url: string) => {
			const abs = absUrl(url, base);
			if (label === url || label === abs) {
				return `${GREEN}${abs}${RESET}`;
			}
			return `${GREEN}${label}${RESET} ${MUTE}(${abs})${RESET}`;
		},
	);

	text = text.replace(
		/\*\*([^*]+)\*\*/g,
		(_m, s: string) => `${BOLD}${s}${RESET}`,
	);
	text = text.replace(/__([^_]+)__/g, (_m, s: string) => `${BOLD}${s}${RESET}`);
	text = text.replace(/~~([^~]+)~~/g, (_m, s: string) => `${DIM}${s}${RESET}`);
	// Italic with boundaries, so intra-word underscores stay literal.
	text = text.replace(
		/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?;:]|$)/g,
		(_m, pre: string, s: string) => `${pre}${ITALIC}${s}${RESET}`,
	);
	text = text.replace(
		/(^|[\s(])_([^_\s][^_]*?)_(?=[\s).,!?;:]|$)/g,
		(_m, pre: string, s: string) => `${pre}${ITALIC}${s}${RESET}`,
	);

	return text.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: NUL placeholders protect code spans from the emphasis rules
		/\u0000(\d+)\u0000/g,
		(_m, i: string) => codes[Number(i)],
	);
}

function headingAnsi(level: number, text: string): string {
	const marks = "#".repeat(level);
	const color = HEADING_COLORS[level - 1] ?? MUTE;
	return `${color}${marks}${RESET} ${BOLD}${text}${RESET}`;
}

/** Regex matching lines that start a new block (used to end paragraphs). */
const SPECIAL_START =
	/^(#{1,6}\s|>|[-*]\s|\d+\.\s|```|\s*\||\s*(-{3,}|\*{3,}|_{3,})\s*$)/;

/**
 * Render a block of markdown to ANSI. Covers the constructs used by the
 * posts: headings, paragraphs, fenced code, lists (with continuation
 * lines), blockquotes, horizontal rules, GFM tables, and inline styles.
 */
export function markdownToAnsi(md: string, base?: string): string {
	const lines = md.split("\n");
	const out: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (/^\s*$/.test(line)) {
			out.push("");
			i++;
			continue;
		}

		// Fenced code block: dim gutter, content untouched.
		const fence = /^```(\w*)/.exec(line.trim());
		if (fence) {
			const label = ` ${fence[1] || "text"} `;
			const dashes = Math.max(2, WIDTH - 2 - visibleLen(label));
			out.push(`${MUTE}┄${"─".repeat(dashes)}${label}${RESET}`);
			i++;
			while (i < lines.length && !lines[i].trim().startsWith("```")) {
				out.push(`${DIM_C}│${RESET} ${lines[i]}`);
				i++;
			}
			i++; // closing fence
			out.push(`${MUTE}┄${"─".repeat(WIDTH - 2)}${RESET}`);
			out.push("");
			continue;
		}

		const heading = /^(#{1,6})\s+(.*)$/.exec(line);
		if (heading) {
			out.push(headingAnsi(heading[1].length, renderInline(heading[2], base)));
			out.push("");
			i++;
			continue;
		}

		if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
			out.push(`${MUTE}${"─".repeat(WIDTH)}${RESET}`);
			out.push("");
			i++;
			continue;
		}

		if (/^>\s?/.test(line)) {
			const buf: string[] = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) {
				buf.push(lines[i].replace(/^>\s?/, ""));
				i++;
			}
			const text = renderInline(buf.join(" "), base);
			for (const l of wrapStyled(text, WIDTH, `${PURPLE}┃${RESET} `, "  ")) {
				out.push(l);
			}
			continue;
		}

		const ul = /^[-*]\s+(.*)$/.exec(line);
		const ol = /^(\d+)\.\s+(.*)$/.exec(line);
		if (ul || ol) {
			const marker = ul ? `${GREEN}→${RESET} ` : `${MUTE}${ol?.[1]}.${RESET} `;
			const buf: string[] = [ul ? ul[1] : (ol?.[2] ?? "")];
			i++;
			while (
				i < lines.length &&
				/^\s{2,}\S/.test(lines[i]) &&
				!SPECIAL_START.test(lines[i].trim())
			) {
				buf.push(lines[i].trim());
				i++;
			}
			const text = renderInline(buf.join(" "), base);
			out.push(...wrapStyled(text, WIDTH, marker, "  "));
			continue;
		}

		// GFM table rows: drop separators, dim the rest.
		if (/^\s*\|/.test(line)) {
			const isSeparator = /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(line);
			if (!isSeparator) {
				out.push(`${DIM_C}${line.trim()}${RESET}`);
			}
			i++;
			continue;
		}

		// Paragraph: join soft wraps, then hard-wrap.
		const buf: string[] = [line.trim()];
		i++;
		while (
			i < lines.length &&
			!/^\s*$/.test(lines[i]) &&
			!SPECIAL_START.test(lines[i])
		) {
			buf.push(lines[i].trim());
			i++;
		}
		out.push(...wrapStyled(renderInline(buf.join(" "), base), WIDTH));
		out.push("");
	}

	return out
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trimEnd();
}

/** Terminal window frame, mirroring the site's TerminalWindow component. */
function frame(title: string, body: string, onlineUrl: string): string {
	const titleLen = visibleLen(title);
	const bar = "─".repeat(Math.max(3, WIDTH - titleLen - 22));
	const head = `${MUTE}┌─${RESET} ${GREEN}root@joaocosta:~#${RESET} ${DIM_C}${title}${RESET} ${MUTE}${bar}${RESET}`;
	const foot = `${MUTE}└─${RESET} ${GREEN}→${RESET} view online: ${GREEN}${onlineUrl}${RESET}`;
	return [head, "", body, "", foot, ""].join("\n");
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Boot-entry style list item, like the BootEntry component. */
function bootEntry(post: PostData, idx: number): string[] {
	const accent = ACCENTS[(idx - 1) % ACCENTS.length];
	const lines: string[] = [
		`${MUTE}[${idx}]${RESET} ${accent}post · ${formatDate(post.date)}${RESET}`,
		`    ${BOLD}${INK}${post.title}${RESET}`,
	];
	const intro = plainText(post.intro);
	lines.push(...wrapStyled(`${DIM_C}${intro}${RESET}`, WIDTH, "    ", "    "));
	return lines;
}

/** ANSI version of a blog post. */
export function renderPostAnsi(post: PostData): string {
	const minutes = readingTime(post.intro + post.content);
	const base = `${SITE_URL}/blog/${post.id}`;
	const meta = `${DIM_C}published ${formatDate(post.date)} · ${minutes} min read · ${base}${RESET}`;
	const body = [
		headingAnsi(1, post.title),
		meta,
		"",
		markdownToAnsi(`${post.intro}\n\n${post.content}`, base),
	].join("\n");
	return frame(`cat posts/${post.id}.md`, body, base);
}

/** ANSI version of the home page. */
export function renderHomeAnsi(): string {
	const posts = getSortedPostsData().slice(0, 3);
	const lines: string[] = [
		`${BOLD}${GREEN}J${RESET}${BOLD}${INK}oão Costa${RESET}`,
		`${DIM_C}$${RESET} whoami ${DIM_C}→${RESET} ${CYAN}@JoaoCostaIFG${RESET} ${MUTE}(github.com/JoaoCostaIFG)${RESET}`,
		...wrapStyled(
			`${DIM_C}Software engineer working professionally in embedded systems and Linux. My little corner of the internet — pick a post and boot in.${RESET}`,
			WIDTH,
		),
		"",
		`${GREEN}BOOT ENTRIES · RECENT POSTS${RESET}`,
		"",
	];
	for (const [idx, post] of posts.entries()) {
		lines.push(...bootEntry(post, idx + 1));
		lines.push("");
	}
	lines.push(
		`${GREEN}→${RESET} all posts: ${GREEN}${SITE_URL}/blog${RESET}`,
		"",
		`${GREEN}ELSEWHERE${RESET}`,
		`${GREEN}→${RESET} about: ${GREEN}${SITE_URL}/about${RESET}`,
		`${GREEN}→${RESET} wiki: ${GREEN}https://wiki.joaocosta.dev${RESET} ${MUTE}(cookbooks, cheat-sheets, guides)${RESET}`,
	);
	return frame("cat blog.md", lines.join("\n"), SITE_URL);
}

/** ANSI version of the blog index. */
export function renderBlogIndexAnsi(): string {
	const posts = getSortedPostsData();
	const lines: string[] = [`${GREEN}BOOT ENTRIES · ALL POSTS${RESET}`, ""];
	for (const [idx, post] of posts.entries()) {
		lines.push(...bootEntry(post, idx + 1));
		lines.push("");
	}
	return frame(
		`ls posts/ - ${posts.length} entries`,
		lines.join("\n").trimEnd(),
		`${SITE_URL}/blog`,
	);
}

/** ANSI version of the about page. */
export function renderAboutAnsi(): string {
	return frame(
		"cat about.md",
		markdownToAnsi(renderAboutMarkdown()),
		`${SITE_URL}/about`,
	);
}

/** ANSI version of the not-found page. */
export function renderNotFoundAnsi(message: string): string {
	const lines = [
		`${RED}[ 404.404404 ] panic:${RESET} ${RED}${message}${RESET}`,
		"",
		`${BOLD}404 - kernel panic D:${RESET}`,
		"",
		`no post exists at this id — see ${GREEN}→${RESET} ${GREEN}${SITE_URL}/blog/index.md${RESET}`,
	];
	return frame("GET /404", lines.join("\n"), SITE_URL);
}

/** Build a `Response` for an ANSI document. */
export function ansiResponse(body: string, init?: ResponseInit): Response {
	return new Response(body, {
		...init,
		headers: {
			"Content-Type": ANSI_CONTENT_TYPE,
			...init?.headers,
		},
	});
}

/** Themed ANSI 404, mirroring markdownNotFoundResponse. */
export function ansiNotFoundResponse(message: string): Response {
	return ansiResponse(renderNotFoundAnsi(message), { status: 404 });
}
