import { ansiResponse, renderHomeAnsi } from "@/lib/ansi-pages";

/** ANSI version of the home page: `/index.ansi`. */
export async function GET() {
	return ansiResponse(renderHomeAnsi());
}
