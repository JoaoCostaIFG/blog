/*
 * joao-boot: the home server behind this site waking up. The firmware tests
 * the machine this blog runs on, the kernel lines scroll by, systemd brings
 * up the real stack (ups, proxmox containers, the docker vm), and the boot
 * ends where the visitor is standing: on joaocosta.dev itself.
 *
 * Follows the ascii.rest piece contract (MIT, https://ascii.rest).
 */
import type { Frame, Meta } from "ascii.rest";

export interface JoaoBootOptions {
	[key: string]: unknown;
	/** Host shown at the login prompt. */
	hostname?: string;
	/** The site the boot ends on. */
	domain?: string;
	/** Installed memory in MB, counted by the self test. */
	memory?: number;
}

export const meta = {
	name: "joao boot log",
	category: "ui",
	note: "the home server behind this site waking up: ups, proxmox, docker, blog",
	cols: 64,
	rows: 16,
	fps: 15,
	options: {
		hostname: "ifgsv",
		domain: "joaocosta.dev",
		memory: 32768,
	},
} satisfies Meta<JoaoBootOptions>;

const W = 62; // text width inside a one-column margin
const SPIN = "|/-\\";
const EIGHTHS = "░▏▎▍▌▋▊▉";
const TEST = 2.4; // seconds the memory self test takes
const PULL = 3.6; // seconds the image pull job spins for
const WAIT = 6; // seconds at the login prompt before the next boot

// Kernel lines: gap to the previous line, then the text.
const KERNEL: [number, string][] = [
	[0, "linux 6.8.12-2-pve starting on x86_64"],
	[0.21, "vfio: sata controller bound (passthrough)"],
	[0.14, "zfs: rpool imported"],
	[0.09, "pve: guest quorum established"],
];

// Service and container lines; the real stack, in start order.
const SERVICES: [number, string][] = [
	[0.3, "[  OK  ] mounted rpool on /"],
	[0.15, "[  OK  ] started nut ups monitor"],
	[0.2, "[  OK  ] started lxc: caddy reverse proxy"],
	[0.18, "[  OK  ] started lxc: monitoring (grafana)"],
	[0.35, "[  OK  ] started vm: docker"],
];

const CONTAINERS: [number, string][] = [
	[0.6, "[  OK  ] started vaultwarden"],
	[0.5, "[  OK  ] started joplin server (wiki notes)"],
	[0.5, "[  OK  ] started paperless-ngx"],
	[0.4, "[  OK  ] started searxng + vane search"],
	[0.4, "[  OK  ] started rss2email"],
	[0.7, "[  OK  ] started crafty 4 (minecraft)"],
	[1.0, "[  OK  ] started traccar — dog tracker reporting"],
	[1.2, "[  OK  ] pulled ghcr.io/joaocostaifg/blog:master"],
];

interface Entry {
	at: number;
	text: string | ((now: number) => string);
}

export default function joaoBoot({
	hostname = meta.options.hostname,
	domain = meta.options.domain,
	memory = meta.options.memory,
}: Partial<JoaoBootOptions> = {}): Frame {
	const { cols, rows } = meta;

	// A firmware row: label, detail and a status flush to the right edge.
	const row = (label: string, detail: string, status = "") => {
		const left = label.padEnd(10) + detail;
		return left + status.padStart(W - left.length);
	};

	const entries: Entry[] = [];
	let at = 0;
	const put = (text: string | ((now: number) => string), gap: number) => {
		at += gap;
		entries.push({ at, text });
	};

	// >> firmware self test on the proxmox host
	put(row(`${hostname} firmware`, "", "self test"), 0.12);
	put("─".repeat(W), 0.06);
	put(row("cpu", "8 threads at 3.40 GHz", "ok"), 0.06);
	put(row("ups (nut)", "on line power", "ok"), 0.06);
	const memAt = at + 0.06;
	put((now) => {
		const f = Math.min(1, Math.max(0, (now - memAt) / TEST));
		return row(
			"memory",
			`${Math.floor(f * memory)} MB of ${memory} MB`,
			f < 1 ? "testing" : "ok",
		);
	}, 0.06);
	put((now) => {
		const f = Math.min(1, Math.max(0, (now - memAt) / TEST));
		const fill = f * 36;
		const full = Math.floor(fill);
		const bar =
			"█".repeat(full) +
			(full < 36 ? EIGHTHS[Math.floor((fill - full) * 8)] : "");
		return (
			" ".repeat(10) +
			bar.padEnd(36, "░") +
			`${Math.round(f * 100)}%`.padStart(5)
		);
	}, 0.06);
	const sataDone = at + 1.4;
	put(
		(now) =>
			now >= sataDone
				? row("sata", "controller passed to vfio", "ok")
				: row("sata", `detecting ${SPIN[Math.floor(now * 8) % 4]}`),
		0.06,
	);
	const netDone = at + 1.7;
	put(
		(now) =>
			now >= netDone
				? row("network", "link up at 1000 Mb/s", "link up")
				: row("network", `negotiating ${SPIN[Math.floor(now * 8) % 4]}`),
		0.06,
	);
	put("─".repeat(W), 0.06);
	put("esc skip memory test    f2 setup    f12 boot menu", 0.06);
	// << firmware self test

	// >> kernel
	put("loading proxmox ve kernel ...", 0.4);
	let stamp = 0;
	KERNEL.forEach(([gap, text], i) => {
		stamp += gap + i * 0.0007;
		put(`[${stamp.toFixed(6).padStart(12)}] ${text}`, 0.05 + gap * 1.4);
	});
	// << kernel

	// >> services, then the compose pull job
	for (const [gap, text] of SERVICES) put(text, gap);
	const pullAt = at + 0.5;
	put((now) => {
		const age = now - pullAt;
		if (age >= PULL) return "[  OK  ] images pulled for compose up";
		const k = Math.floor(age * 8) % 6;
		const p = k < 4 ? k : 6 - k;
		const stars = `${" ".repeat(p)}***`.padEnd(6);
		return `[${stars}] docker compose up -d (pulling)`;
	}, 0.5);
	at += PULL;
	for (const [gap, text] of CONTAINERS) put(text, gap);
	put(`[  OK  ] website up — ${domain} is serving`, 0.8);
	put("[ WARN ] oracle cloud vms waking (eu-madrid-1)", 0.5);
	put("", 0.4);
	// << services

	const login = at;
	put(`${hostname} login: `, 0.3);
	const period = login + WAIT + 0.3;
	// Frame 0 is the finished boot at the login prompt, just before it loops.
	const start = period - 0.25;

	return (t) => {
		const now = (t + start) % period;
		const lines: string[] = [];
		for (const e of entries)
			if (e.at <= now)
				lines.push(typeof e.text === "function" ? e.text(now) : e.text);
		if (now >= login)
			lines[lines.length - 1] += (now - login) % 1 < 0.6 ? "_" : " ";
		const top = Math.max(0, lines.length - rows);
		const out: string[] = [];
		for (let r = 0; r < rows; r++)
			out.push(` ${lines[top + r] ?? ""}`.padEnd(cols).slice(0, cols));
		return out.join("\n");
	};
}
