"use server";
import path from "node:path";
import Image from "next/image";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as SyntaxTheme } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm"; // support for GitHub Flavored Markdown
import sharp from "sharp";

interface CustomCodeProps {
	node?: { data?: { meta?: string } };
	inline?: boolean;
	className?: string;
	children: string | string[];
	[key: string]: unknown; // Allow other props
}

function rangeParser(ranges: string): number[] {
	const result: number[] = [];
	ranges.split(",").forEach((range) => {
		if (range.includes("-")) {
			const [start, end] = range.split("-").map(Number);
			for (let i = start; i <= end; i++) {
				result.push(i);
			}
		} else {
			const num = Number(range);
			if (!Number.isNaN(num)) {
				result.push(num);
			}
		}
	});
	return result;
}

// map langs that have no builtin renderer
function mapLang(hasLang: string[] | null): string {
	let language = hasLang ? hasLang[1].toLowerCase() : "text";
	// map langs that have no builtin renderer
	if (language === "sh" || language === "shell" || language === "fish") {
		language = "bash";
	}
	return language;
}

export default async function BlogMarkdown({ markdown }: { markdown: string }) {
	const MarkdownComponents: object = {
		code({ node, inline, className, children }: CustomCodeProps) {
			const hasLang = /language-(\w+)/.exec(className || "");
			const metaString = node?.data?.meta as string | undefined; // e.g., "```c hightlight={1,3-5}"
			const language = mapLang(hasLang);

			let highlightLines: number[] = [];
			// Only wrap lines if metaString (for highlighting) is present
			let wrapLines = false;
			if (metaString) {
				wrapLines = true;
				// Try to find highlight={...} first, then fallback to {...} for backward compatibility
				const highlightMatch =
					metaString.match(/highlight=\{([\d\s,-]+)\}/) ||
					metaString.match(/\{([\d\s,-]+)\}/);
				if (highlightMatch) {
					highlightLines = rangeParser(highlightMatch[1].replace(/\s/g, ""));
				}
			}

			const applyHighlights = (lineNumber: number) => {
				if (highlightLines.includes(lineNumber)) {
					return { style: { backgroundColor: "rgba(255, 255, 255, 0.1)" } };
				}
				return {};
			};

			// Convert children to string and remove a potential trailing newline
			const codeString = String(children).replace(/\n$/, "");

			if (inline) {
				// Handle inline code (e.g., `code`)
				return <code className={className}>{children}</code>;
			}

			return hasLang ? (
				<SyntaxHighlighter
					style={SyntaxTheme}
					language={language}
					PreTag="div"
					useInlineStyles={true}
					className={className}
					showLineNumbers={true}
					wrapLines={wrapLines}
					wrapLongLines={true}
					lineProps={applyHighlights}
				>
					{codeString}
				</SyntaxHighlighter>
			) : (
				<code className={className}>{codeString}</code>
			);
		},
		async img({
			src,
			alt,
		}: {
			src?: string;
			alt?: string;
			[key: string]: unknown;
		}) {
			if (!src) return null;

			// Convert relative paths to absolute paths
			// Markdown uses ../_resources/image.png, but we need /_resources/image.png
			const normalizedSrc = src.startsWith("../")
				? src.replace("../", "/")
				: src;

			// Get actual dimensions from the file for proper aspect ratio
			// This runs at build time during static generation (zero runtime cost)
			const imagePath = path.join(process.cwd(), "public", normalizedSrc);

			// Read dimensions - fail loudly if image can't be read
			const metadata = await sharp(imagePath).metadata();

			if (!metadata.width || !metadata.height) {
				throw new Error(
					`Failed to read dimensions for image: ${normalizedSrc}`,
				);
			}

			const width = metadata.width;
			const height = metadata.height;

			// Use Next.js Image component for automatic optimization
			// Next.js will serve optimized versions (WebP/AVIF) based on browser support
			// Proper width/height prevents layout shift (CLS) and enables aspect ratio preservation
			// Using mx-auto for centering (margin left/right auto)
			// eslint-disable-next-line jsx-a11y/alt-text
			return (
				<Image
					src={normalizedSrc}
					alt={alt || ""}
					width={width}
					height={height}
					sizes="(min-width: 768px) 65ch, 100vw"
					className="rounded-lg mx-auto block my-4"
				/>
			);
		},
	};

	return (
		<Markdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
			components={MarkdownComponents}
		>
			{markdown}
		</Markdown>
	);
}
