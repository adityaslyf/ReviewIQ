import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PRDashboard } from "../components/pr-dashboard";
import { useAuth } from "../contexts/auth-context";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
ReviewIQ
`;

const queryClient = new QueryClient();

function HomeComponent() {
	return (
		<QueryClientProvider client={queryClient}>
			<DashboardContent />
		</QueryClientProvider>
	);
}

function DashboardContent() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	return (
		<div className="container mx-auto max-w-6xl px-4 py-8">
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<div>
						<pre className="overflow-x-auto font-mono text-sm text-center">{TITLE_TEXT}</pre>
						<p className="text-center text-gray-600 mt-4">
							Smart PR Review - AI-powered GitHub bot for intelligent code analysis
						</p>
					</div>
				</div>
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
	);
}