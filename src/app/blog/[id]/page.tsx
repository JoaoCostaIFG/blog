import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import GiscusComments from "@/components/GiscusComments";
import StickyHeadingBackground from "@/components/StickyHeadingBackground";
import BlogMarkdown from "@/lib/blog/BlogMarkdown";
import { getPostById, getSortedPostsData } from "@/lib/posts";
import { readingTime } from "@/lib/word-utils";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;

	const b = getPostById(id);
	if (!b) {
		notFound();
	}

	// return an object
	return {
		title: `${b.title} | Joao Costa`,
		description: b.intro,
		alternates: {
			canonical: `/blog/${id}`,
		},
		openGraph: {
			title: b.title,
			description: b.intro,
			images: [`/og/post-${id}.jpg`],
			type: "article",
			publishedTime: b.date.toISOString(),
		},
		twitter: {
			card: "summary_large_image",
			images: [`/og/post-${id}.jpg`],
		},
	};
}

export async function generateStaticParams() {
	const posts = getSortedPostsData();

	return posts.map((post) => ({
		id: post.id,
	}));
}

export default async function Blog({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const b = getPostById(id);
	if (!b) {
		notFound();
	}

	function getReadingTime() {
		return b ? readingTime(b.intro + b.content) : 0;
	}

	return (
		<article className="blog prose prose-invert m-auto w-full font-sans">
			<p className="not-prose mb-3 font-mono text-xs text-term-mute">
				<span className="text-term-green">~/posts $</span> cat {b.id}.md ·{" "}
				{b.date.toISOString().slice(0, 10)} · {getReadingTime()} min read
			</p>

			<h1 className="mb-0">{b.title}</h1>

			<div className="not-prose my-6 rounded-md border border-term-border bg-term-code p-4 font-mono text-sm text-term-dim">
				<Markdown>{b.intro}</Markdown>
			</div>

			<BlogMarkdown markdown={b.content} />

			<StickyHeadingBackground />

			<GiscusComments />
		</article>
	);
}
