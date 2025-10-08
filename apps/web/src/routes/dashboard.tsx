import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/auth-context";
// import { Card, CardContent } from "../components/ui/card"; // Removed in favor of BrutalistCard
import { Badge } from "../components/ui/badge";
import { BrutalistCard } from "../components/brutalist-card";
import { 
  GitPullRequest, 
  Brain, 
  Database, 
  BarChart3
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { apiCall } from "@/lib/api";

interface PullRequest {
  id: number;
  repo: string;
  number: number;
  title: string;
  author: string;
  aiSuggestions?: {
    id: number;
    summary: string;
    analysisStatus: string;
  } | null;
}

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

  // Fetch dashboard stats (user-specific)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('github_token');
      if (!token) {
        return { totalReviews: 0, totalPRs: 0, totalProjects: 0 };
      }

      try {
        const response = await apiCall('/pull-requests-with-ai', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return { totalReviews: 0, totalPRs: 0, totalProjects: 0 };
        }

        const prs: PullRequest[] = await response.json();
        
        // Calculate stats from user's PRs
        const totalPRs = prs.length;
        const analyzedPRs = prs.filter((pr) => pr.aiSuggestions).length;
        
        // Count unique repositories
        const uniqueRepos = new Set(prs.map((pr) => pr.repo)).size;

        return {
          totalReviews: analyzedPRs,
          totalPRs,
          totalProjects: uniqueRepos,
        };
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        return { totalReviews: 0, totalPRs: 0, totalProjects: 0 };
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading || (isAuthenticated && statsLoading)) {
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

  // Use real data or fallback to 0
  const totalReviews = stats?.totalReviews || 0;
  const totalPRs = stats?.totalPRs || 0;
  const totalProjects = stats?.totalProjects || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Main Content */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clean Header Section */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-gray-600" />
              Welcome to ReviewIQ
            </h1>
            <p className="text-gray-600">
              Manage your pull requests and AI analysis workflow
            </p>
          </div>
          <div className="flex items-center gap-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{totalReviews}</div>
              <div className="text-sm text-gray-500 uppercase">Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{totalPRs}</div>
              <div className="text-sm text-gray-500 uppercase">PRS</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{totalProjects}</div>
              <div className="text-sm text-gray-500 uppercase">Projects</div>
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
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">AI</Badge>
                  <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">SMART</Badge>
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
