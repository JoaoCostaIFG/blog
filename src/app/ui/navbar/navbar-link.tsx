"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavbarLink(props: { title: string; href: string }) {
	const { title, href } = props;
	const selected = usePathname() === href;
	return (
		<Link
			className={clsx(
				"relative flex h-full items-center px-3 text-xs tracking-wide",
				"after:absolute after:left-3 after:right-3 after:bottom-0 after:h-0.5 after:rounded-sm after:transition-colors",
				{
					"text-term-cyan after:bg-term-cyan": selected,
					"text-term-mute hover:text-term-ink after:bg-transparent": !selected,
				},
			)}
			href={href}
		>
			{title}
		</Link>
	);
}
