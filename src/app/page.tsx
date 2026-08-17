import Link from "next/link";
import BootEntry, { BOOT_ACCENTS } from "@/components/BootEntry";
import KeyboardNav from "@/components/KeyboardNav";
import TerminalWindow from "@/components/TerminalWindow";
import { getSortedPostsData } from "@/lib/posts";

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export default async function Home() {
	// get the latest 3 blog posts
	const blogs = getSortedPostsData().slice(0, 3);
	const hrefs = blogs.map((b) => `/blog/${encodeURIComponent(b.id)}`);

	return (
		<div className="animate-fade-up space-y-8">
			<TerminalWindow title="root@joaocosta:~# ./blog --menu">
				<div className="prompt mb-4">
					&gt; select boot entry <span className="cursor animate-blink" />
				</div>

				<h1 className="wordmark mb-2 text-[clamp(38px,9vw,68px)]">
					<span className="glow-letter">J</span>oão Costa
				</h1>
				<p className="mb-1 text-xs text-term-mute">
					<span className="text-term-dim">$</span> whoami{" "}
					<span className="text-term-dim">→</span>{" "}
					<a
						className="text-term-cyan hover:underline underline-offset-2"
						href="https://github.com/JoaoCostaIFG"
					>
						@JoaoCostaIFG
					</a>
				</p>
				<p className="mb-1 text-sm text-term-dim">
					Software engineer — embedded systems, Linux, and the web.
				</p>
				<p className="mb-7 text-xs text-term-mute italic">
					My little corner of the internet. Pick a post and boot in.
				</p>

				<h2 className="menu-label">boot entries · recent posts</h2>
				<nav className="mb-5 flex flex-col gap-3">
					{blogs.map((b, i) => (
						<BootEntry
							key={b.id}
							idx={i + 1}
							href={hrefs[i]}
							kind={`post · ${formatDate(b.date)}`}
							title={b.title}
							desc={b.intro}
							accent={BOOT_ACCENTS[i % BOOT_ACCENTS.length]}
						/>
					))}
				</nav>

				<Link href="/blog" className="anchor text-xs">
					$ ls posts/ --all →
				</Link>

				<div className="hint">
					<span>navigate:</span>
					<span>
						<span className="key">1</span>–
						<span className="key">{blogs.length}</span>
					</span>
					<span>
						<span className="key">↑</span> <span className="key">↓</span> +{" "}
						<span className="key">enter</span>
					</span>
					<span>· no trackers, no cookies</span>
				</div>
			</TerminalWindow>

			<KeyboardNav hrefs={hrefs} />

			<TerminalWindow title="root@joaocosta:~# cat about.txt">
				<h2 className="menu-label">about</h2>
				<p className="mb-6 text-sm text-term-dim">
					Hey! My name is João Costa and this is my personal corner of the
					internet. I&apos;m interested in computer science and electronics, and
					I enjoy implementing my own solutions to problems/needs.
					<Link href="/about" className="anchor ml-1">
						more →
					</Link>
				</p>

				<h2 className="menu-label">wiki</h2>
				<p className="mb-6 text-sm text-term-dim">
					I manage a small{" "}
					<a className="anchor" href="https://wiki.joaocosta.dev">
						wiki
					</a>{" "}
					where I post small &quot;cookbooks&quot;, &quot;cheat-sheets&quot; and
					other general guides/annotations. It&apos;s basically part of my notes
					that I decided to make public.
				</p>

				<h2 className="menu-label">friends</h2>
				<p className="mb-3 text-xs text-term-mute">
					This is a list of my friends&apos; websites. Pay them a visit
					sometime.
				</p>
				<ul className="space-y-1 text-sm text-term-dim">
					<li>
						<span className="mr-2 text-term-green">→</span>
						<a className="anchor" href="https://educorreia932.dev">
							educorreia932
						</a>
					</li>
					<li>
						<span className="mr-2 text-term-green">→</span>
						<a className="anchor" href="https://marceloborges.dev">
							jmarcelomb
						</a>
					</li>
				</ul>
			</TerminalWindow>
		</div>
	);
}
