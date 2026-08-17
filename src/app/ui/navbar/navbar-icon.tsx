export default function NavbarIcon(props: {
	title: string;
	href: string;
	rel: string;
	children: React.ReactNode;
}) {
	const { title, href, rel, children } = props;
	return (
		<a
			className="inline-block -mx-3.5 rounded-md p-3.5 text-term-mute hover:bg-term-card hover:text-term-green focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-term-green"
			title={title}
			href={href}
			rel={rel}
		>
			{children}
		</a>
	);
}
