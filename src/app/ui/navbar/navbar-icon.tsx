export default function NavbarIcon(props: {
	title: string;
	href: string;
	rel: string;
	children: React.ReactNode;
}) {
	const { title, href, rel, children } = props;
	return (
		<a
			className="hidden sm:inline-block text-term-mute hover:text-term-green"
			title={title}
			href={href}
			rel={rel}
		>
			{children}
		</a>
	);
}
