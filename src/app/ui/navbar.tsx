import { BookOpenIcon, EnvelopeIcon, RssIcon } from "@heroicons/react/16/solid";
import GithunIcon from "@/app/ui/icons/github-icon";
import NavbarIcon from "@/app/ui/navbar/navbar-icon";
import NavbarLink from "@/app/ui/navbar/navbar-link";

export default function Navbar() {
	function navlinks() {
		return (
			<>
				<NavbarLink href="/" title="home" />
				<NavbarLink href="/blog" title="posts" />
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

	return (
		<header id="header-container" className="relative z-40 w-full">
			<nav
				id="navbar"
				aria-label="primary navigation"
				className="border-b border-term-border bg-term-bg/85 backdrop-blur-md"
			>
				<div className="container">
					<div className="flex h-12 items-center justify-between">
						<div className="flex h-full gap-x-1">{navlinks()}</div>
						<div className="flex items-center gap-x-3 sm:gap-x-4">
							{navicons()}
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}
