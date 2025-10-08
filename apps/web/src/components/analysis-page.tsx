import { useQuery } from "@tanstack/react-query";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BrutalistCard } from "./brutalist-card";
import { apiCall } from "@/lib/api";
import { 
  Brain, 
  GitPullRequest,
  ExternalLink,
  User,
  Calendar,
  Wrench,
  AlertTriangle,
  Info
} from "lucide-react";
import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
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

async function fetchPullRequests(): Promise<PullRequest[]> {
  const token = localStorage.getItem('github_token');
  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await apiCall("/pull-requests-with-ai", {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json();
}

// Format AI suggestions with improved brutalist styling and code highlighting
function formatAISuggestions(text: string) {
  const sections = text.split(/(?=\*\*[^*]+\*\*)/g).filter(section => section.trim());
  
  return sections.map((section, index) => {
    const trimmedSection = section.trim();
    
    if (trimmedSection.startsWith('**') && trimmedSection.includes('**')) {
      const headerMatch = trimmedSection.match(/^\*\*([^*]+)\*\*/);
      const header = headerMatch ? headerMatch[1] : '';
      const content = trimmedSection.replace(/^\*\*[^*]+\*\*:?\s*/, '');
      
      let icon = <Info className="h-5 w-5" />;
      let iconColor = "text-blue-600";
      let borderColor = "border-gray-600";
      let badgeColor = "bg-blue-600";
      let severity = "INFO";
      
      if (header.toLowerCase().includes('high')) {
        icon = <AlertTriangle className="h-5 w-5" />;
        iconColor = "text-red-600";
        borderColor = "border-gray-600";
        badgeColor = "bg-red-600";
        severity = "HIGH";
      } else if (header.toLowerCase().includes('medium')) {
        icon = <AlertTriangle className="h-5 w-5" />;
        iconColor = "text-orange-600";
        borderColor = "border-gray-600";
        badgeColor = "bg-orange-600";
        severity = "MEDIUM";
      } else if (header.toLowerCase().includes('low')) {
        icon = <Info className="h-5 w-5" />;
        iconColor = "text-green-600";
        borderColor = "border-gray-600";
        badgeColor = "bg-green-600";
        severity = "LOW";
      }
      
      // Enhanced content formatting with code detection
      const formatContent = (text: string) => {
        // Split by code blocks (looking for patterns like `code` or file paths)
        const parts = text.split(/(`[^`]+`|[a-zA-Z0-9_-]+\.[a-zA-Z]{2,4}|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g);
        
        return parts.map((part, i) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            // Inline code
            return (
              <code key={i} className="bg-gray-800 text-green-400 px-2 py-1 rounded font-mono text-sm border border-gray-600">
                {part.slice(1, -1)}
              </code>
            );
          } else if (part.includes('.') && (part.includes('/') || part.match(/\.[a-zA-Z]{2,4}$/))) {
            // File path
            return (
              <code key={i} className="bg-gray-200 text-gray-800 px-2 py-1 rounded font-mono text-sm border-2 border-gray-600 font-bold">
                {part}
              </code>
            );
          }
          return <span key={i}>{part}</span>;
        });
      };
      
      return (
        <div key={index} className={`bg-white border-3 ${borderColor} p-6 mb-4 transition-all duration-200 hover:shadow-lg`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={iconColor}>{icon}</span>
              <h4 className="font-bold text-black text-lg uppercase">{header}</h4>
            </div>
            <Badge className={`${badgeColor} text-white px-3 py-1 text-xs font-bold border-2 border-gray-800`}>
              {severity}
            </Badge>
          </div>
          {content && (
            <div className="text-sm text-black leading-relaxed font-medium">
              {formatContent(content)}
            </div>
          )}
        </div>
      );
    } else {
      // Regular content block
      const formatContent = (text: string) => {
        const parts = text.split(/(`[^`]+`|[a-zA-Z0-9_-]+\.[a-zA-Z]{2,4}|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g);
        
        return parts.map((part, i) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={i} className="bg-gray-800 text-green-400 px-2 py-1 rounded font-mono text-sm border border-gray-600">
                {part.slice(1, -1)}
              </code>
            );
          } else if (part.includes('.') && (part.includes('/') || part.match(/\.[a-zA-Z]{2,4}$/))) {
            return (
              <code key={i} className="bg-gray-200 text-gray-800 px-2 py-1 rounded font-mono text-sm border-2 border-gray-600 font-bold">
                {part}
              </code>
            );
          }
          return <span key={i}>{part}</span>;
        });
      };
      
      return (
        <div key={index} className="bg-white border-3 border-gray-600 p-6 mb-4">
          <div className="text-sm text-black leading-relaxed font-medium">
            {formatContent(trimmedSection)}
          </div>
        </div>
      );
    }
  });
}

