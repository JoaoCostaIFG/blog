import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const FONT_PATH = path.join(process.cwd(), "src/lib/og/fonts/helvetica.ttc");

// Image dimensions optimized for Twitter/X
const WIDTH = 800;
const HEIGHT = 450;

// Colors
const BG_COLOR = "#1e1e1e";
const TEXT_COLOR = "#ffffff";

interface BaseImageOptions {
	title: string;
	subtitle?: string;
	eyebrow?: string;
	backgroundImagePath?: string;
}

interface LogoImageOptions {
	title: string;
	subtitle?: string;
	logoPath: string;
}

/**
 * Escape special XML characters in text
 */
function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Wrap text to fit within a maximum width (approximate character-based wrapping)
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		if (testLine.length <= maxCharsPerLine) {
			currentLine = testLine;
		} else {
			if (currentLine) lines.push(currentLine);
			currentLine = word;
		}
	}
	if (currentLine) lines.push(currentLine);

	return lines;
}

/**
 * Generate an SVG for the base style (blog posts)
 */
function generateBaseSvg(options: BaseImageOptions): string {
	const { title, subtitle, eyebrow } = options;

	const leftMargin = 40;

	// Approximate characters per line based on font size
	const titleLines = wrapText(title.toUpperCase(), 28);
	const subtitleLines = subtitle ? wrapText(subtitle, 55) : [];

	// Calculate vertical positions
	let currentY = 135;

	// Build SVG content
	let svgContent = "";

	// Eyebrow text (date)
	if (eyebrow) {
		svgContent += `
		<text x="${leftMargin}" y="${currentY}"
			font-family="Helvetica, Arial, sans-serif"
			font-size="14"
			fill="${TEXT_COLOR}"
			opacity="0.8">
			${escapeXml(eyebrow.toUpperCase())}
		</text>`;
		currentY += 35;
	}

	// Title lines (bold effect via multiple renders)
	const titleFontSize = 42;
	const titleLineHeight = 50;
	for (const line of titleLines) {
		// Bold effect: render text multiple times with slight offsets
		for (let ox = -1; ox <= 1; ox++) {
			for (let oy = -1; oy <= 1; oy++) {
				svgContent += `
				<text x="${leftMargin + ox}" y="${currentY + oy}"
					font-family="Helvetica, Arial, sans-serif"
					font-size="${titleFontSize}"
					font-weight="bold"
					fill="${TEXT_COLOR}">
					${escapeXml(line)}
				</text>`;
			}
		}
		currentY += titleLineHeight;
	}

	currentY += 20; // spacing after title

	// Subtitle lines
	const subtitleFontSize = 20;
	const subtitleLineHeight = 28;
	for (const line of subtitleLines.slice(0, 3)) {
		// Max 3 lines
		svgContent += `
		<text x="${leftMargin}" y="${currentY}"
			font-family="Helvetica, Arial, sans-serif"
			font-size="${subtitleFontSize}"
			fill="${TEXT_COLOR}"
			opacity="0.9">
			${escapeXml(line)}
		</text>`;
		currentY += subtitleLineHeight;
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<style>
			@font-face {
				font-family: 'Helvetica';
				src: url('file://${FONT_PATH}');
			}
		</style>
	</defs>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>
	${svgContent}
</svg>`;
}

/**
 * Generate an SVG for the logo style (homepage/default)
 */
function generateLogoSvg(options: LogoImageOptions): string {
	const { title, subtitle } = options;

	// Center positions
	const centerX = WIDTH / 2;

	// Logo placeholder position (we'll composite the actual image separately)
	const logoY = 80;
	const logoSize = 160;

	// Text positions
	const titleY = logoY + logoSize + 50;
	const subtitleY = titleY + 40;

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<style>
			@font-face {
				font-family: 'Helvetica';
				src: url('file://${FONT_PATH}');
			}
		</style>
	</defs>
	<rect width="${WIDTH}" height="${HEIGHT}" fill="${BG_COLOR}"/>

	<!-- Title -->
	<text x="${centerX}" y="${titleY}"
		font-family="Helvetica, Arial, sans-serif"
		font-size="48"
		font-weight="bold"
		fill="${TEXT_COLOR}"
		text-anchor="middle">
		${escapeXml(title)}
	</text>

	<!-- Subtitle -->
	${
		subtitle
			? `
	<text x="${centerX}" y="${subtitleY}"
		font-family="Helvetica, Arial, sans-serif"
		font-size="22"
		fill="${TEXT_COLOR}"
		opacity="0.8"
		text-anchor="middle">
		${escapeXml(subtitle)}
	</text>`
			: ""
	}
</svg>`;
}

/**
 * Render SVG to PNG buffer using resvg
 */
function renderSvgToPng(svg: string): Buffer {
	const resvg = new Resvg(svg, {
		font: {
			fontFiles: [FONT_PATH],
			loadSystemFonts: false,
		},
	});
	const pngData = resvg.render();
	return Buffer.from(pngData.asPng());
}

/**
 * Generate a base-style OG image (for blog posts)
 * Features: dark background with overlay, eyebrow date, title, subtitle
 */
export async function generateBaseImage(
	options: BaseImageOptions,
	outputPath: string,
): Promise<void> {
	const svg = generateBaseSvg(options);
	const pngBuffer = renderSvgToPng(svg);

	// If there's a background image, composite it
	if (
		options.backgroundImagePath &&
		fs.existsSync(options.backgroundImagePath)
	) {
		const background = await sharp(options.backgroundImagePath)
			.resize(WIDTH, HEIGHT, { fit: "cover" })
			.toBuffer();

		// Create dark overlay
		const overlay = await sharp({
			create: {
				width: WIDTH,
				height: HEIGHT,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0.7 },
			},
		})
			.png()
			.toBuffer();

		// Composite: background -> overlay -> text
		await sharp(background)
			.composite([
				{ input: overlay, blend: "over" },
				{ input: pngBuffer, blend: "over" },
			])
			.png()
			.toFile(outputPath);
	} else {
		// Just save the SVG render directly
		await sharp(pngBuffer).png().toFile(outputPath);
	}
}

