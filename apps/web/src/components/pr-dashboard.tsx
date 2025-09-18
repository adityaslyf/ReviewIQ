import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ExternalLink, GitPullRequest, User, Calendar, Search, Github, Brain, Wrench, AlertTriangle } from "lucide-react";
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
  aiSuggestions?: {
    id: number;
    summary: string;
    refactorSuggestions: string;
    potentialIssues: string;
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
  const [activeTab, setActiveTab] = useState<"refactor" | "issues">("refactor");
  const [analyzingPRs, setAnalyzingPRs] = useState<Set<number>>(new Set());

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

  const handleAnalyzePR = async (pr: PullRequest) => {
    if (!selectedRepo) return;

    setAnalyzingPRs(prev => new Set(prev).add(pr.number));
    
    try {
      const response = await fetch("http://localhost:3000/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: selectedRepo.owner,
          repo: selectedRepo.repo,
          prNumber: pr.number
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze PR");
      }

      await response.json();
      
      // Refresh the stored PRs to show the new analysis
      refetch();
      
      alert(`AI analysis completed for PR #${pr.number}! Check the "Stored Pull Requests" section to see the suggestions.`);
      
    } catch (error) {
      console.error("Failed to analyze PR:", error);
      alert(`Failed to analyze PR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnalyzingPRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(pr.number);
        return newSet;
      });
    }
  };

  const renderAIAnalysis = (pr: PullRequest) => {
    if (!pr.aiSuggestions) {
      return (
        <div className="text-sm text-gray-500 italic">
          AI analysis pending... (Phase 2 feature)
        </div>
      );
    }

    const { aiSuggestions } = pr;
    
    return (
      <div className="space-y-4">
        {/* AI Summary */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">AI Summary</span>
            <Badge variant="secondary" className="text-xs">
              {aiSuggestions.analysisStatus}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            {aiSuggestions.summary}
          </p>
        </div>

        {/* Tabs for Refactor Suggestions and Potential Issues */}
        <div>
          <div className="flex border-b border-gray-200 mb-3">
            <button
              onClick={() => setActiveTab("refactor")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "refactor"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Wrench className="h-4 w-4 inline mr-1" />
              Refactor Suggestions
            </button>
            <button
              onClick={() => setActiveTab("issues")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "issues"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Potential Issues
            </button>
          </div>

          <div className="min-h-[100px]">
            {activeTab === "refactor" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Refactoring Suggestions</span>
                </div>
                <div className="text-sm text-gray-600 bg-green-50 p-3 rounded whitespace-pre-line">
                  {aiSuggestions.refactorSuggestions}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Potential Issues</span>
                </div>
                <div className="text-sm text-gray-600 bg-red-50 p-3 rounded whitespace-pre-line">
                  {aiSuggestions.potentialIssues}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
          <div className="mt-2 text-xs text-gray-500">
            💡 Tip: You can analyze any public repository's pull requests for AI suggestions
          </div>
        </CardContent>
      </Card>

      {/* Display GitHub PRs if fetched */}
      {githubPRs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Pull Requests ({githubPRs.length})
            </h3>
            <button
              onClick={() => {
                githubPRs.forEach(pr => handleAnalyzePR(pr));
              }}
              disabled={analyzingPRs.size > 0}
              className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Brain className="h-4 w-4" />
              Analyze All PRs
            </button>
          </div>
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
                    
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleAnalyzePR(pr)}
                        disabled={analyzingPRs.has(pr.number)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {analyzingPRs.has(pr.number) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4" />
                            Get AI Suggestions
                          </>
                        )}
                      </button>
                      
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
                    
                        {renderAIAnalysis(pr)}
                    
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
