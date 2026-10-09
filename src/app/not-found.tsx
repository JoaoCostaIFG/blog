import Link from "next/link";
import AsciiArt from "@/components/AsciiArt";
import TerminalWindow from "@/components/TerminalWindow";

export default function NotFound() {
	return (
		<div className="mx-auto max-w-xl animate-fade-up">
			<TerminalWindow title="root@joaocosta:~# GET /404">
				<p className="prompt mb-5 text-term-red">
					[ 404.404404 ] panic: requested page not found{" "}
					<span className="cursor animate-blink" />
				</p>

				<h1 className="sr-only">404 - kernel panic</h1>

				<div className="mb-6">
					<AsciiArt
						center
						ink="red"
						label="404, kernel panic: this page has moved or never existed"
						options={{
							code: "404",
							title: "kernel panic",
							message: "segfault at 0x404 - page not mapped :3",
						}}
						piece="not-found"
					/>
				</div>

				<p className="mb-2 text-sm text-term-dim">
					You probably shouldn&apos;t be here, so if you reached this place
					using one of the buttons/links in my website, let me know so I can fix
					it :3 <em className="text-term-mute">thanks</em>
				</p>
				<p className="mb-6 text-sm text-term-dim">
					In the mean time, you can reboot back home:
				</p>

				<div className="text-center">
					<Link className="btn btn-green" href="/">
						[ reboot → home ]
					</Link>
				</div>
			</TerminalWindow>
		</div>
	);
}
