import { ansiResponse, renderBlogIndexAnsi } from "@/lib/ansi-pages";

/** ANSI version of the blog index: `/blog/index.ansi`. */
export async function GET() {
	return ansiResponse(renderBlogIndexAnsi());
}
