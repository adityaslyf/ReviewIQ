import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../contexts/auth-context";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  GitPullRequest, 
  Brain, 
  Database, 
  Github, 
  BarChart3,
  Settings,
  ArrowRight
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              ReviewIQ Dashboard
            </h1>
            <p className="mt-2 text-gray-300">
              Manage your pull requests and AI analysis workflow
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Pull Requests Section */}
          <Link to="/pull-requests">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-black border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <GitPullRequest className="h-8 w-8 text-green-400" />
                      <h2 className="text-xl font-semibold text-white">Pull Requests</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                      Browse and manage pull requests from GitHub repositories
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-green-400 border-green-400">GitHub Integration</Badge>
                      <Badge variant="outline" className="text-xs text-green-400 border-green-400">Real-time</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* AI Analysis Section */}
          <Link to="/analysis">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-black border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Brain className="h-8 w-8 text-purple-400" />
                      <h2 className="text-xl font-semibold text-white">AI Analysis</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                      View detailed AI-powered code review results and insights
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-purple-400 border-purple-400">Gemini AI</Badge>
                      <Badge variant="outline" className="text-xs text-purple-400 border-purple-400">Static Analysis</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Repository Management */}
          <Link to="/repositories">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-black border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Github className="h-8 w-8 text-blue-400" />
                      <h2 className="text-xl font-semibold text-white">Repositories</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                      Connect and manage GitHub repositories for analysis
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">OAuth</Badge>
                      <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">Private Repos</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Stored Data */}
          <Link to="/stored">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-black border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Database className="h-8 w-8 text-amber-400" />
                      <h2 className="text-xl font-semibold text-white">Stored Data</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                      View historical analysis results and webhook data
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-amber-400 border-amber-400">PostgreSQL</Badge>
                      <Badge variant="outline" className="text-xs text-amber-400 border-amber-400">Webhooks</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Settings */}
          <Link to="/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-black border-l-4 border-l-gray-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Settings className="h-8 w-8 text-gray-400" />
                      <h2 className="text-xl font-semibold text-white">Settings</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                      Configure GitHub App, API keys, and preferences
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-400">Configuration</Badge>
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-400">API Keys</Badge>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Analytics */}
          <Card className="bg-black border-l-4 border-l-indigo-500 opacity-75">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <BarChart3 className="h-8 w-8 text-indigo-400" />
                    <h2 className="text-xl font-semibold text-white">Analytics</h2>
                  </div>
                  <p className="text-gray-300 mb-4">
                    View usage statistics and analysis trends
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-indigo-400 border-indigo-400">Coming Soon</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-black">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">0</div>
                <div className="text-sm text-gray-300">Active PRs</div>
              </CardContent>
            </Card>
            <Card className="bg-black">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">0</div>
                <div className="text-sm text-gray-300">AI Analyses</div>
              </CardContent>
            </Card>
            <Card className="bg-black">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">0</div>
                <div className="text-sm text-gray-300">Repositories</div>
              </CardContent>
            </Card>
            <Card className="bg-black">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">0</div>
                <div className="text-sm text-gray-300">Stored Records</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
