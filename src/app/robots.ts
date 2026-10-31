import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/markdown-pages";

/**
 * `/robots.txt` (Robots Exclusion Protocol, RFC 9309): allow all well-behaved
 * crawlers everywhere and point them at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
