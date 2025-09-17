import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ExternalLink, GitPullRequest, User, Calendar, Search, Github } from "lucide-react";
import { useState } from "react";

interface PullRequest {
  id: number;
  repo: string;
  number: number;
  title: string;
  author: string;
  summary: string | null;
  createdAt: string;
  url?: string;
  state?: string;
  body?: string;
}

async function fetchPullRequests(): Promise<PullRequest[]> {
  const response = await fetch("http://localhost:3000/api/pull-requests");
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json();
}

async function fetchGitHubPRs(owner: string, repo: string): Promise<PullRequest[]> {
  const response = await fetch(`http://localhost:3000/api/github/pull-requests?owner=${owner}&repo=${repo}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch GitHub pull requests");
  }
  return response.json();
}

export function PRDashboard() {
  const [repoInput, setRepoInput] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [isFetchingGitHub, setIsFetchingGitHub] = useState(false);
  const [githubPRs, setGithubPRs] = useState<PullRequest[]>([]);

  const { data: prs, isLoading, error, refetch } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const handleFetchGitHubPRs = async () => {
    if (!repoInput.trim()) return;
    
    const [owner, repo] = repoInput.trim().split("/");
    if (!owner || !repo) {
      alert("Please enter repository in format: owner/repo");
      return;
    }

    setIsFetchingGitHub(true);
    try {
      const githubPRs = await fetchGitHubPRs(owner, repo);
      setGithubPRs(githubPRs);
      setSelectedRepo({ owner, repo });
    } catch (error) {
      console.error("Failed to fetch GitHub PRs:", error);
      alert(`Failed to fetch PRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingGitHub(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading pull requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error loading pull requests: {error.message}</p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pull Requests Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{prs?.length || 0} PRs</Badge>
          <button 
            onClick={() => refetch()}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Refresh
          </button>
          <button 
            onClick={async () => {
              try {
                await fetch("http://localhost:3000/test-webhook", { method: "POST" });
                refetch();
              } catch (error) {
                console.error("Test webhook failed:", error);
              }
            }}
            className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
          >
            Test Webhook
          </button>
        </div>
      </div>

      {/* GitHub Repository Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Fetch PRs from GitHub Repository
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter repository (e.g., facebook/react)"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleFetchGitHubPRs()}
            />
            <button
              onClick={handleFetchGitHubPRs}
              disabled={isFetchingGitHub || !repoInput.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isFetchingGitHub ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isFetchingGitHub ? "Fetching..." : "Fetch PRs"}
            </button>
          </div>
          {selectedRepo && (
            <div className="mt-2 text-sm text-gray-600">
              Showing PRs from: <code className="bg-gray-100 px-2 py-1 rounded">{selectedRepo.owner}/{selectedRepo.repo}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display GitHub PRs if fetched */}
      {githubPRs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Pull Requests ({githubPRs.length})
          </h3>
          <div className="grid gap-4">
            {githubPRs.map((pr) => (
              <Card key={pr.id} className="hover:shadow-md transition-shadow border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <GitPullRequest className="h-5 w-5 text-green-500" />
                        {pr.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {pr.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{pr.number}</Badge>
                      <Badge variant="secondary">{pr.state}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Repository:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{pr.repo}</code>
                    </div>
                    
                    {pr.body && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                          {pr.body.substring(0, 200)}{pr.body.length > 200 ? "..." : ""}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <a
                        href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View on GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Display Database PRs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GitPullRequest className="h-5 w-5" />
          Stored Pull Requests ({prs?.length || 0})
        </h3>
        
        {!prs || prs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <GitPullRequest className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stored Pull Requests Yet</h3>
              <p className="text-gray-500 mb-4">
                Create a pull request in a repository connected to your GitHub App to see it here.
              </p>
              <div className="text-sm text-gray-400">
                <p>Make sure your GitHub App webhook is configured correctly.</p>
                <p>Webhook URL should point to: <code className="bg-gray-100 px-2 py-1 rounded">http://your-domain/webhook</code></p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {prs.map((pr) => (
              <Card key={pr.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <GitPullRequest className="h-5 w-5 text-blue-500" />
                        {pr.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {pr.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">#{pr.number}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Repository:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{pr.repo}</code>
                    </div>
                    
                    {pr.summary ? (
                      <div>
                        <span className="text-sm font-medium">AI Summary:</span>
                        <p className="text-sm text-gray-600 mt-1 bg-blue-50 p-3 rounded">
                          {pr.summary}
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        AI analysis pending... (Phase 2 feature)
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <a
                        href={`https://github.com/${pr.repo}/pull/${pr.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View on GitHub
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
