import {
	markdownNotFoundResponse,
	markdownResponse,
	renderPostMarkdown,
} from "@/lib/markdown-pages";
import { getPostById, getSortedPostsData, type PostData } from "@/lib/posts";

export async function generateStaticParams(): Promise<{ id: string }[]> {
	const posts: PostData[] = getSortedPostsData();
	return posts.map((post) => ({ id: post.id }));
}

/**
 * Markdown version of a blog post.
 *
 * Served at `/blog/<id>/md`. The public `/blog/<id>.md` URL (and the
 * `Accept: text/markdown` negotiation on `/blog/<id>`) is mapped here by
 * the proxy, since dynamic route segments with a literal suffix (an
 * `[id].md` folder) are not supported by Next's production router.
 */
export async function GET(
	_request: Request,
	context: RouteContext<"/blog/[id]/md">,
) {
	const { id } = await context.params;
	const post = getPostById(id);
	if (!post) {
		return markdownNotFoundResponse("requested post not found");
	}
	return markdownResponse(renderPostMarkdown(post));
}
