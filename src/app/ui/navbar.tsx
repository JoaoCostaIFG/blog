"use client";

import {
	Bars3Icon,
	BookOpenIcon,
	EnvelopeIcon,
	RssIcon,
} from "@heroicons/react/16/solid";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import GithunIcon from "@/app/ui/icons/github-icon";
import MobileMenu from "@/app/ui/navbar/mobile-menu";
import NavbarIcon from "@/app/ui/navbar/navbar-icon";
import NavbarLink from "@/app/ui/navbar/navbar-link";

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);

	function navlinks() {
		return (
			<>
				<NavbarLink href="/" title="home" />
				<NavbarLink href="/blog" title="blogs" />
				<NavbarLink href="/about" title="about" />
			</>
		);
	}

	function navicons() {
		return (
			<>
				<NavbarIcon href="https://wiki.joaocosta.dev" title="My wiki" rel="">
					<BookOpenIcon className="size-4" />
				</NavbarIcon>
				<NavbarIcon
					href="https://github.com/JoaoCostaIFG"
					title="My GitHub profile"
					rel="me"
				>
					<GithunIcon className="size-4" />
				</NavbarIcon>
				<NavbarIcon href="mailto:blog@joaocosta.dev" title="Email me" rel="me">
					<EnvelopeIcon className="size-4" />
				</NavbarIcon>
				<NavbarIcon href="/rss" title="My blog's RSS" rel="alternate">
					<RssIcon className="size-4" />
				</NavbarIcon>
			</>
		);
	}

	function handleMobileMenu() {
		setIsOpen(!isOpen);
	}

	return (
		<header id="header-container" className="w-full sticky top-0 z-40">
			<nav
				id="navbar"
				aria-label="primary navigation"
				className="border-b border-term-border bg-term-bg/85 backdrop-blur-md"
			>
				<div className="container">
					<div className="relative flex items-center justify-between h-12">
						<button
							id="mobile-menu-btn"
							type="button"
							className="absolute left-0 py-2 px-3 rounded-md text-term-dim hover:text-term-ink hover:bg-term-card focus:ring-2 focus:ring-inset focus:ring-term-green"
							onClick={handleMobileMenu}
							aria-label="Open navbar menu"
							aria-controls="mobile-menu"
							aria-expanded={isOpen}
						>
							<Bars3Icon className="size-5" />
						</button>

						<div className="flex flex-1 justify-center sm:justify-start">
							<Link className="shrink-0" title="Go home" href="/">
								<Image
									id="brand"
									className="shrink-0 h-8 w-auto"
									alt="My icon"
									src="/irao.png"
									width={276}
									height={286}
									priority={true}
								/>
							</Link>
							<div className="hidden sm:block sm:ml-2">
								<div className="flex h-12 gap-x-1">{navlinks()}</div>
							</div>
						</div>

						<div className="absolute inset-y-0 right-0 mr-4 sm:mr-0 flex items-center gap-x-4">
							{navicons()}
						</div>
					</div>
				</div>

				<MobileMenu isOpen={isOpen}>
					{navlinks()}
					<div className="flex flex-row justify-around flex-wrap gap-x-4 pt-1">
						{navicons()}
					</div>
				</MobileMenu>
			</nav>
		</header>
	);
}
