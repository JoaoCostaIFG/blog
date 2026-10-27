import { markdownResponse, renderAboutMarkdown } from "@/lib/markdown-pages";

/** Markdown version of the about page: `/about.md`. */
export async function GET() {
	return markdownResponse(renderAboutMarkdown());
}
