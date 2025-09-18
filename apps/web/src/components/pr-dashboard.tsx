import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { ExternalLink, GitPullRequest, User, Calendar, Github, Brain, Wrench, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useState } from "react";
import { RepoSelector } from "./repo-selector";
import { toast } from "sonner";
import { useAuth } from "../contexts/auth-context";
import { CodeSuggestionsList } from "./code-suggestion";
import { AnalysisSections } from "./analysis-sections";

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
    detailedAnalysis?: {
      overview: string;
      codeSuggestions: Array<{
        file: string;
        line?: number;
        original: string;
        suggested: string;
        reason: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        category: string;
      }>;
      securityConcerns: string[];
      performanceImpact: string;
      testingRecommendations: string[];
      architecturalNotes: string[];
    };
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

// Format AI suggestions for better display
function formatAISuggestions(text: string) {
  // Split the text into sections based on common patterns
  const sections = text.split(/(?=\*\*[^*]+\*\*)/g).filter(section => section.trim());
  
  return sections.map((section, index) => {
    const trimmedSection = section.trim();
    
    // Check if it's a header (starts with **)
    if (trimmedSection.startsWith('**') && trimmedSection.includes('**')) {
      const headerMatch = trimmedSection.match(/^\*\*([^*]+)\*\*/);
      const header = headerMatch ? headerMatch[1] : '';
      const content = trimmedSection.replace(/^\*\*[^*]+\*\*:?\s*/, '');
      
      // Determine icon and color based on content
      let icon = <Info className="h-4 w-4" />;
      let iconColor = "text-blue-500";
      let bgColor = "bg-blue-50";
      let borderColor = "border-blue-200";
      
      if (header.toLowerCase().includes('high')) {
        icon = <XCircle className="h-4 w-4" />;
        iconColor = "text-red-500";
        bgColor = "bg-red-50";
        borderColor = "border-red-200";
      } else if (header.toLowerCase().includes('medium')) {
        icon = <AlertTriangle className="h-4 w-4" />;
        iconColor = "text-orange-500";
        bgColor = "bg-orange-50";
        borderColor = "border-orange-200";
      } else if (header.toLowerCase().includes('low')) {
        icon = <CheckCircle className="h-4 w-4" />;
        iconColor = "text-green-500";
        bgColor = "bg-green-50";
        borderColor = "border-green-200";
      }
      
      return (
        <div key={index} className={`border ${borderColor} ${bgColor} rounded-lg p-4 mb-3`}>
          <div className="flex items-start gap-2 mb-2">
            <span className={iconColor}>{icon}</span>
            <h4 className="font-semibold text-gray-900">{header}</h4>
          </div>
          {content && (
            <p className="text-sm text-gray-700 leading-relaxed ml-6">
              {content}
            </p>
          )}
        </div>
      );
    } else {
      // Regular content without header
      return (
        <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {trimmedSection}
          </p>
        </div>
      );
    }
  });
}

