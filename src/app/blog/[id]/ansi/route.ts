import {
	ansiNotFoundResponse,
	ansiResponse,
	renderPostAnsi,
} from "@/lib/ansi-pages";
import { getPostById, getSortedPostsData, type PostData } from "@/lib/posts";

export async function generateStaticParams(): Promise<{ id: string }[]> {
	const posts: PostData[] = getSortedPostsData();
	return posts.map((post) => ({ id: post.id }));
}

/**
 * ANSI version of a blog post.
 *
 * Served at `/blog/<id>/ansi`. The public `/blog/<id>.ansi` URL (and the
 * `Accept: text/x-ansi` negotiation on `/blog/<id>`) is mapped here by
 * the proxy, since dynamic route segments with a literal suffix are not
 * supported by Next's production router.
 */
export async function GET(
	_request: Request,
	context: RouteContext<"/blog/[id]/ansi">,
) {
	const { id } = await context.params;
	const post = getPostById(id);
	if (!post) {
		return ansiNotFoundResponse("requested post not found");
	}
	return ansiResponse(renderPostAnsi(post));
}
