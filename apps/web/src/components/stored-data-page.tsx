import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { BrutalistCard } from "./brutalist-card";
import { Database, GitPullRequest, Brain, Calendar, User, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "../contexts/auth-context";

interface PullRequest {
  id: number;
  repo: string;
  number: number;
  title: string;
  author: string;
  summary: string | null;
  createdAt: string;
  aiSuggestions?: {
    id: number;
    summary: string;
    analysisStatus: string;
  };
}

async function fetchPullRequests(): Promise<PullRequest[]> {
  const response = await fetch("http://localhost:3000/api/pull-requests-with-ai");
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json();
}

export function StoredDataPage() {
  const { isAuthenticated } = useAuth();

  const { data: prs, isLoading, error } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading stored data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error loading stored data: {error.message}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const analyzedPRs = prs?.filter(pr => pr.aiSuggestions) || [];
  const totalPRs = prs?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                  <Database className="h-8 w-8 text-gray-600" />
                  Stored Data
                </h1>
                <p className="text-gray-600">
                  View historical analysis results and webhook data
                </p>
              </div>
              <div className="flex items-center gap-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{totalPRs}</div>
                  <div className="text-sm text-gray-500 uppercase">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{analyzedPRs.length}</div>
                  <div className="text-sm text-gray-500 uppercase">Analyzed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <BrutalistCard
            title="Total PRs"
            content="All stored pull requests"
            variant="default"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{totalPRs}</div>
              <div className="text-sm text-gray-600 uppercase font-bold">Pull Requests</div>
            </div>
          </BrutalistCard>
          
          <BrutalistCard
            title="AI Analyzed"
            content="PRs with AI analysis"
            variant="green"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{analyzedPRs.length}</div>
              <div className="text-sm text-gray-600 uppercase font-bold">Analyzed</div>
            </div>
          </BrutalistCard>
          
          <BrutalistCard
            title="Completed"
            content="Finished analysis"
            variant="purple"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {prs?.filter(pr => pr.aiSuggestions?.analysisStatus === 'completed').length || 0}
              </div>
              <div className="text-sm text-gray-600 uppercase font-bold">Complete</div>
            </div>
          </BrutalistCard>
          
          <BrutalistCard
            title="Repositories"
            content="Unique repositories"
            variant="orange"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {new Set(prs?.map(pr => pr.repo)).size || 0}
              </div>
              <div className="text-sm text-gray-600 uppercase font-bold">Repos</div>
            </div>
          </BrutalistCard>
        </div>

        {/* Stored PRs Table */}
        <BrutalistCard
          title="Stored Pull Requests"
          content="Historical analysis results and webhook data"
          variant="default"
          className="w-full max-w-none"
        >
          <div className="flex items-center gap-4 mb-6">
            <GitPullRequest className="h-8 w-8 text-gray-600" />
            <div className="flex gap-2">
              <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">DATABASE</Badge>
              <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">STORED</Badge>
            </div>
          </div>
            {totalPRs === 0 ? (
              <div className="text-center py-12">
                <Database className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Stored Data</h3>
                <p className="text-gray-500 mb-6">
                  Pull requests will appear here after webhook events or manual analysis.
                </p>
                <Link to="/pull-requests">
                  <Button>
                    <GitPullRequest className="h-4 w-4 mr-2" />
                    Browse Pull Requests
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-3 border-gray-600 bg-gray-100">
                      <th className="text-left py-4 px-6 font-bold text-black uppercase">PR</th>
                      <th className="text-left py-4 px-6 font-bold text-black uppercase">Repository</th>
                      <th className="text-left py-4 px-6 font-bold text-black uppercase">Author</th>
                      <th className="text-left py-4 px-6 font-bold text-black uppercase">Created</th>
                      <th className="text-left py-4 px-6 font-bold text-black uppercase">Analysis</th>
                      <th className="text-left py-4 px-6 font-bold text-black uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs?.map((pr) => (
                      <tr key={pr.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-bold text-black">#{pr.number}</div>
                            <div className="text-sm text-gray-700 max-w-xs truncate font-medium">
                              {pr.title}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <code className="text-xs bg-gray-200 text-black px-2 py-1 font-bold border-2 border-gray-600">
                            {pr.repo}
                          </code>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-sm text-black font-medium">
                            <User className="h-4 w-4" />
                            {pr.author}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-sm text-black font-medium">
                            <Calendar className="h-4 w-4" />
                            {new Date(pr.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {pr.aiSuggestions ? (
                            <Badge className="bg-green-600 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
                              <Brain className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-400 text-white px-3 py-1 text-xs font-bold border-2 border-gray-800">
                              No Analysis
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {pr.aiSuggestions && (
                              <Link
                                to="/analysis"
                                search={{ repo: pr.repo, number: pr.number }}
                              >
                                <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-800 font-bold">
                                  View Analysis
                                </Button>
                              </Link>
                            )}
                            <a
                              href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
                            >
                              GitHub <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </BrutalistCard>
        </div>
      </section>
    </div>
  );
}