export function PRDashboard() {
  const { isAuthenticated } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [githubPRs, setGithubPRs] = useState<PullRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"refactor" | "issues" | "detailed">("refactor");
  const [analyzingPRs, setAnalyzingPRs] = useState<Set<number>>(new Set());
  const [isFetchingPRs, setIsFetchingPRs] = useState(false);
  const [selectedPRs, setSelectedPRs] = useState<Set<number>>(new Set());
  const [prFilter, setPrFilter] = useState<"all" | "open" | "closed">("all");

  const { data: prs, isLoading, error, refetch } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000, // Refetch every 5 seconds
    enabled: isAuthenticated, // Only run query when authenticated
  });


  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setGithubPRs([]); // Clear previous PRs when selecting new repo
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">
                {aiSuggestions.summary}
              </p>
            </div>
          </div>
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
            {aiSuggestions.detailedAnalysis && (
              <button
                onClick={() => setActiveTab("detailed")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "detailed"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Brain className="h-4 w-4 inline mr-1" />
                Deep Analysis
              </button>
            )}
          </div>

          <div className="min-h-[100px]">
            {activeTab === "refactor" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Refactoring Suggestions</span>
                </div>
                <div className="space-y-2">
                  {formatAISuggestions(aiSuggestions.refactorSuggestions)}
                </div>
              </div>
            ) : activeTab === "issues" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Potential Issues</span>
                </div>
                <div className="space-y-2">
                  {formatAISuggestions(aiSuggestions.potentialIssues)}
                </div>
              </div>
            ) : activeTab === "detailed" && aiSuggestions.detailedAnalysis ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">CodeRabbit-Style Deep Analysis</span>
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    Enhanced
                  </Badge>
                </div>

                {/* Overview */}
                {aiSuggestions.detailedAnalysis?.overview && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Technical Overview
                    </h4>
                    <p className="text-sm text-purple-800 leading-relaxed">
                      {aiSuggestions.detailedAnalysis?.overview}
                    </p>
                  </div>
                )}

                {/* Code Suggestions with Professional UI */}
                <CodeSuggestionsList 
                  suggestions={aiSuggestions.detailedAnalysis?.codeSuggestions || []}
                  theme="light"
                />

                {/* Professional Analysis Sections */}
                <AnalysisSections
                  securityConcerns={aiSuggestions.detailedAnalysis?.securityConcerns}
                  performanceImpact={aiSuggestions.detailedAnalysis?.performanceImpact}
                  testingRecommendations={aiSuggestions.detailedAnalysis?.testingRecommendations}
                  architecturalNotes={aiSuggestions.detailedAnalysis?.architecturalNotes}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a tab to view analysis details</p>
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
      {/* Header */}
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

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Repo selector */}
        <div className="lg:col-span-4">
          <RepoSelector
            onRepoSelect={handleRepoSelect}
            selectedRepo={selectedRepo}
            onFetchPRs={handleFetchGitHubPRs}
            isFetchingPRs={isFetchingPRs}
          />
        </div>

        {/* Main: PR workspace */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls row: filters + actions */}
          {selectedRepo && (
            <Card>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Filter:</span>
                  <div className="flex rounded-md border">
                    <button
                      onClick={() => setPrFilter('all')}
                      className={`px-3 py-1 text-sm ${prFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >All</button>
                    <button
                      onClick={() => setPrFilter('open')}
                      className={`px-3 py-1 text-sm border-l ${prFilter === 'open' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >Open</button>
                    <button
                      onClick={() => setPrFilter('closed')}
                      className={`px-3 py-1 text-sm border-l ${prFilter === 'closed' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >Closed</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAnalyzeSelected}
                    disabled={selectedPRs.size === 0 || analyzingPRs.size > 0}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Brain className="h-4 w-4" />
                    Analyze Selected ({selectedPRs.size})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPRs(new Set());
                      toast.message('Selection cleared');
                    }}
                    disabled={selectedPRs.size === 0}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Clear Selection
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* GitHub PRs list */}
          {selectedRepo && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  GitHub Pull Requests ({filteredGithubPRs.length})
                </h3>
                <div className="flex items-center gap-2">
                  {analyzingPRs.size > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Analyzing {analyzingPRs.size} PR{analyzingPRs.size > 1 ? 's' : ''}
                    </Badge>
                  )}
                  <button
                    onClick={() => { filteredGithubPRs.forEach(pr => handleAnalyzePR(pr)); }}
                    disabled={analyzingPRs.size > 0 || filteredGithubPRs.length === 0}
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
                </div>
              </div>

              {/* Skeletons while fetching */}
              {isFetchingPRs && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse bg-gray-50">
                      <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
                      <div className="h-3 w-1/3 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-1/4 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {!isFetchingPRs && (
                <div className="grid gap-4">
                  {filteredGithubPRs.map((pr) => (
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
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedPRs.has(pr.number)}
                              onCheckedChange={() => handleToggleSelect(pr.number)}
                              aria-label={`Select PR #${pr.number}`}
                            />
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
              )}
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
      </div>
    </div>
  );
}
