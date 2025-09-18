import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Github, Brain, GitPullRequest, Shield } from "lucide-react";

export const Route = createFileRoute("/landing")({
	component: LandingPage,
});

function CountUp({ end, duration = 1200, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
	const [value, setValue] = useState(0);

	useEffect(() => {
		let start: number | null = null;
		const step = (ts: number) => {
			if (start === null) start = ts;
			const p = Math.min(1, (ts - start) / duration);
			setValue(Math.floor(end * p));
			if (p < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}, [end, duration]);

	return <span>{value.toLocaleString()}<span>{suffix}</span></span>;
}

function Stat({ label, end, suffix = "" }: { label: string; end: number; suffix?: string }) {
	return (
		<div className="text-center rounded-lg border bg-white dark:bg-neutral-900 px-5 py-4 shadow-sm">
			<div className="text-3xl font-semibold tracking-tight">
				<CountUp end={end} suffix={suffix} />
			</div>
			<div className="text-sm text-neutral-600 dark:text-neutral-300">{label}</div>
		</div>
	);
}

function Feature({ title, desc, icon: Icon }: { title: string; desc: string; icon: React.ComponentType<{ className?: string }> }) {
	return (
		<div className="rounded-xl border p-5 bg-white dark:bg-neutral-900 shadow-sm transition-transform hover:-translate-y-0.5">
			<div className="flex items-start gap-3">
				<div className="h-9 w-9 rounded-md border bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
					<Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-200" />
				</div>
				<div>
					<h3 className="font-semibold mb-1">{title}</h3>
					<p className="text-sm text-neutral-700 dark:text-neutral-300">{desc}</p>
				</div>
			</div>
		</div>
	);
}

function LogoMarquee() {
	return (
		<div className="overflow-hidden border rounded-lg bg-white dark:bg-neutral-900">
			<style>
				{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}
			</style>
			<div className="whitespace-nowrap flex gap-8 py-3" style={{ animation: "marquee 18s linear infinite" }}>
				{Array.from({ length: 12 }).map((_, i) => (
					<div key={i} className="h-6 w-24 rounded border bg-neutral-50 dark:bg-neutral-800" />
				))}
			</div>
		</div>
	);
}

function Reveal({ children }: { children: React.ReactNode }) {
	const [visible, setVisible] = useState(false);
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => {
			if (e.isIntersecting) setVisible(true);
		},{ threshold: 0.2 });
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<div ref={ref} className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
			{children}
		</div>
	);
}

function LandingPage() {
	return (
		<div className="min-h-[calc(100svh-56px)]">
			{/* Hero */}
			<section className="container mx-auto px-4 py-16 md:py-24">
				<div className="grid md:grid-cols-2 gap-8 items-center">
					<Reveal>
						<h1 className="text-4xl md:text-5xl font-bold tracking-tight">
							Ship better PRs, faster.
						</h1>
						<p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
							AI-powered reviews, code-aware insights, and one-click suggestions. Designed for modern teams.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<Link
								to="/"
								className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
							>
								<Github className="h-4 w-4 mr-2" /> Sign in with GitHub
							</Link>
							<a
								href="#features"
								className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10"
							>
								Learn more
							</a>
						</div>
						<div className="mt-6 grid grid-cols-3 gap-4">
							<Stat label="Repos in review" end={2000000} suffix="+" />
							<Stat label="PRs reviewed" end={13000000} suffix="+" />
							<Stat label="Teams" end={8000} suffix="+" />
						</div>
					</Reveal>
					<div className="rounded-xl border bg-white/60 dark:bg-black/30 aspect-video" />
				</div>
				<div className="mt-6">
					<LogoMarquee />
				</div>
			</section>

			{/* Features */}
			<section id="features" className="container mx-auto px-4 py-12 md:py-16">
				<h2 className="text-2xl font-semibold mb-6">Why ReviewIQ</h2>
				<div className="grid md:grid-cols-3 gap-4">
					<Reveal><Feature title="Code-aware reviews" desc="Line-by-line suggestions grounded in your changes and context." icon={GitPullRequest} /></Reveal>
					<Reveal><Feature title="AI insights" desc="Readable summaries, potential issues, and refactor suggestions." icon={Brain} /></Reveal>
					<Reveal><Feature title="Enterprise-grade" desc="Security-first workflows that scale from startup to enterprise." icon={Shield} /></Reveal>
				</div>
			</section>

			{/* How it works */}
			<section className="container mx-auto px-4 py-12 md:py-16">
				<h2 className="text-2xl font-semibold mb-6">How it works</h2>
				<ol className="grid md:grid-cols-4 gap-4">
					<Reveal><li className="rounded-xl border p-4 bg-white dark:bg-black/30 shadow-sm">Install the GitHub App</li></Reveal>
					<Reveal><li className="rounded-xl border p-4 bg-white dark:bg-black/30 shadow-sm">Open or update a PR</li></Reveal>
					<Reveal><li className="rounded-xl border p-4 bg-white dark:bg-black/30 shadow-sm">Get AI review & suggestions</li></Reveal>
					<Reveal><li className="rounded-xl border p-4 bg-white dark:bg-black/30 shadow-sm">Merge with confidence</li></Reveal>
				</ol>
			</section>

			{/* Security */}
			<section className="container mx-auto px-4 py-12 md:py-16">
				<h2 className="text-2xl font-semibold mb-6">Security & Privacy</h2>
				<div className="grid md:grid-cols-3 gap-4">
					<Reveal><Feature title="Ephemeral reviews" desc="We don't retain your code after processing." icon={Shield} /></Reveal>
					<Reveal><Feature title="Encrypted in transit" desc="TLS everywhere. Your data stays protected." icon={Shield} /></Reveal>
					<Reveal><Feature title="Enterprise-ready" desc="SOC2 processes and SSO-ready deployment paths." icon={Shield} /></Reveal>
				</div>
			</section>

			{/* CTA */}
			<section className="container mx-auto px-4 py-16 md:py-20">
				<div className="rounded-2xl border p-8 text-center bg-white/60 dark:bg-black/30">
					<h3 className="text-2xl font-semibold">Cut review time & bugs in half</h3>
					<p className="text-gray-600 dark:text-gray-300 mt-2">Start free. No credit card.</p>
					<div className="mt-6">
						<Link
							to="/"
							className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
						>
							Get Started
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}


