import {
	markdownResponse,
	renderBlogIndexMarkdown,
} from "@/lib/markdown-pages";

/** Markdown version of the blog index: `/blog/index.md`. */
export async function GET() {
	return markdownResponse(renderBlogIndexMarkdown());
}
