#!/usr/bin/env bun
/**
 * Generate OG images for all blog posts and a default image.
 *
 * Usage:
 *   bun run scripts/generate-og.ts [--force]
 *
 * Options:
 *   --force    Regenerate all images regardless of cache
 */

import fs from "node:fs";
import path from "node:path";
import { getSortedPostsData } from "../src/lib/posts";
import {
  generateBaseImage,
  generateLogoImage,
  formatDateForOg,
  truncateText,
} from "../src/lib/og/generate-image";

const PUBLIC_OG_DIR = path.join(process.cwd(), "public/og");
const POSTS_DIR = path.join(process.cwd(), "posts");
const LOGO_PATH = path.join(process.cwd(), "public/irao.png");
const DEFAULT_COVER_PATH = path.join(process.cwd(), "public/heart.png");

interface GenerationStats {
  generated: number;
  cached: number;
  errors: number;
}

/**
 * Check if the target file needs regeneration based on source modification time
 */
function needsRegeneration(
  targetPath: string,
  sourcePath: string,
  force: boolean,
): boolean {
  if (force) return true;
  if (!fs.existsSync(targetPath)) return true;

  const targetStat = fs.statSync(targetPath);
  const sourceStat = fs.statSync(sourcePath);

  return sourceStat.mtimeMs > targetStat.mtimeMs;
}

/**
 * Generate OG image for a single blog post
 */
async function generatePostOgImage(
  postId: string,
  title: string,
  intro: string,
  date: Date,
  force: boolean,
): Promise<"generated" | "cached" | "error"> {
  const outputPath = path.join(PUBLIC_OG_DIR, `post-${postId}.jpg`);
  const sourcePath = path.join(POSTS_DIR, `${postId}.md`);

  if (!needsRegeneration(outputPath, sourcePath, force)) {
    return "cached";
  }

  try {
    await generateBaseImage(
      {
        title,
        subtitle: truncateText(intro, 150),
        eyebrow: formatDateForOg(date),
        backgroundImagePath: DEFAULT_COVER_PATH,
      },
      outputPath,
    );
    return "generated";
  } catch (error) {
    console.error(`  ✗ post-${postId}.jpg: ${(error as Error).message}`);
    return "error";
  }
}

/**
 * Generate the default OG image (logo style)
 */
async function generateDefaultOgImage(
  force: boolean,
): Promise<"generated" | "cached" | "error"> {
  const outputPath = path.join(PUBLIC_OG_DIR, "default.jpg");

  if (!needsRegeneration(outputPath, LOGO_PATH, force)) {
    return "cached";
  }

  try {
    await generateLogoImage(
      {
        title: "Joao Costa",
        subtitle: "The blog of a software engineer",
        logoPath: LOGO_PATH,
      },
      outputPath,
    );
    return "generated";
  } catch (error) {
    console.error(`  ✗ default.jpg: ${(error as Error).message}`);
    return "error";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  console.log("Generating OG images...");
  if (force) {
    console.log("  (force mode: regenerating all images)");
  }

  // Ensure output directory exists
  if (!fs.existsSync(PUBLIC_OG_DIR)) {
    fs.mkdirSync(PUBLIC_OG_DIR, { recursive: true });
  }

  const stats: GenerationStats = {
    generated: 0,
    cached: 0,
    errors: 0,
  };

  // Generate OG images for all posts
  const posts = getSortedPostsData();

  for (const post of posts) {
    const result = await generatePostOgImage(
      post.id,
      post.title,
      post.intro,
      post.date,
      force,
    );

    const symbol =
      result === "generated" ? "✓" : result === "cached" ? "○" : "✗";
    if (result !== "error") {
      console.log(`  ${symbol} post-${post.id}.jpg (${result})`);
    }

    if (result === "generated") stats.generated++;
    else if (result === "cached") stats.cached++;
    else stats.errors++;
  }

  // Generate default OG image
  const defaultResult = await generateDefaultOgImage(force);
  const symbol =
    defaultResult === "generated"
      ? "✓"
      : defaultResult === "cached"
        ? "○"
        : "✗";
  if (defaultResult !== "error") {
    console.log(`  ${symbol} default.jpg (${defaultResult})`);
  }

  if (defaultResult === "generated") stats.generated++;
  else if (defaultResult === "cached") stats.cached++;
  else stats.errors++;

  // Summary
  console.log("");
  console.log(
    `Done! Generated ${stats.generated}, cached ${stats.cached}${stats.errors > 0 ? `, errors ${stats.errors}` : ""}`,
  );

  if (stats.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
