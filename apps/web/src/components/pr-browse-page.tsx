import { useQuery } from "@tanstack/react-query";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { BrutalistCard } from "./brutalist-card";
import { 
  ExternalLink, 
  GitPullRequest, 
  User, 
  Calendar, 
  Zap, 
  Search,
  Brain,
  Github,
  Database
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { RepoSelector } from "./repo-selector";
import { toast } from "sonner";
import { useAuth } from "../contexts/auth-context";
import { useNavigate } from "@tanstack/react-router";
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
  const hasLoggedInitialStatus = useRef(false);
  const previousVectorStatus = useRef<{isInitialized: boolean; isInitializing: boolean; progress?: {stage: string; percentage: number; current: number; total: number; startTime: string; estimatedCompletion?: string}} | null>(null);

  const { data: prs, isLoading, error, refetch } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000,
    enabled: isAuthenticated,
  });

  // Monitor vector service status
  useEffect(() => {
    const checkVectorStatus = async () => {
      try {
        const response = await apiCall("/api/vector-status");
        const status = await response.json();
        const newStatus = status.vectorService;
        
        // Log status changes
        if (!previousVectorStatus.current && !hasLoggedInitialStatus.current) {
          console.log('🔍 Initial vector service status:', newStatus);
          hasLoggedInitialStatus.current = true;
        } else if (previousVectorStatus.current && previousVectorStatus.current.isInitializing !== newStatus.isInitializing) {
          if (newStatus.isInitializing) {
            console.log('🚀 Vector service initialization started!');
            console.log('📈 Watch for progress updates every 10 seconds...');
          } else if (newStatus.isInitialized) {
            console.log('✅ Vector service initialization completed! Future analyses will use intelligent semantic context.');
          }
        }
        
        // Log progress updates for initializing service
        if (newStatus.isInitializing && newStatus.progress) {
          const p = newStatus.progress;
          const prevProgress = previousVectorStatus.current?.progress?.percentage || 0;
          const currentProgress = p.percentage;
          
          // Log every 5% progress for better visibility
          if (Math.floor(currentProgress / 5) > Math.floor(prevProgress / 5)) {
            console.log(`📊 Vector Progress: ${p.stage} - ${currentProgress.toFixed(1)}% (${p.current}/${p.total})`);
            
            if (p.estimatedCompletion) {
              const remaining = (new Date(p.estimatedCompletion).getTime() - Date.now()) / 1000;
              if (remaining > 0) {
                console.log(`⏱️ Estimated completion: ${Math.ceil(remaining)}s remaining`);
              }
            }
            
            // Show time elapsed
            if (p.startTime) {
              const elapsed = (Date.now() - new Date(p.startTime).getTime()) / 1000;
              console.log(`⏰ Time elapsed: ${Math.ceil(elapsed)}s`);
            }
          }
        }
        
        // Update previous status for next comparison
        previousVectorStatus.current = newStatus;
      } catch (error) {
        console.warn('Failed to check vector status:', error);
      }
    };

    // Check immediately
    checkVectorStatus();
    
    // Then check every 10 seconds
    const interval = setInterval(checkVectorStatus, 10000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependency array - run once on mount

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
      // Check vector service status before analysis
      console.log('🔍 Checking vector service status...');
      const vectorStatusResponse = await apiCall("/api/vector-status");
      const initialVectorStatus = await vectorStatusResponse.json();
      console.log('📊 Vector Service Status:', initialVectorStatus.vectorService);
      
      if (initialVectorStatus.vectorService.isInitializing) {
        const progress = initialVectorStatus.vectorService.progress;
        if (progress) {
          console.log(`🔄 Vector initialization in progress: ${progress.stage} - ${progress.percentage.toFixed(1)}% (${progress.elapsedTime.toFixed(1)}s elapsed)`);
          if (progress.estimatedCompletion) {
            const remaining = (new Date(progress.estimatedCompletion).getTime() - Date.now()) / 1000;
            console.log(`⏱️ Estimated completion: ${remaining.toFixed(0)}s remaining`);
          }
        }
        console.log('💡 Using traditional context gathering while vector service initializes...');
      } else if (initialVectorStatus.vectorService.isInitialized) {
        console.log('🎯 Vector service ready! Using intelligent semantic context retrieval...');
      } else {
        console.log('⚠️ Vector service not initialized. Using traditional context gathering...');
      }

      const token = localStorage.getItem('github_token');
      if (!token) {
        toast.error('Please sign in again to analyze pull requests');
        return;
      }

      const [owner, repoName] = selectedRepo.full_name.split('/');
      console.log(`🚀 Starting PR analysis: ${owner}/${repoName}#${pr.number}`);
      
      // Start the analysis request
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
          enableStaticAnalysis: true,
          enableSandboxValidation: true  // Enable sandbox validation for tested fixes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ PR analysis failed: ${errorData.error || "Unknown error"}`);
        throw new Error(errorData.error || "Failed to analyze PR");
      }

      const analysisResult = await response.json();
      console.log('✅ PR analysis completed successfully!');
      console.log('📊 Analysis result:', analysisResult);
      
      // Check vector status after analysis to see if it started initializing
      setTimeout(async () => {
        try {
          const finalVectorStatusResponse = await apiCall("/api/vector-status");
          const finalStatus = await finalVectorStatusResponse.json();
          
          if (finalStatus.vectorService.isInitializing && !initialVectorStatus.vectorService.isInitializing) {
            console.log('🚀 Vector service initialization started during analysis! Future analyses will be even smarter.');
            console.log('📈 Watch for progress updates every 10 seconds...');
          } else if (finalStatus.vectorService.isInitialized && !initialVectorStatus.vectorService.isInitialized) {
            console.log('✅ Vector service completed initialization! All future analyses will use intelligent semantic context.');
          }
        } catch (error) {
          console.warn('Failed to check final vector status:', error);
        }
      }, 1000); // Check after 1 second to allow server to update
      
      refetch();
      toast.success(`AI analysis completed for PR #${pr.number}`);
      
    } catch (error) {
      console.error("❌ Failed to analyze PR:", error);
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading pull requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-red-600 mb-4">Error loading pull requests: {error.message}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Clean Header Section */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <GitPullRequest className="h-8 w-8 text-gray-600" />
                Pull Requests
              </h1>
              <p className="text-gray-600">
                Browse and analyze pull requests from GitHub repositories
              </p>
            </div>
            <div className="flex items-center gap-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{searchFilteredPRs.length}</div>
                <div className="text-sm text-gray-500 uppercase">PRs</div>
              </div>
              {analyzingPRs.size > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{analyzingPRs.size}</div>
                  <div className="text-sm text-gray-500 uppercase">Analyzing</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{prs?.filter(pr => pr.aiSuggestions).length || 0}</div>
                <div className="text-sm text-gray-500 uppercase">Analyzed</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="col-span-3">
              <div className="space-y-6">
                {/* Source Selection */}
                <BrutalistCard
                  title="Data Source"
                  content="Choose between stored pull requests or fetch live data from GitHub repositories."
                  variant="blue"
                  className="w-full max-w-none"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <Database className="h-8 w-8 text-gray-600" />
                    <div className="flex gap-2">
                      <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">SOURCE</Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <Button
                      variant={source === 'stored' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSource('stored')}
                      className={`text-xs font-bold border-2 ${source === 'stored' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-800' : 'border-gray-600 text-black hover:bg-gray-600 hover:text-white'}`}
                    >
                      <Database className="h-3 w-3 mr-1" />
                      Stored
                    </Button>
                    <Button
                      variant={source === 'github' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSource('github')}
                      className={`text-xs font-bold border-2 ${source === 'github' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-800' : 'border-gray-600 text-black hover:bg-gray-600 hover:text-white'}`}
                    >
                      <Github className="h-3 w-3 mr-1" />
                      GitHub
                    </Button>
                  </div>
                  
                  <div className="text-xs text-black space-y-1 bg-gray-200 p-3 border-2 border-gray-600 font-bold">
                    <div>Stored: {prs?.length || 0}</div>
                    <div>GitHub: {filteredGithubPRs.length}</div>
                  </div>
                </BrutalistCard>

              {/* Repository Selection */}
              {source === 'github' && (
                <BrutalistCard
                  title="Repository"
                  content="Select a GitHub repository to fetch and analyze pull requests from your connected account."
                  variant="green"
                  className="w-full max-w-none"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <Github className="h-8 w-8 text-gray-600" />
                    <div className="flex gap-2">
                      <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">GITHUB</Badge>
                    </div>
                  </div>
                  
                  <RepoSelector
                    onRepoSelect={handleRepoSelect}
                    selectedRepo={selectedRepo}
                    onFetchPRs={handleFetchGitHubPRs}
                    isFetchingPRs={isFetchingPRs}
                    compact
                  />
                </BrutalistCard>
              )}

              {/* Filters */}
              <BrutalistCard
                title="Filters"
                content="Filter pull requests by their current status to focus on specific types of changes."
                variant="green"
                className="w-full max-w-none"
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                    <span className="w-4 h-4 bg-white rounded-full"></span>
                  </span>
                  <div className="flex gap-2">
                    <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">FILTER</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'open', 'closed'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={prFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPrFilter(filter)}
                      className={`text-xs font-bold border-2 ${prFilter === filter ? 'bg-green-600 hover:bg-green-700 text-white border-green-800' : 'border-gray-600 text-black hover:bg-gray-600 hover:text-white'}`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Button>
                  ))}
                </div>
              </BrutalistCard>

              {/* Actions */}
              {source === 'github' && (
                <BrutalistCard
                  title="Actions"
                  content="Perform bulk operations on selected pull requests for efficient analysis workflows."
                  variant="purple"
                  className="w-full max-w-none"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <Brain className="h-8 w-8 text-gray-600" />
                    <div className="flex gap-2">
                      <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">AI</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      onClick={handleAnalyzeSelected}
                      disabled={selectedPRs.size === 0 || analyzingPRs.size > 0}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400 border-2 border-purple-800 font-bold"
                      size="sm"
                    >
                      <Brain className="h-3 w-3 mr-2" />
                      Analyze Selected ({selectedPRs.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPRs(new Set())}
                      disabled={selectedPRs.size === 0}
                      className="w-full border-2 border-gray-600 text-black hover:bg-gray-600 hover:text-white disabled:text-gray-500 font-bold"
                      size="sm"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </BrutalistCard>
              )}
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-9">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search pull requests by title, author, or repository..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white text-black placeholder-gray-600 border-3 border-gray-600 rounded-none focus:outline-none focus:border-blue-600 focus:bg-gray-100 font-medium shadow-[4px_4px_0_#4b5563]"
                />
              </div>
            </div>

            {/* PR Grid */}
            {isFetchingPRs && source === 'github' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-6 animate-pulse bg-gray-100 rounded-lg border border-gray-300">
                    <div className="h-4 w-3/4 bg-gray-300 rounded mb-3" />
                    <div className="h-3 w-1/2 bg-gray-300 rounded mb-2" />
                    <div className="h-3 w-1/4 bg-gray-300 rounded" />
                  </div>
                ))}
              </div>
            ) : searchFilteredPRs.length === 0 ? (
              <div className="text-center py-12">
                <GitPullRequest className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {searchFilteredPRs.map((pr) => (
                  <BrutalistCard
                    key={`${pr.repo}-${pr.number}`}
                    title={`PR #${pr.number}`}
                    content={pr.title}
                    variant="default"
                    className="hover:cursor-pointer"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <GitPullRequest className="h-8 w-8 text-gray-600" />
                      <div className="flex gap-2">
                        {pr.aiSuggestions && (
                          <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">AI ✓</Badge>
                        )}
                        <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">GITHUB</Badge>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-black">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{pr.author}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-black">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <code className="text-xs bg-gray-200 text-black px-2 py-1 rounded font-bold border-2 border-gray-600">
                          {pr.repo}
                        </code>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        {source === 'github' && (
                          <Checkbox
                            checked={selectedPRs.has(pr.number)}
                            onCheckedChange={() => handleToggleSelect(pr.number)}
                          />
                        )}
                        <a
                          href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
                        >
                          View PR <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {pr.aiSuggestions && (
                          <Button
                            onClick={() => navigate({ 
                              to: "/analysis", 
                              search: { repo: pr.repo, number: pr.number } 
                            })}
                            variant="outline"
                            size="sm"
                            className="text-xs border-2 border-gray-600 text-black hover:bg-gray-600 hover:text-white font-bold"
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
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 border-2 border-blue-800 font-bold"
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
                  </BrutalistCard>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
