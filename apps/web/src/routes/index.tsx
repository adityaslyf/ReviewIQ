import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PRDashboard } from "../components/pr-dashboard";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

const queryClient = new QueryClient();

function HomeComponent() {
	return (
		<QueryClientProvider client={queryClient}>
			<div className="container mx-auto max-w-6xl px-4 py-8">
				<div className="mb-8">
					<pre className="overflow-x-auto font-mono text-sm text-center">{TITLE_TEXT}</pre>
					<p className="text-center text-gray-600 mt-4">
						Smart PR Review - AI-powered GitHub bot for intelligent code analysis
					</p>
				</div>
				
				<div className="grid gap-6">
					<section className="rounded-lg border p-4">
						<h2 className="mb-4 font-medium text-lg">System Status</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-green-500 rounded-full"></div>
								<span className="text-sm">Server: Running</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-green-500 rounded-full"></div>
								<span className="text-sm">Database: Connected</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
								<span className="text-sm">GitHub App: Configure Required</span>
							</div>
						</div>
					</section>

					<section className="rounded-lg border p-6">
						<PRDashboard />
					</section>
				</div>
			</div>
		</QueryClientProvider>
	);
}
