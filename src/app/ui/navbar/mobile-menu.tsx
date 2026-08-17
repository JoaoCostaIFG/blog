import clsx from "clsx";

export default function MobileMenu({
	isOpen,
	children,
}: Readonly<{
	isOpen: boolean;
	children: React.ReactNode;
}>) {
	return (
		<div
			id="mobile-menu"
			className={clsx(
				"sm:hidden px-2 pb-3 pt-2 flex flex-col gap-y-1 border-t border-term-border bg-term-bg/95 backdrop-blur-md",
				{ hidden: !isOpen },
			)}
		>
			{children}
		</div>
	);
}
