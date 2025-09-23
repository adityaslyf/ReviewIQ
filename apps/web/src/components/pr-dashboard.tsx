import { useQuery } from "@tanstack/react-query";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { ExternalLink, GitPullRequest, User, Calendar, Brain, Wrench, AlertTriangle, CheckCircle, XCircle, Info, Zap, Search } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { toast } from "sonner";
import { useAuth } from "../contexts/auth-context";
import { CodeSuggestionsList } from "./code-suggestion";
import { AnalysisSections } from "./analysis-sections";
import { apiCall } from "@/lib/api";

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
  const response = await apiCall("/api/pull-requests-with-ai");
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json();
}

async function fetchGitHubPRs(owner: string, repo: string, userToken: string): Promise<PullRequest[]> {
  const response = await apiCall(`/api/github/pull-requests?owner=${owner}&repo=${repo}`, {
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
  const [source, setSource] = useState<"stored" | "github">("stored");
  const [selectedKey, setSelectedKey] = useState<{ repo: string; number: number } | null>(null);

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
      const response = await apiCall("/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo: repoName,
          prNumber: pr.number,
          userToken: token,
          enableStaticAnalysis: true,  // Enable static analysis for comprehensive review
          enableSandboxValidation: true  // Enable sandbox validation for tested fixes
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

  const displayedPRs: PullRequest[] = source === 'github' ? filteredGithubPRs : (prs || []);

  const selectedStoredPR: PullRequest | undefined = (() => {
    if (!selectedKey) return undefined;
    if (source === 'stored') return (prs || []).find(p => p.repo === selectedKey.repo && p.number === selectedKey.number);
    // source === 'github' → find matching stored PR for analysis details
    return (prs || []).find(p => p.repo === selectedKey.repo && p.number === selectedKey.number);
  })();

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
                          {aiSuggestions.analysisMode === "static-enhanced" ? "Static Enhanced" : "Enhanced"}
                        </Badge>
                </div>

                {/* Overview */}
                {aiSuggestions.detailedAnalysis?.overview && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Technical Overview
                      {aiSuggestions.analysisMode === "static-enhanced" && (
                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                          <Zap className="h-3 w-3 mr-1" />
                          Static Analysis
                        </Badge>
                      )}
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
    <div className="h-full bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <GitPullRequest className="h-6 w-6 text-blue-600" />
              Pull Request Dashboard
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {displayedPRs.length} Total PRs
              </Badge>
              {analyzingPRs.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                  Analyzing {analyzingPRs.size}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Left Sidebar - Controls */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Sidebar
            source={source}
            onSourceChange={setSource}
            selectedRepo={selectedRepo}
            onRepoSelect={(repo) => {
              handleRepoSelect(repo);
              setSelectedKey(null);
            }}
            onFetchPRs={handleFetchGitHubPRs}
            isFetchingPRs={isFetchingPRs}
            prFilter={prFilter}
            onFilterChange={setPrFilter}
            selectedPRs={selectedPRs}
            analyzingPRs={analyzingPRs}
            onAnalyzeSelected={handleAnalyzeSelected}
            onClearSelection={() => {
              setSelectedPRs(new Set());
              toast.message('Selection cleared');
            }}
            onRefresh={refetch}
            storedCount={prs?.length || 0}
            githubCount={filteredGithubPRs.length}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* PR List Section */}
          <div className="flex-1 bg-white">
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  {source === 'github' ? (
                    <>
                      <GitPullRequest className="h-5 w-5 text-green-600" />
                      GitHub Pull Requests
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="h-5 w-5 text-blue-600" />
                      Stored Pull Requests
                    </>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search PRs..."
                      className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PR Grid/List */}
            <div className="flex-1 overflow-y-auto p-6">
              {isFetchingPRs && source === 'github' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-6 animate-pulse bg-gray-50 rounded-lg border">
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-3" />
                      <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-1/4 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : displayedPRs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <GitPullRequest className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No Pull Requests</h3>
                    <p className="text-gray-500 mb-4 max-w-md">
                      {source === 'github' 
                        ? 'Select a repository from the sidebar and fetch PRs to get started with AI analysis' 
                        : 'No stored pull requests found. PRs will appear here after webhook events or manual analysis'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displayedPRs.map((pr) => {
                    const isSelected = selectedKey && pr.repo === selectedKey.repo && pr.number === selectedKey.number;
                    return (
                      <div
                        key={`${pr.repo}-${pr.number}`}
                        onClick={() => setSelectedKey({ repo: pr.repo, number: pr.number })}
                        className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <GitPullRequest className="h-4 w-4 text-green-600 flex-shrink-0" />
                            {pr.aiSuggestions && (
                              <Badge variant="default" className="bg-green-500 text-white text-xs">
                                AI Analyzed
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {source === 'github' && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedPRs.has(pr.number)}
                                  onCheckedChange={() => handleToggleSelect(pr.number)}
                                  aria-label={`Select PR #${pr.number}`}
                                />
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">
                              #{pr.number}
                            </Badge>
                          </div>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
                          {pr.title}
                        </h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{pr.author}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {pr.repo}
                            </code>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <a
                            href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            View on GitHub <ExternalLink className="h-3 w-3" />
                          </a>
                          
                          {source === 'github' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzePR(pr);
                              }}
                              disabled={analyzingPRs.has(pr.number)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              {analyzingPRs.has(pr.number) ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-3 w-3" />
                                  Analyze
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Analysis Results Section */}
          {selectedKey && (
            <div className="h-1/2 bg-white border-t border-gray-200">
              {/* Section Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI Analysis Results
                    <Badge variant="outline" className="text-xs">
                      {selectedKey.repo} #{selectedKey.number}
                    </Badge>
                  </h2>
                  <button
                    onClick={() => setSelectedKey(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Analysis Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedStoredPR ? (
                  <div className="max-w-none">
                    {renderAIAnalysis(selectedStoredPR)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
                      <p className="text-gray-600 mb-4 max-w-md">
                        This pull request hasn't been analyzed yet. 
                        {source === 'github' && ' Click the "Analyze" button on the PR card to generate AI insights.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
