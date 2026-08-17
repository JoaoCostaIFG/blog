import Link from "next/link";
import TerminalWindow from "@/components/TerminalWindow";

export default function NotFound() {
	return (
		<TerminalWindow
			className="animate-fade-up mx-auto max-w-xl"
			title="root@joaocosta:~# GET /404"
		>
			<p className="prompt mb-5 text-term-red">
				[ 404.404404 ] panic: requested page not found{" "}
				<span className="cursor animate-blink" />
			</p>

			<h1 className="mb-2 text-2xl">404 - kernel panic D:</h1>
			<p className="mb-2 text-sm text-term-dim">
				You probably shouldn&apos;t be here, so if you reached this place using
				one of the buttons/links in my website, let me know so I can fix it :3{" "}
				<em className="text-term-mute">thanks</em>
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
	);
}
