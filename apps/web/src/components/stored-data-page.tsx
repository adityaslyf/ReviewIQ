import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Database, ArrowLeft, GitPullRequest, Brain, Calendar, User } from "lucide-react";
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
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Database className="h-8 w-8 text-amber-600" />
                    Stored Data
                  </h1>
                  <p className="mt-1 text-gray-600">
                    View historical analysis results and webhook data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{totalPRs} Total Records</Badge>
                <Badge variant="outline">{analyzedPRs.length} Analyzed</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{totalPRs}</div>
              <div className="text-sm text-gray-600">Total PRs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{analyzedPRs.length}</div>
              <div className="text-sm text-gray-600">AI Analyzed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {prs?.filter(pr => pr.aiSuggestions?.analysisStatus === 'completed').length || 0}
              </div>
              <div className="text-sm text-gray-600">Completed Analysis</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-amber-600">
                {new Set(prs?.map(pr => pr.repo)).size || 0}
              </div>
              <div className="text-sm text-gray-600">Repositories</div>
            </CardContent>
          </Card>
        </div>

        {/* Stored PRs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Stored Pull Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">PR</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Repository</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Analysis</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs?.map((pr) => (
                      <tr key={pr.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">#{pr.number}</div>
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {pr.title}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {pr.repo}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-3 w-3" />
                            {pr.author}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {new Date(pr.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {pr.aiSuggestions ? (
                            <Badge variant="default" className="bg-green-500 text-white text-xs">
                              <Brain className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No Analysis
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {pr.aiSuggestions && (
                              <Link
                                to="/analysis"
                                search={{ repo: pr.repo, number: pr.number }}
                              >
                                <Button variant="outline" size="sm" className="text-xs">
                                  View Analysis
                                </Button>
                              </Link>
                            )}
                            <a
                              href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="text-xs">
                                GitHub
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
}
