import { ansiResponse, renderAboutAnsi } from "@/lib/ansi-pages";

/** ANSI version of the about page: `/about.ansi`. */
export async function GET() {
	return ansiResponse(renderAboutAnsi());
}
