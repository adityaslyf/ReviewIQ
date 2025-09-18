import { createFileRoute, Link } from "@tanstack/react-router";
import { Github } from "lucide-react";

export const Route = createFileRoute("/landing")({
	component: LandingPage,
});

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="text-center">
			<div className="text-3xl font-semibold tracking-tight">{value}</div>
			<div className="text-sm text-gray-500">{label}</div>
		</div>
	);
}

function Feature({ title, desc }: { title: string; desc: string }) {
	return (
		<div className="rounded-xl border p-5 bg-white/60 dark:bg-black/30">
			<h3 className="font-semibold mb-2">{title}</h3>
			<p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
		</div>
	);
}

function LandingPage() {
	return (
		<div className="min-h-[calc(100svh-56px)] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.03)_100%)]">
			{/* Hero */}
			<section className="container mx-auto px-4 py-16 md:py-24">
				<div className="grid md:grid-cols-2 gap-8 items-center">
					<div>
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
							<Stat label="Repos in review" value="2M+" />
							<Stat label="PRs reviewed" value="13M+" />
							<Stat label="Teams" value="8k+" />
						</div>
					</div>
					<div className="rounded-xl border bg-white/60 dark:bg-black/30 aspect-video" />
				</div>
			</section>

			{/* Features */}
			<section id="features" className="container mx-auto px-4 py-12 md:py-16">
				<h2 className="text-2xl font-semibold mb-6">Why ReviewIQ</h2>
				<div className="grid md:grid-cols-3 gap-4">
					<Feature title="Code-aware reviews" desc="Line-by-line suggestions grounded in your changes and context." />
					<Feature title="Simple PR summaries" desc="One-line highlights with changed files and impact." />
					<Feature title="One-click fixes" desc="Quick apply suggestions to move faster with confidence." />
				</div>
			</section>

			{/* How it works */}
			<section className="container mx-auto px-4 py-12 md:py-16">
				<h2 className="text-2xl font-semibold mb-6">How it works</h2>
				<ol className="grid md:grid-cols-4 gap-4 list-decimal list-inside">
					<li className="rounded-xl border p-4">Install the GitHub App</li>
					<li className="rounded-xl border p-4">Open or update a PR</li>
					<li className="rounded-xl border p-4">Get AI review & suggestions</li>
					<li className="rounded-xl border p-4">Merge with confidence</li>
				</ol>
			</section>

			{/* Security */}
			<section className="container mx-auto px-4 py-12 md:py-16">
				<h2 className="text-2xl font-semibold mb-6">Security & Privacy</h2>
				<div className="grid md:grid-cols-3 gap-4">
					<Feature title="Ephemeral reviews" desc="We don't retain your code after processing." />
					<Feature title="Encrypted in transit" desc="TLS everywhere. Your data stays protected." />
					<Feature title="Enterprise-ready" desc="SOC2 processes and SSO-ready deployment paths." />
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


