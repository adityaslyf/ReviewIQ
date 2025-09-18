import { useQuery } from "@tanstack/react-query";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { 
  Brain, 
  ArrowLeft, 
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
  const response = await fetch("http://localhost:3000/api/pull-requests-with-ai");
  if (!response.ok) {
    throw new Error("Failed to fetch pull requests");
  }
  return response.json();
}

// Format AI suggestions for better display
function formatAISuggestions(text: string) {
  const sections = text.split(/(?=\*\*[^*]+\*\*)/g).filter(section => section.trim());
  
  return sections.map((section, index) => {
    const trimmedSection = section.trim();
    
    if (trimmedSection.startsWith('**') && trimmedSection.includes('**')) {
      const headerMatch = trimmedSection.match(/^\*\*([^*]+)\*\*/);
      const header = headerMatch ? headerMatch[1] : '';
      const content = trimmedSection.replace(/^\*\*[^*]+\*\*:?\s*/, '');
      
      let icon = <Info className="h-4 w-4" />;
      let iconColor = "text-blue-500";
      let bgColor = "bg-blue-50";
      let borderColor = "border-blue-200";
      
      if (header.toLowerCase().includes('high')) {
        icon = <AlertTriangle className="h-4 w-4" />;
        iconColor = "text-red-500";
        bgColor = "bg-red-50";
        borderColor = "border-red-200";
      } else if (header.toLowerCase().includes('medium')) {
        icon = <AlertTriangle className="h-4 w-4" />;
        iconColor = "text-orange-500";
        bgColor = "bg-orange-50";
        borderColor = "border-orange-200";
      } else if (header.toLowerCase().includes('low')) {
        icon = <Info className="h-4 w-4" />;
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
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab("refactor")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "refactor"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Wrench className="h-4 w-4 inline mr-2" />
              Refactor Suggestions
            </button>
            <button
              onClick={() => setActiveTab("issues")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "issues"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Potential Issues
            </button>
            {aiSuggestions.detailedAnalysis && (
              <button
                onClick={() => setActiveTab("detailed")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "detailed"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
                    <Brain className="h-8 w-8 text-purple-600" />
                    AI Analysis Results
                  </h1>
                  <p className="mt-1 text-gray-600">
                    View detailed AI-powered code review insights
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{analyzedPRs.length} Analyzed PRs</Badge>
                <Link to="/pull-requests">
                  <Button variant="outline" size="sm">
                    Browse PRs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedPR ? (
          /* Single PR Analysis View */
          <div className="grid grid-cols-12 gap-8">
            {/* PR Info Sidebar */}
            <div className="col-span-3">
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitPullRequest className="h-5 w-5 text-green-600" />
                    PR Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{selectedPR.title}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{selectedPR.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(selectedPR.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">#{selectedPR.number}</Badge>
                      </div>
                      <div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {selectedPR.repo}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div>
                    <a
                      href={selectedPR.url || `https://github.com/${selectedPR.repo}/pull/${selectedPR.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View on GitHub <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Content */}
            <div className="col-span-9">
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-6">
                  {renderAIAnalysis(selectedPR)}
                </CardContent>
              </Card>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analyzedPRs.map((pr) => (
                  <Card key={`${pr.repo}-${pr.number}`} className="hover:shadow-lg transition-shadow border border-gray-200 bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <GitPullRequest className="h-4 w-4 text-green-600" />
                          <Badge className="bg-green-100 text-green-800 text-xs border border-green-200">
                            AI Analyzed
                          </Badge>
                        </div>
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">#{pr.number}</Badge>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">
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
                        <div>
                          <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded border">
                            {pr.repo}
                          </code>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <a
                          href={pr.url || `https://github.com/${pr.repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                        
                        <Link
                          to="/analysis"
                          search={{ repo: pr.repo, number: pr.number }}
                        >
                          <Button size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                            <Brain className="h-3 w-3 mr-1" />
                            View Analysis
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
