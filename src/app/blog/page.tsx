import BootEntry, { BOOT_ACCENTS } from "@/components/BootEntry";
import KeyboardNav from "@/components/KeyboardNav";
import TerminalWindow from "@/components/TerminalWindow";
import { getSortedPostsData } from "@/lib/posts";

export const metadata = {
	alternates: { canonical: "/blog" },
};

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export default async function Blogs() {
	const blogs = getSortedPostsData();
	const hrefs = blogs.map((b) => `/blog/${encodeURIComponent(b.id)}`);

	return (
		<TerminalWindow
			className="animate-fade-up"
			title={`root@joaocosta:~# ls posts/ - ${blogs.length} entries`}
		>
			<div className="prompt mb-4">
				&gt; all posts - select one to boot{" "}
				<span className="cursor animate-blink" />
			</div>

			<h1 className="menu-label">boot entries · all posts</h1>
			<KeyboardNav hrefs={hrefs} />
			<nav className="mb-6 flex flex-col gap-3">
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

			<div className="hint">
				<span>navigate:</span>
				<span>
					<span className="key">1</span>–<span className="key">9</span>
				</span>
				<span>
					<span className="key">j</span> <span className="key">k</span> +{" "}
					<span className="key">l</span>
				</span>
				<span>
					<span className="key">?</span> all keys
				</span>
			</div>
		</TerminalWindow>
	);
}
