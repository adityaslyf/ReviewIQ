import { useQuery } from "@tanstack/react-query";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { 
  ExternalLink, 
  GitPullRequest, 
  User, 
  Calendar, 
  Zap, 
  Search,
  ArrowLeft,
  Brain,
  Github,
  Database
} from "lucide-react";
import { useState } from "react";
import { RepoSelector } from "./repo-selector";
import { toast } from "sonner";
import { useAuth } from "../contexts/auth-context";
import { Link, useNavigate } from "@tanstack/react-router";

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
    analysisMode?: string;
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

export function PRBrowsePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [githubPRs, setGithubPRs] = useState<PullRequest[]>([]);
  const [analyzingPRs, setAnalyzingPRs] = useState<Set<number>>(new Set());
  const [isFetchingPRs, setIsFetchingPRs] = useState(false);
  const [selectedPRs, setSelectedPRs] = useState<Set<number>>(new Set());
  const [prFilter, setPrFilter] = useState<"all" | "open" | "closed">("all");
  const [source, setSource] = useState<"stored" | "github">("stored");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: prs, isLoading, error, refetch } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000,
    enabled: isAuthenticated,
  });

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setGithubPRs([]);
    setSelectedPRs(new Set());
  };

  const handleFetchGitHubPRs = async (repo: Repository) => {
    setIsFetchingPRs(true);
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        toast.error('Please sign in again to access your repositories');
        return;
      }

      const [owner, repoName] = repo.full_name.split('/');
      const githubPRs = await fetchGitHubPRs(owner, repoName, token);
      setGithubPRs(githubPRs);
      setSelectedPRs(new Set());
      toast.success(`Fetched ${githubPRs.length} PRs from ${repo.full_name}`);
    } catch (error) {
      console.error("Failed to fetch GitHub PRs:", error);
      toast.error(`Failed to fetch PRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        toast.error('Please sign in again to analyze pull requests');
        return;
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
          userToken: token,
          enableStaticAnalysis: true,
          enableSandboxValidation: true  // Enable sandbox validation for tested fixes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze PR");
      }

      await response.json();
      refetch();
      toast.success(`AI analysis completed for PR #${pr.number}`);
      
    } catch (error) {
      console.error("Failed to analyze PR:", error);
      toast.error(`Failed to analyze PR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAnalyzingPRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(pr.number);
        return newSet;
      });
    }
  };

  const handleToggleSelect = (prNumber: number) => {
    setSelectedPRs(prev => {
      const next = new Set(prev);
      if (next.has(prNumber)) next.delete(prNumber); else next.add(prNumber);
      return next;
    });
  };

  const handleAnalyzeSelected = async () => {
    if (!selectedRepo || selectedPRs.size === 0) return;
    const numbers = Array.from(selectedPRs);
    toast.info(`Starting analysis for ${numbers.length} selected PR${numbers.length > 1 ? 's' : ''}...`);
    for (const num of numbers) {
      const pr = githubPRs.find(p => p.number === num);
      if (pr) {
        await handleAnalyzePR(pr);
      }
    }
    setSelectedPRs(new Set());
  };

  const filteredGithubPRs = githubPRs.filter(pr => prFilter === 'all' || (pr.state || '').toLowerCase() === prFilter);
  const displayedPRs: PullRequest[] = source === 'github' ? filteredGithubPRs : (prs || []);
  
  // Apply search filter
  const searchFilteredPRs = displayedPRs.filter(pr => 
    searchTerm === "" || 
    pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pr.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pr.repo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-2 text-gray-300">Loading pull requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-400 mb-4">Error loading pull requests: {error.message}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <GitPullRequest className="h-8 w-8 text-green-400" />
                    Pull Requests
                  </h1>
                  <p className="mt-1 text-gray-300">
                    Browse and analyze pull requests from GitHub repositories
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-gray-300 border-gray-600">{searchFilteredPRs.length} PRs</Badge>
                {analyzingPRs.size > 0 && (
                  <Badge className="bg-purple-600 text-white">Analyzing {analyzingPRs.size}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <div className="space-y-6">
              {/* Source Selection */}
              <Card className="bg-black border border-gray-700">
                <CardContent className="p-4">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-400" />
                    Data Source
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={source === 'stored' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSource('stored')}
                      className={`text-xs ${source === 'stored' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                    >
                      <Database className="h-3 w-3 mr-1" />
                      Stored
                    </Button>
                    <Button
                      variant={source === 'github' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSource('github')}
                      className={`text-xs ${source === 'github' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                    >
                      <Github className="h-3 w-3 mr-1" />
                      GitHub
                    </Button>
                  </div>
                  <div className="mt-3 text-xs text-gray-300 space-y-1 bg-gray-800 p-2 rounded">
                    <div className="font-medium">Stored: {prs?.length || 0}</div>
                    <div className="font-medium">GitHub: {filteredGithubPRs.length}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Repository Selection */}
              {source === 'github' && (
                <Card className="bg-black border border-gray-700">
                  <CardContent className="p-4">
                    <RepoSelector
                      onRepoSelect={handleRepoSelect}
                      selectedRepo={selectedRepo}
                      onFetchPRs={handleFetchGitHubPRs}
                      isFetchingPRs={isFetchingPRs}
                      compact
                    />
                  </CardContent>
                </Card>
              )}

              {/* Filters */}
              <Card className="bg-black border border-gray-700">
                <CardContent className="p-4">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Filters
                  </h3>
                  <div className="grid grid-cols-3 gap-1">
                    {(['all', 'open', 'closed'] as const).map((filter) => (
                      <Button
                        key={filter}
                        variant={prFilter === filter ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPrFilter(filter)}
                        className={`text-xs ${prFilter === filter ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-800'}`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {source === 'github' && (
                <Card className="bg-black border border-gray-700">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-400" />
                      Actions
                    </h3>
                    <div className="space-y-2">
                      <Button
                        onClick={handleAnalyzeSelected}
                        disabled={selectedPRs.size === 0 || analyzingPRs.size > 0}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
                        size="sm"
                      >
                        <Brain className="h-3 w-3 mr-2" />
                        Analyze Selected ({selectedPRs.size})
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedPRs(new Set())}
                        disabled={selectedPRs.size === 0}
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 disabled:text-gray-500"
                        size="sm"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pull requests by title, author, or repository..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 text-white placeholder-gray-400 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* PR Grid */}
            {isFetchingPRs && source === 'github' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-6 animate-pulse bg-gray-900 rounded-lg border border-gray-700">
                    <div className="h-4 w-3/4 bg-gray-700 rounded mb-3" />
                    <div className="h-3 w-1/2 bg-gray-700 rounded mb-2" />
                    <div className="h-3 w-1/4 bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : searchFilteredPRs.length === 0 ? (
              <div className="text-center py-12">
                <GitPullRequest className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  {searchTerm ? 'No matching pull requests' : 'No pull requests found'}
                </h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters'
                    : source === 'github' 
                      ? 'Select a repository and fetch PRs to get started' 
                      : 'No stored pull requests found'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchFilteredPRs.map((pr) => (
                  <Card key={`${pr.repo}-${pr.number}`} className="hover:shadow-lg transition-shadow border border-gray-700 bg-black">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <GitPullRequest className="h-4 w-4 text-green-400" />
                          {pr.aiSuggestions && (
                            <Badge className="bg-green-600 text-white text-xs">
                              AI ✓
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {source === 'github' && (
                            <Checkbox
                              checked={selectedPRs.has(pr.number)}
                              onCheckedChange={() => handleToggleSelect(pr.number)}
                            />
                          )}
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">#{pr.number}</Badge>
                        </div>
                      </div>

                      <h3 className="font-semibold text-white mb-3 line-clamp-2">
                        {pr.title}
                      </h3>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <User className="h-3 w-3" />
                          <span>{pr.author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <code className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-600">
                            {pr.repo}
                          </code>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <a
                          href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                        
                        <div className="flex items-center gap-2">
                          {pr.aiSuggestions && (
                            <Button
                              onClick={() => navigate({ 
                                to: "/analysis", 
                                search: { repo: pr.repo, number: pr.number } 
                              })}
                              variant="outline"
                              size="sm"
                              className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              <Brain className="h-3 w-3 mr-1" />
                              View Analysis
                            </Button>
                          )}
                          
                          {source === 'github' && (
                            <Button
                              onClick={() => handleAnalyzePR(pr)}
                              disabled={analyzingPRs.has(pr.number)}
                              size="sm"
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600"
                            >
                              {analyzingPRs.has(pr.number) ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3 w-3 mr-1" />
                                  Analyze
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
