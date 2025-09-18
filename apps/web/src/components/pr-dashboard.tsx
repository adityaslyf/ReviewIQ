import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ExternalLink, GitPullRequest, User, Calendar, Github, Brain, Wrench, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { RepoSelector } from "./repo-selector";

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

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

async function fetchPullRequests(): Promise<PullRequest[]> {
  const response = await fetch("http://localhost:3000/api/pull-requests-with-ai");
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json();
}

async function fetchGitHubPRs(owner: string, repo: string, userToken: string): Promise<PullRequest[]> {
  const response = await fetch(`http://localhost:3000/api/github/pull-requests?owner=${owner}&repo=${repo}`, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch GitHub pull requests");
  }
  return response.json();
}

export function PRDashboard() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [githubPRs, setGithubPRs] = useState<PullRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"refactor" | "issues">("refactor");
  const [analyzingPRs, setAnalyzingPRs] = useState<Set<number>>(new Set());
  const [isFetchingPRs, setIsFetchingPRs] = useState(false);

  const { data: prs, isLoading, error, refetch } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setGithubPRs([]); // Clear previous PRs when selecting new repo
  };

  const handleFetchGitHubPRs = async (repo: Repository) => {
    setIsFetchingPRs(true);
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      const [owner, repoName] = repo.full_name.split('/');
      const githubPRs = await fetchGitHubPRs(owner, repoName, token);
      setGithubPRs(githubPRs);
    } catch (error) {
      console.error("Failed to fetch GitHub PRs:", error);
      alert(`Failed to fetch PRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingPRs(false);
    }
  };

  const handleAnalyzePR = async (pr: PullRequest) => {
    if (!selectedRepo) return;

    setAnalyzingPRs(prev => new Set(prev).add(pr.number));
    
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      const [owner, repoName] = selectedRepo.full_name.split('/');
      const response = await fetch("http://localhost:3000/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo: repoName,
          prNumber: pr.number,
          userToken: token
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

      {/* Repository Selection */}
      <RepoSelector 
        onRepoSelect={handleRepoSelect}
        selectedRepo={selectedRepo}
        onFetchPRs={handleFetchGitHubPRs}
        isFetchingPRs={isFetchingPRs}
      />

      {/* Display GitHub PRs if fetched */}
      {githubPRs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Pull Requests ({githubPRs.length})
            </h3>
            <div className="flex items-center gap-2">
              {analyzingPRs.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Analyzing {analyzingPRs.size} PR{analyzingPRs.size > 1 ? 's' : ''}
                </Badge>
              )}
              <button
                onClick={() => {
                  githubPRs.forEach(pr => handleAnalyzePR(pr));
                }}
                disabled={analyzingPRs.size > 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {analyzingPRs.size > 0 ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Analyze All PRs
                  </>
                )}
              </button>
              <button
                onClick={() => refetch()}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Analysis Status Message */}
          {githubPRs.length > 0 && analyzingPRs.size === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Ready for AI Analysis</span>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <p>Choose your analysis approach:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Individual Analysis:</strong> Click "Analyze PR #X" on specific pull requests</li>
                  <li><strong>Bulk Analysis:</strong> Click "Analyze All PRs" to analyze all at once</li>
                </ul>
              </div>
            </div>
          )}
          
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
                      {pr.aiSuggestions && (
                        <Badge variant="default" className="bg-green-500 text-white">
                          ✓ Analyzed
                        </Badge>
                      )}
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
                    
                    <div className="space-y-3">
                      {/* Analysis Button */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleAnalyzePR(pr)}
                          disabled={analyzingPRs.has(pr.number)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                          {analyzingPRs.has(pr.number) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Analyzing PR #{pr.number}...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4" />
                              Analyze PR #{pr.number}
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* GitHub Link */}
                      <div className="flex justify-center">
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
