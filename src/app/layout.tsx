import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
import Footer from "@/app/ui/footer";
import Navbar from "@/app/ui/navbar";
import ScrollReset from "@/components/ScrollReset";
import VimNav from "@/components/VimNav";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL("https://joaocosta.dev"),
	alternates: {
		types: {
			"application/rss+xml": "/rss",
		},
	},
	title: "Joao Costa",
	description:
		"Hey! I am a software engineer and this is my personal website. I try to be active here.",
	openGraph: {
		title: "Joao Costa",
		description:
			"Hey! I am a software engineer and this is my personal website. I try to be active here.",
		images: ["/og/default.jpg"],
		locale: "en_US",
		type: "website",
		siteName: "Joao Costa",
	},
	twitter: {
		card: "summary_large_image",
		images: ["/og/default.jpg"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${inter.variable} ${jetbrainsMono.variable} font-mono bg-term-bg text-term-ink antialiased min-h-svh flex flex-col overflow-x-hidden`}
			>
				{/*
				 * JSX cannot express a raw HTML comment, so render one
				 * through an inert div: a tip for terminal-inclined folks
				 * who view the page source.
				 */}
				<div
					aria-hidden
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static developer-controlled string that only emits an HTML comment; no user input
					dangerouslySetInnerHTML={{
						__html:
							"<!-- curl tip: curl -H 'Accept: text/x-ansi' https://joaocosta.dev · agents: Accept: text/markdown · index: /llms.txt -->",
					}}
				/>
				<div className="term-glow" aria-hidden />

				<ScrollReset />

				<Navbar />

				<main
					id="content-container"
					className="relative z-10 container flex-1 py-8"
				>
					{children}
				</main>

				<VimNav />
				<Footer />
			</body>
		</html>
	);
}
