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

// Format AI suggestions as bullet points with scrollable content
function formatAISuggestions(text: string) {
  // Split into lines and filter out empty ones
  const lines = text.split('\n').filter(line => line.trim());
  
  // Group lines into points (lines starting with numbers, bullets, or dashes are new points)
  const points: string[] = [];
  let currentPoint = '';
  
  lines.forEach(line => {
    const trimmed = line.trim();
    // Check if it's a new point (starts with number, bullet, dash, or is clearly a new sentence)
    if (trimmed.match(/^(\d+[.)]\s*|[-•*]\s*|[A-Z])/)) {
      if (currentPoint) {
        points.push(currentPoint.trim());
      }
      currentPoint = trimmed.replace(/^(\d+[.)]\s*|[-•*]\s*)/, '');
    } else {
      currentPoint += ' ' + trimmed;
    }
  });
  
  if (currentPoint) {
    points.push(currentPoint.trim());
  }
  
  // If no proper points found, treat the whole text as paragraphs
  if (points.length === 0) {
    points.push(...text.split(/\n\n+/).filter(p => p.trim()));
  }
  
  const formatContent = (text: string) => {
    // Split by code blocks (looking for patterns like `code` or file paths)
    const parts = text.split(/(`[^`]+`|[a-zA-Z0-9_-]+\.[a-zA-Z]{2,4}|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-gray-800 text-green-400 px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm border border-gray-600 inline-block max-w-full overflow-x-auto whitespace-pre-wrap break-words">
            {part.slice(1, -1)}
          </code>
        );
      } else if (part.includes('.') && (part.includes('/') || part.match(/\.[a-zA-Z]{2,4}$/))) {
        return (
          <code key={i} className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm border-2 border-gray-600 font-bold inline-block max-w-full overflow-x-auto whitespace-pre-wrap break-words">
            {part}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };
  
  return (
    <div className="bg-white border-2 sm:border-3 border-gray-600 overflow-hidden">
      <div className="max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-2 sm:gap-3 group">
            <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 border-gray-600 mt-0.5">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs sm:text-sm lg:text-base text-black leading-relaxed font-medium break-words">
                {formatContent(point)}
              </p>
            </div>
          </div>
        ))}
      </div>
      {points.length > 5 && (
        <div className="bg-gray-100 px-3 sm:px-4 py-2 border-t-2 sm:border-t-3 border-gray-600 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="font-medium">Scroll to see all {points.length} points</span>
        </div>
      )}
    </div>
  );
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
        <div className="text-xs sm:text-sm text-gray-500 italic p-6 sm:p-8 text-center">
          <Brain className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
          <p>No AI analysis available for this PR yet.</p>
        </div>
      );
    }

    const { aiSuggestions } = pr;
    
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* AI Summary - Responsive */}
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">AI Summary</span>
            <Badge variant="secondary" className="text-xs">
              {aiSuggestions.analysisStatus}
            </Badge>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-1.5 sm:gap-2">
              <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                {aiSuggestions.summary}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Analysis Details - Responsive */}
        <div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
            <button
              onClick={() => setActiveTab("refactor")}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold border-2 sm:border-3 transition-all ${
                activeTab === "refactor"
                  ? "bg-blue-600 text-white border-blue-800"
                  : "bg-white text-black border-gray-600 hover:bg-gray-100"
              }`}
            >
              <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Refactor Suggestions</span>
              <span className="sm:hidden">Refactor</span>
            </button>
            <button
              onClick={() => setActiveTab("issues")}
              className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold border-2 sm:border-3 transition-all ${
                activeTab === "issues"
                  ? "bg-red-600 text-white border-red-800"
                  : "bg-white text-black border-gray-600 hover:bg-gray-100"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Potential Issues</span>
              <span className="sm:hidden">Issues</span>
            </button>
            {aiSuggestions.detailedAnalysis && (
              <button
                onClick={() => setActiveTab("detailed")}
                className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold border-2 sm:border-3 transition-all ${
                  activeTab === "detailed"
                    ? "bg-purple-600 text-white border-purple-800"
                    : "bg-white text-black border-gray-600 hover:bg-gray-100"
                }`}
              >
                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Deep Analysis</span>
                <span className="sm:hidden">Deep</span>
              </button>
            )}
          </div>

          <div className="min-h-[300px] sm:min-h-[400px]">
            {activeTab === "refactor" ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-1">
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Refactoring Suggestions</span>
                </div>
                {formatAISuggestions(aiSuggestions.refactorSuggestions)}
              </div>
            ) : activeTab === "issues" ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-1">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Potential Issues</span>
                </div>
                {formatAISuggestions(aiSuggestions.potentialIssues)}
              </div>
            ) : activeTab === "detailed" && aiSuggestions.detailedAnalysis ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">Deep Analysis</span>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 self-start">
                    {aiSuggestions.analysisMode === "static-enhanced" ? "Static Enhanced" : "Enhanced"}
                  </Badge>
                </div>

                {/* Overview - Responsive */}
                {aiSuggestions.detailedAnalysis?.overview && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                      <Info className="h-4 w-4 flex-shrink-0" />
                      Technical Overview
                    </h4>
                    <p className="text-xs sm:text-sm text-purple-800 leading-relaxed">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 py-4 sm:py-8 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Clean Header Section - Responsive */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-8 lg:mb-12 gap-4 sm:gap-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 mb-2">
                <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
                AI Analysis Results
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                View detailed AI-powered code review insights
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-12">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{analyzedPRs.length}</div>
                <div className="text-xs sm:text-sm text-gray-500 uppercase">Analyzed PRs</div>
              </div>
              <Link to="/pull-requests">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm text-gray-600 border-2 border-gray-600 hover:bg-gray-600 hover:text-white font-bold whitespace-nowrap">
                  Browse PRs
                </Button>
              </Link>
            </div>
          </div>
        {selectedPR ? (
          /* Single PR Analysis View - Responsive */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
            {/* PR Info Sidebar - Responsive */}
            <div className="lg:col-span-3">
              <BrutalistCard
                title="PR Details"
                content={selectedPR.title}
                variant="default"
                className="w-full max-w-none"
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <GitPullRequest className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
                  <div className="flex gap-1.5 sm:gap-2">
                    <Badge className="bg-black text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold">#{selectedPR.number}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-black">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="font-medium truncate">{selectedPR.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-black">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{new Date(selectedPR.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <code className="text-xs bg-gray-200 text-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold border-2 border-gray-600 break-all">
                      {selectedPR.repo}
                    </code>
                  </div>
                </div>
                
                <a
                  href={selectedPR.url || `https://github.com/${selectedPR.repo}/pull/${selectedPR.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-bold"
                >
                  View on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              </BrutalistCard>
            </div>

            {/* Analysis Content - Responsive */}
            <div className="lg:col-span-9">
              <BrutalistCard
                title="AI Analysis"
                content="Detailed code review insights and suggestions"
                variant="purple"
                className="w-full max-w-none"
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
                  <div className="flex gap-1.5 sm:gap-2">
                    <Badge className="bg-black text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold">AI</Badge>
                    <Badge className="bg-black text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold">ANALYSIS</Badge>
                  </div>
                </div>
                {renderAIAnalysis(selectedPR)}
              </BrutalistCard>
            </div>
          </div>
        ) : (
          /* All Analyzed PRs View - Responsive */
          <div>
            {analyzedPRs.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Brain className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No Analysis Results Yet</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
                  Start by analyzing some pull requests to see AI insights here.
                </p>
                <Link to="/pull-requests">
                  <Button className="text-sm sm:text-base">
                    <GitPullRequest className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Browse Pull Requests
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {analyzedPRs.map((pr) => (
                  <BrutalistCard
                    key={`${pr.repo}-${pr.number}`}
                    title={`PR #${pr.number}`}
                    content={pr.title}
                    variant="purple"
                    className="hover:cursor-pointer w-full max-w-none"
                  >
                    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <GitPullRequest className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
                      <div className="flex gap-1.5 sm:gap-2">
                        <Badge className="bg-black text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold">AI ✓</Badge>
                        <Badge className="bg-black text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold">ANALYZED</Badge>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-black">
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="font-medium truncate">{pr.author}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-black">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <code className="text-xs bg-gray-200 text-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold border-2 border-gray-600 break-all">
                          {pr.repo}
                        </code>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:gap-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
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
