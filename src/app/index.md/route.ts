import { markdownResponse, renderHomeMarkdown } from "@/lib/markdown-pages";

/** Markdown version of the home page: `/index.md`. */
export async function GET() {
	return markdownResponse(renderHomeMarkdown());
}