export function AnalysisPage() {
  const { isAuthenticated } = useAuth();
  const search = useSearch({ strict: false }) as { repo?: string; number?: number };
  const [activeTab, setActiveTab] = useState<"refactor" | "issues" | "detailed">("refactor");

  const { data: prs, isLoading, error } = useQuery({
    queryKey: ["pull-requests"],
    queryFn: fetchPullRequests,
    refetchInterval: 5000,
    enabled: isAuthenticated,
  });

  // Find the specific PR if repo and number are provided in search params
  const selectedPR = search.repo && search.number 
    ? prs?.find(pr => pr.repo === search.repo && pr.number === search.number)
    : null;

  // Get all PRs with AI analysis
  const analyzedPRs = prs?.filter(pr => pr.aiSuggestions) || [];

  const renderAIAnalysis = (pr: PullRequest) => {
    if (!pr.aiSuggestions) {
      return (
        <div className="text-sm text-gray-500 italic p-8 text-center">
          <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>No AI analysis available for this PR yet.</p>
        </div>
      );
    }

    const { aiSuggestions } = pr;
    
    return (
      <div className="space-y-6">
        {/* AI Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-blue-500" />
            <span className="font-medium">AI Summary</span>
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

        {/* Tabs for Analysis Details */}
        <div>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveTab("refactor")}
              className={`px-4 py-3 text-sm font-bold border-3 transition-all ${
                activeTab === "refactor"
                  ? "bg-blue-600 text-white border-blue-800"
                  : "bg-white text-black border-gray-600 hover:bg-gray-100"
              }`}
            >
              <Wrench className="h-4 w-4 inline mr-2" />
              Refactor Suggestions
            </button>
            <button
              onClick={() => setActiveTab("issues")}
              className={`px-4 py-3 text-sm font-bold border-3 transition-all ${
                activeTab === "issues"
                  ? "bg-red-600 text-white border-red-800"
                  : "bg-white text-black border-gray-600 hover:bg-gray-100"
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Potential Issues
            </button>
            {aiSuggestions.detailedAnalysis && (
              <button
                onClick={() => setActiveTab("detailed")}
                className={`px-4 py-3 text-sm font-bold border-3 transition-all ${
                  activeTab === "detailed"
                    ? "bg-purple-600 text-white border-purple-800"
                    : "bg-white text-black border-gray-600 hover:bg-gray-100"
                }`}
              >
                <Brain className="h-4 w-4 inline mr-2" />
                Deep Analysis
              </button>
            )}
          </div>

          <div className="min-h-[400px]">
            {activeTab === "refactor" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Refactoring Suggestions</span>
                </div>
                <div className="space-y-2">
                  {formatAISuggestions(aiSuggestions.refactorSuggestions)}
                </div>
              </div>
            ) : activeTab === "issues" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Potential Issues</span>
                </div>
                <div className="space-y-2">
                  {formatAISuggestions(aiSuggestions.potentialIssues)}
                </div>
              </div>
            ) : activeTab === "detailed" && aiSuggestions.detailedAnalysis ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">CodeRabbit-Style Deep Analysis</span>
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
                    </h4>
                    <p className="text-sm text-purple-800 leading-relaxed">
                      {aiSuggestions.detailedAnalysis?.overview}
                    </p>
                  </div>
                )}

                {/* Code Suggestions */}
                <CodeSuggestionsList 
                  suggestions={aiSuggestions.detailedAnalysis?.codeSuggestions || []}
                  theme="light"
                />

                {/* Analysis Sections */}
                <AnalysisSections
                  securityConcerns={aiSuggestions.detailedAnalysis?.securityConcerns}
                  performanceImpact={aiSuggestions.detailedAnalysis?.performanceImpact}
                  testingRecommendations={aiSuggestions.detailedAnalysis?.testingRecommendations}
                  architecturalNotes={aiSuggestions.detailedAnalysis?.architecturalNotes}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a tab to view analysis details</p>
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
        <span className="ml-2">Loading analysis data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error loading analysis data: {error.message}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
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
                <Brain className="h-8 w-8 text-gray-600" />
                AI Analysis Results
              </h1>
              <p className="text-gray-600">
                View detailed AI-powered code review insights
              </p>
            </div>
            <div className="flex items-center gap-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{analyzedPRs.length}</div>
                <div className="text-sm text-gray-500 uppercase">Analyzed PRs</div>
              </div>
              <Link to="/pull-requests">
                <Button variant="outline" size="sm" className="text-gray-600 border-2 border-gray-600 hover:bg-gray-600 hover:text-white font-bold">
                  Browse PRs
                </Button>
              </Link>
            </div>
          </div>
        {selectedPR ? (
          /* Single PR Analysis View */
          <div className="grid grid-cols-12 gap-8">
            {/* PR Info Sidebar */}
            <div className="col-span-3">
              <BrutalistCard
                title="PR Details"
                content={selectedPR.title}
                variant="default"
                className="w-full max-w-none"
              >
                <div className="flex items-center gap-4 mb-4">
                  <GitPullRequest className="h-8 w-8 text-gray-600" />
                  <div className="flex gap-2">
                    <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">#{selectedPR.number}</Badge>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-black">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedPR.author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-black">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(selectedPR.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <code className="text-xs bg-gray-200 text-black px-2 py-1 rounded font-bold border-2 border-gray-600">
                      {selectedPR.repo}
                    </code>
                  </div>
                </div>
                
                <a
                  href={selectedPR.url || `https://github.com/${selectedPR.repo}/pull/${selectedPR.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-bold"
                >
                  View on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </BrutalistCard>
            </div>

            {/* Analysis Content */}
            <div className="col-span-9">
              <BrutalistCard
                title="AI Analysis"
                content="Detailed code review insights and suggestions"
                variant="purple"
                className="w-full max-w-none"
              >
                <div className="flex items-center gap-4 mb-6">
                  <Brain className="h-8 w-8 text-gray-600" />
                  <div className="flex gap-2">
                    <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">AI</Badge>
                    <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">ANALYSIS</Badge>
                  </div>
                </div>
                {renderAIAnalysis(selectedPR)}
              </BrutalistCard>
            </div>
          </div>
        ) : (
          /* All Analyzed PRs View */
          <div>
            {analyzedPRs.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Analysis Results Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start by analyzing some pull requests to see AI insights here.
                </p>
                <Link to="/pull-requests">
                  <Button>
                    <GitPullRequest className="h-4 w-4 mr-2" />
                    Browse Pull Requests
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {analyzedPRs.map((pr) => (
                  <BrutalistCard
                    key={`${pr.repo}-${pr.number}`}
                    title={`PR #${pr.number}`}
                    content={pr.title}
                    variant="purple"
                    className="hover:cursor-pointer w-full max-w-none"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <GitPullRequest className="h-8 w-8 text-gray-600" />
                      <div className="flex gap-2">
                        <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">AI ✓</Badge>
                        <Badge className="bg-black text-white px-2 py-1 text-xs font-bold">ANALYZED</Badge>
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
                        <a
                          href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
                        >
                          View PR <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      <Link
                        to="/analysis"
                        search={{ repo: pr.repo, number: pr.number }}
                      >
                        <Button size="sm" className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-800 font-bold">
                          <Brain className="h-3 w-3 mr-1" />
                          View Analysis
                        </Button>
                      </Link>
                    </div>
                  </BrutalistCard>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
