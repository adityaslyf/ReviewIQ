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
  ArrowRight,
  Clock,
  Calendar,
  User,
  TrendingUp,
  Play,
  Pause,
  CheckCircle
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
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-8 border border-white/40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl p-8 border border-white/40 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-orange-500" />
                Welcome to ReviewIQ
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your pull requests and AI analysis workflow
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">78</div>
                <div className="text-sm text-gray-500">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">56</div>
                <div className="text-sm text-gray-500">PRs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">203</div>
                <div className="text-sm text-gray-500">Projects</div>
              </div>
            </div>
          </div>
        </div>

        {/* Beautiful Floating Cards Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          
          {/* Pull Requests Card */}
          <Link to="/pull-requests" className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Card className="relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl hover:shadow-[0_20px_50px_rgba(34,_197,_94,_0.3)] transition-all duration-500 cursor-pointer group-hover:-translate-y-2 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl group-hover:from-green-100 group-hover:to-emerald-200 transition-colors">
                        <GitPullRequest className="h-7 w-7 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Pull Requests</h3>
                      <p className="text-gray-500">Browse and manage PRs</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Browse and manage pull requests from GitHub repositories
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 rounded-full">GitHub Integration</Badge>
                    <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 rounded-full">Real-time</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>

          {/* AI Analysis Card */}
          <Link to="/analysis" className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-violet-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Card className="relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl hover:shadow-[0_20px_50px_rgba(139,_92,_246,_0.3)] transition-all duration-500 cursor-pointer group-hover:-translate-y-2 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl group-hover:from-purple-100 group-hover:to-violet-200 transition-colors">
                        <Brain className="h-7 w-7 text-purple-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">AI Analysis</h3>
                      <p className="text-gray-500">AI-powered insights</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    View detailed AI-powered code review results and insights
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-full">Gemini AI</Badge>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-full">Static Analysis</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>

          {/* Repositories Card */}
          <Link to="/repositories" className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Card className="relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl hover:shadow-[0_20px_50px_rgba(59,_130,_246,_0.3)] transition-all duration-500 cursor-pointer group-hover:-translate-y-2 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative p-4 bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl group-hover:from-blue-100 group-hover:to-cyan-200 transition-colors">
                        <Github className="h-7 w-7 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Repositories</h3>
                      <p className="text-gray-500">Connect GitHub repos</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Connect and manage GitHub repositories for analysis
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-full">OAuth</Badge>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-full">Private Repos</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>

          {/* Stored Data Card */}
          <Link to="/stored" className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Card className="relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl hover:shadow-[0_20px_50px_rgba(245,_158,_11,_0.3)] transition-all duration-500 cursor-pointer group-hover:-translate-y-2 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-orange-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative p-4 bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl group-hover:from-orange-100 group-hover:to-amber-200 transition-colors">
                        <Database className="h-7 w-7 text-orange-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Stored Data</h3>
                      <p className="text-gray-500">Historical data</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    View historical analysis results and webhook data
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 rounded-full">PostgreSQL</Badge>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 rounded-full">Webhooks</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>

          {/* Settings Card */}
          <Link to="/settings" className="group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-slate-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Card className="relative bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl hover:shadow-[0_20px_50px_rgba(100,_116,_139,_0.3)] transition-all duration-500 cursor-pointer group-hover:-translate-y-2 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gray-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative p-4 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl group-hover:from-gray-100 group-hover:to-slate-200 transition-colors">
                        <Settings className="h-7 w-7 text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Settings</h3>
                      <p className="text-gray-500">App configuration</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Configure GitHub App, API keys, and preferences
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1 rounded-full">Configuration</Badge>
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1 rounded-full">API Keys</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>

          {/* Analytics Card - Coming Soon */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-3xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
            <Card className="relative bg-white/60 backdrop-blur-xl border border-white/30 rounded-3xl hover:shadow-[0_20px_50px_rgba(99,_102,_241,_0.2)] transition-all duration-500 overflow-hidden opacity-75">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-md opacity-10"></div>
                    <div className="relative p-4 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl">
                      <BarChart3 className="h-7 w-7 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Analytics</h3>
                    <p className="text-gray-500">Coming soon</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  View usage statistics and analysis trends
                </p>
                <div className="flex items-center gap-3">
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 px-3 py-1 rounded-full">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/40">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-1">0</div>
                <div className="text-sm text-green-700 font-medium">Active PRs</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-1">0</div>
                <div className="text-sm text-purple-700 font-medium">AI Analyses</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200">
                <div className="text-3xl font-bold text-gray-600 mb-1">0</div>
                <div className="text-sm text-gray-700 font-medium">Repositories</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                <div className="text-3xl font-bold text-orange-600 mb-1">0</div>
                <div className="text-sm text-orange-700 font-medium">Stored Records</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
