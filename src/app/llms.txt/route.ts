import { markdownResponse, renderLlmsTxt } from "@/lib/markdown-pages";

/** LLM-friendly site index: `/llms.txt` (https://llmstxt.org/). */
export async function GET() {
	return markdownResponse(renderLlmsTxt());
}