/**
 * Generate a logo-style OG image (for homepage/default)
 * Features: dark background, circular avatar, centered title and subtitle
 */
export async function generateLogoImage(
	options: LogoImageOptions,
	outputPath: string,
): Promise<void> {
	const svg = generateLogoSvg(options);
	const textLayer = renderSvgToPng(svg);

	const logoSize = 160;
	const logoX = (WIDTH - logoSize) / 2;
	const logoY = 80;

	// Load and process the logo image into a circle
	const logoBuffer = await sharp(options.logoPath)
		.resize(logoSize, logoSize, { fit: "cover" })
		.toBuffer();

	// Create circular mask
	const circleMask = Buffer.from(
		`<svg width="${logoSize}" height="${logoSize}">
			<circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="white"/>
		</svg>`,
	);

	const circularLogo = await sharp(logoBuffer)
		.composite([
			{
				input: circleMask,
				blend: "dest-in",
			},
		])
		.png()
		.toBuffer();

	// Composite: text layer (which has the background) + circular logo
	await sharp(textLayer)
		.composite([
			{
				input: circularLogo,
				top: logoY,
				left: Math.round(logoX),
			},
		])
		.png()
		.toFile(outputPath);
}

/**
 * Format a date for display in the eyebrow
 */
export function formatDateForOg(date: Date): string {
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
	// Remove markdown formatting
	const cleaned = text
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
		.replace(/[*_`#]/g, "") // Remove markdown emphasis
		.replace(/\n/g, " ") // Replace newlines with spaces
		.replace(/\s+/g, " ") // Collapse multiple spaces
		.trim();

	if (cleaned.length <= maxLength) {
		return cleaned;
	}
	return `${cleaned.slice(0, maxLength - 3).trim()}...`;
}
