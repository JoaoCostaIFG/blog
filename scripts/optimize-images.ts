#!/usr/bin/env bun
/**
 * Optimize blog post images in public/_resources directory.
 *
 * NOTE: This script is kept for manual use only. Image optimization now happens
 * during Joplin export (in the joplin_exporter submodule) using the --optimize-images flag.
 *
 * For each static image:
 * - Optimizes PNG images (reduces file size)
 * - Skips animated images (GIFs, APNGs)
 *
 * Next.js will handle additional optimization at runtime.
 *
 * Usage:
 *   bun run scripts/optimize-images.ts [--force]
 *
 * Options:
 *   --force    Re-optimize all images regardless of cache
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RESOURCES_DIR = path.join(process.cwd(), "public/_resources");
const CACHE_FILE = path.join(RESOURCES_DIR, ".optimize-cache.json");

// Supported input formats
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

// Quality settings
const PNG_QUALITY = 90;
const PNG_COMPRESSION = 9;
const JPEG_QUALITY = 85;

interface OptimizationStats {
  optimized: number;
  cached: number;
  skipped: number;
  errors: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
}

interface CacheEntry {
  mtime: number;
  sizeBefore: number;
  sizeAfter: number;
}

interface Cache {
  [filename: string]: CacheEntry;
}

/**
 * Load the optimization cache
 */
function loadCache(): Cache {
  if (!fs.existsSync(CACHE_FILE)) {
    return {};
  }

  try {
    const content = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Failed to load cache: ${(error as Error).message}`);
    return {};
  }
}

/**
 * Save the optimization cache
 */
function saveCache(cache: Cache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    console.warn(`Warning: Failed to save cache: ${(error as Error).message}`);
  }
}

/**
 * Check if an image needs optimization based on modification time
 */
function needsOptimization(
  filePath: string,
  cache: Cache,
  force: boolean,
): boolean {
  if (force) return true;

  const filename = path.basename(filePath);
  const cacheEntry = cache[filename];

  if (!cacheEntry) return true;

  const stats = fs.statSync(filePath);
  return stats.mtimeMs > cacheEntry.mtime;
}

/**
 * Check if an image is animated using Sharp
 */
async function isAnimated(filePath: string): Promise<boolean> {
  try {
    const metadata = await sharp(filePath).metadata();
    // If pages > 1, it's an animated image (GIF, APNG, etc.)
    return (metadata.pages ?? 1) > 1;
  } catch (error) {
    console.warn(
      `  Warning: Failed to check animation for ${path.basename(filePath)}: ${(error as Error).message}`,
    );
    return false;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Optimize a single image
 */
async function optimizeImage(
  filePath: string,
  cache: Cache,
  force: boolean,
): Promise<"optimized" | "cached" | "skipped" | "error"> {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Check if optimization is needed
  if (!needsOptimization(filePath, cache, force)) {
    return "cached";
  }

  try {
    // Check if animated
    const animated = await isAnimated(filePath);
    if (animated) {
      console.log(`  ⊘ ${filename} (animated, skipped)`);
      return "skipped";
    }

    const sizeBefore = getFileSize(filePath);

    // Optimize the image based on format
    const tempPath = filePath + ".tmp";

    if (ext === ".png") {
      await sharp(filePath)
        .png({ quality: PNG_QUALITY, compressionLevel: PNG_COMPRESSION })
        .toFile(tempPath);
    } else if (ext === ".jpg" || ext === ".jpeg") {
      await sharp(filePath).jpeg({ quality: JPEG_QUALITY }).toFile(tempPath);
    } else {
      // For other formats, just copy
      fs.copyFileSync(filePath, tempPath);
    }

    // Replace original with optimized version
    fs.renameSync(tempPath, filePath);

    const sizeAfter = getFileSize(filePath);
    const savings = sizeBefore - sizeAfter;
    const savingsPercent = ((savings / sizeBefore) * 100).toFixed(1);

    // Update cache
    const stats = fs.statSync(filePath);
    cache[filename] = {
      mtime: stats.mtimeMs,
      sizeBefore,
      sizeAfter,
    };

    console.log(
      `  ✓ ${filename} (${formatBytes(sizeBefore)} → ${formatBytes(sizeAfter)}, -${savingsPercent}%)`,
    );

    return "optimized";
  } catch (error) {
    console.error(`  ✗ ${filename}: ${(error as Error).message}`);
    return "error";
  }
}

/**
 * Get all image files in the resources directory
 */
function getImageFiles(): string[] {
  if (!fs.existsSync(RESOURCES_DIR)) {
    console.warn(`Warning: Resources directory not found: ${RESOURCES_DIR}`);
    return [];
  }

  const files = fs.readdirSync(RESOURCES_DIR);
  return files
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    })
    .map((file) => path.join(RESOURCES_DIR, file))
    .sort();
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  console.log("Optimizing blog post images...");
  if (force) {
    console.log("  (force mode: re-optimizing all images)");
  }

  const cache = loadCache();
  const imageFiles = getImageFiles();

  if (imageFiles.length === 0) {
    console.log("No images found to optimize.");
    return;
  }

  const stats: OptimizationStats = {
    optimized: 0,
    cached: 0,
    skipped: 0,
    errors: 0,
    totalSizeBefore: 0,
    totalSizeAfter: 0,
  };

  // Process each image
  for (const filePath of imageFiles) {
    const result = await optimizeImage(filePath, cache, force);

    if (result === "optimized") {
      const filename = path.basename(filePath);
      const cacheEntry = cache[filename];
      stats.optimized++;
      stats.totalSizeBefore += cacheEntry.sizeBefore;
      stats.totalSizeAfter += cacheEntry.sizeAfter;
    } else if (result === "cached") {
      const filename = path.basename(filePath);
      const cacheEntry = cache[filename];
      console.log(`  ○ ${filename} (cached)`);
      stats.cached++;
      if (cacheEntry) {
        stats.totalSizeBefore += cacheEntry.sizeBefore;
        stats.totalSizeAfter += cacheEntry.sizeAfter;
      }
    } else if (result === "skipped") {
      stats.skipped++;
    } else {
      stats.errors++;
    }
  }

  // Save cache
  saveCache(cache);

  // Summary
  console.log("");
  const totalSavings = stats.totalSizeBefore - stats.totalSizeAfter;
  const totalSavingsPercent =
    stats.totalSizeBefore > 0
      ? ((totalSavings / stats.totalSizeBefore) * 100).toFixed(1)
      : "0.0";

  console.log(
    `Done! Optimized ${stats.optimized}, cached ${stats.cached}${stats.skipped > 0 ? `, skipped ${stats.skipped}` : ""}${stats.errors > 0 ? `, errors ${stats.errors}` : ""}`,
  );

  if (stats.totalSizeBefore > 0) {
    console.log(
      `Total savings: ${formatBytes(totalSavings)} (-${totalSavingsPercent}%)`,
    );
  }

  if (stats.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
