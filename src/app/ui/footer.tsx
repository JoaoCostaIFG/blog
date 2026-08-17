export default function Footer() {
	return (
		<footer className="relative z-10 border-t border-term-border bg-term-code/60 mt-8">
			<div className="container py-6 text-center text-xs text-term-mute space-y-1">
				<p>
					<span className="text-term-dim">$</span> whoami →{" "}
					<b className="text-term-dim">João Costa</b> ·{" "}
					<a
						className="anchor"
						rel="license"
						href="http://creativecommons.org/licenses/by-sa/4.0/"
					>
						CC BY-SA 4.0
					</a>
				</p>
				<p>
					<span className="text-term-dim">~/</span>{" "}
					<a className="anchor" href="https://wiki.joaocosta.dev">
						wiki
					</a>{" "}
					·{" "}
					<a className="anchor" href="https://github.com/JoaoCostaIFG">
						github
					</a>{" "}
					·{" "}
					<a className="anchor" href="/rss">
						rss
					</a>{" "}
					· <span className="text-term-dim">no trackers, no cookies</span>
				</p>
			</div>
		</footer>
	);
}
