import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../contexts/auth-context";
// import { Card, CardContent } from "../components/ui/card"; // Removed in favor of BrutalistCard
import { Badge } from "../components/ui/badge";
import { BrutalistCard } from "../components/brutalist-card";
import { 
  GitPullRequest, 
  Brain, 
  Database, 
  Github, 
  BarChart3,
  Settings
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: DashboardComponent,
});

const queryClient = new QueryClient();

function DashboardComponent() {
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8 min-h-screen flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-8 border border-white/40">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
              <p className="text-gray-700">Loading...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Main Content */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brutalist Header Card */}
        <div className="brutalist-card bg-white border-6 border-gray-600 shadow-[12px_12px_0_#6b7280] p-8 mb-8 w-full max-w-none transition-all duration-300 ease-out hover:transform hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[17px_17px_0_#6b7280]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-black uppercase flex items-center gap-3 mb-4 relative overflow-hidden brutalist-card__title">
                <BarChart3 className="h-8 w-8 text-gray-600" />
                Welcome to ReviewIQ
              </h1>
              <p className="text-base leading-relaxed text-black">
                Manage your pull requests and AI analysis workflow
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-black text-black">78</div>
                <div className="text-sm text-gray-600 font-bold uppercase">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-black">56</div>
                <div className="text-sm text-gray-600 font-bold uppercase">PRs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-black">203</div>
                <div className="text-sm text-gray-600 font-bold uppercase">Projects</div>
              </div>
            </div>
          </div>
        </div>

        {/* Brutalist Cards Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          
          {/* Pull Requests Card */}
          <Link to="/pull-requests">
            <BrutalistCard
              title="Pull Requests"
              content="Browse and manage pull requests from GitHub repositories. Get real-time updates and comprehensive insights."
              variant="default"
              className="hover:cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <GitPullRequest className="h-8 w-8 text-gray-600" />
                <div className="flex gap-2">
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">GITHUB</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">LIVE</Badge>
                </div>
              </div>
            </BrutalistCard>
          </Link>

          {/* AI Analysis Card */}
          <Link to="/analysis">
            <BrutalistCard
              title="AI Analysis"
              content="View detailed AI-powered code review results and comprehensive insights. Get intelligent feedback on your code."
              variant="default"
              className="hover:cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <Brain className="h-8 w-8 text-gray-600" />
                <div className="flex gap-2">
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">GEMINI AI</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">SMART</Badge>
                </div>
              </div>
            </BrutalistCard>
          </Link>

          {/* Repositories Card */}
          <Link to="/repositories">
            <BrutalistCard
              title="Repositories"
              content="Connect and manage GitHub repositories for comprehensive analysis. Support for private repos with OAuth."
              variant="default"
              className="hover:cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <Github className="h-8 w-8 text-gray-600" />
                <div className="flex gap-2">
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">OAUTH</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">PRIVATE</Badge>
                </div>
              </div>
            </BrutalistCard>
          </Link>

          {/* Stored Data Card */}
          <Link to="/stored">
            <BrutalistCard
              title="Stored Data"
              content="View historical analysis results and webhook data. Access your complete project history and insights."
              variant="default"
              className="hover:cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <Database className="h-8 w-8 text-gray-600" />
                <div className="flex gap-2">
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">DATABASE</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">HISTORY</Badge>
                </div>
              </div>
            </BrutalistCard>
          </Link>

          {/* Settings Card */}
          <Link to="/settings">
            <BrutalistCard
              title="Settings"
              content="Configure GitHub App, API keys, and personal preferences. Customize your ReviewIQ experience."
              variant="default"
              className="hover:cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <Settings className="h-8 w-8 text-gray-600" />
                <div className="flex gap-2">
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">CONFIG</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">API</Badge>
                </div>
              </div>
            </BrutalistCard>
          </Link>

          {/* Analytics Card - Coming Soon */}
          <div className="opacity-75">
            <BrutalistCard
              title="Analytics"
              content="View usage statistics and analysis trends. Get insights into your development patterns and productivity."
              variant="default"
              className="cursor-not-allowed"
            >
              <div className="flex items-center gap-4 mb-4">
                <BarChart3 className="h-8 w-8 text-gray-600" />
                <div className="flex gap-2">
                  <Badge className="bg-yellow-400 text-black px-2 py-1 text-xs font-bold">SOON</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">STATS</Badge>
                </div>
              </div>
            </BrutalistCard>
          </div>

        </div>
        </div>
      </section>
    </div>
  );
}
