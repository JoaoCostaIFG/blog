import type { MetadataRoute } from "next";
import { postPageUrl, SITE_URL } from "@/lib/markdown-pages";
import { getSortedPostsData } from "@/lib/posts";

/**
 * `/sitemap.xml`: every crawlable page — home, about, post index and the
 * individual posts. Dates come from post frontmatter, so new posts (and
 * their edits) update the sitemap automatically.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	const posts = getSortedPostsData();
	const newestPostDate = posts[0]?.date ?? new Date();

	return [
		{
			url: SITE_URL,
			lastModified: newestPostDate,
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${SITE_URL}/about`,
			changeFrequency: "monthly",
			priority: 0.5,
		},
		{
			url: `${SITE_URL}/blog`,
			lastModified: newestPostDate,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		...posts.map((post): MetadataRoute.Sitemap[number] => ({
			url: `${SITE_URL}${postPageUrl(post.id)}`,
			lastModified: post.date,
			changeFrequency: "monthly",
			priority: 0.7,
		})),
	];
}
