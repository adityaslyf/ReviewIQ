import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnhancedStaticAnalysisService, type EnhancedStaticAnalysisResult, type StaticAnalysisIssue, type CodeHunk } from './enhanced-static-analysis';

export interface StructuredCodeSuggestion {
  file: string;
  line?: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'Security' | 'Performance' | 'Logic' | 'Architecture' | 'Style' | 'Testing';
  issue: string;
  suggestion: string;
  patch?: string;
  reasoning: string;
}

export interface StructuredAnalysisResult {
  summary: string;
  potentialIssues: StructuredCodeSuggestion[];
  refactorSuggestions: StructuredCodeSuggestion[];
  testRecommendations: Array<{
    file: string;
    suggestion: string;
  }>;
  finalVerdict: 'safe' | 'minor_changes' | 'major_fixes';
  staticAnalysisIntegration: {
    issuesFound: number;
    toolsUsed: string[];
    highPriorityFindings: string[];
  };
  contextMetrics: {
    filesAnalyzed: number;
    hunksExtracted: number;
    totalTokensEstimate: number;
    analysisDepth: 'shallow' | 'moderate' | 'deep';
  };
}

export interface MultiModelResult {
  flashAnalysis?: {
    summary: string;
    quickIssues: string[];
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendDeepAnalysis: boolean;
  };
  proAnalysis: StructuredAnalysisResult;
  analysisMode: 'flash-only' | 'flash-then-pro' | 'pro-only';
  totalCost: number;
  processingTime: number;
}

export class EnhancedGeminiService {
  private genAI: GoogleGenerativeAI;
  private flashModel: any;
  private proModel: any;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key must be provided");
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Flash model for quick analysis
    this.flashModel = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            quickIssues: { 
              type: "array", 
              items: { type: "string" }
            },
            complexity: { 
              type: "string", 
              enum: ["LOW", "MEDIUM", "HIGH"]
            },
            recommendDeepAnalysis: { type: "boolean" }
          },
          required: ["summary", "quickIssues", "complexity", "recommendDeepAnalysis"]
        }
      }
    });
    
    // Pro model for deep analysis
    this.proModel = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            potentialIssues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  file: { type: "string" },
                  line: { type: "number" },
                  severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                  category: { type: "string", enum: ["Security", "Performance", "Logic", "Architecture", "Style", "Testing"] },
                  issue: { type: "string" },
                  suggestion: { type: "string" },
                  patch: { type: "string" },
                  reasoning: { type: "string" }
                },
                required: ["file", "severity", "category", "issue", "suggestion", "reasoning"]
              }
            },
            refactorSuggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  file: { type: "string" },
                  line: { type: "number" },
                  severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                  category: { type: "string", enum: ["Security", "Performance", "Logic", "Architecture", "Style", "Testing"] },
                  issue: { type: "string" },
                  suggestion: { type: "string" },
                  patch: { type: "string" },
                  reasoning: { type: "string" }
                },
                required: ["file", "severity", "category", "issue", "suggestion", "reasoning"]
              }
            },
            testRecommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  file: { type: "string" },
                  suggestion: { type: "string" }
                },
                required: ["file", "suggestion"]
              }
            },
            finalVerdict: { 
              type: "string", 
              enum: ["safe", "minor_changes", "major_fixes"]
            }
          },
          required: ["summary", "potentialIssues", "refactorSuggestions", "testRecommendations", "finalVerdict"]
        }
      }
    });
  }

  async analyzeWithMultiModel(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>,
    options: {
      enableStaticAnalysis?: boolean;
      forceDeepAnalysis?: boolean;
      includeContext?: any;
    } = {}
  ): Promise<MultiModelResult> {
    const startTime = Date.now();
    let totalCost = 0;

    console.log('🚀 Starting enhanced multi-model analysis...');

    // Step 1: Run static analysis if enabled
    let staticResults: EnhancedStaticAnalysisResult | null = null;
    if (options.enableStaticAnalysis) {
      console.log('🔧 Running enhanced static analysis...');
      const staticService = getEnhancedStaticAnalysisService();
      const fileContents = staticService.extractFileContents(diff);
      staticResults = await staticService.analyzeCodeEnhanced(fileContents, diff);
      console.log(`📊 Static analysis found ${staticResults.issues.length} issues using ${staticResults.summary.toolsRun.join(', ')}`);
    }

    // Step 2: Quick Flash analysis (unless forced deep)
    let flashAnalysis: MultiModelResult['flashAnalysis'];
    let shouldRunDeepAnalysis = options.forceDeepAnalysis || false;

    if (!options.forceDeepAnalysis) {
      console.log('⚡ Running Flash model quick analysis...');
      flashAnalysis = await this.runFlashAnalysis(prTitle, prDescription, diff, changedFiles);
      totalCost += 0.1; // Rough cost estimate
      shouldRunDeepAnalysis = flashAnalysis.recommendDeepAnalysis || flashAnalysis.complexity !== 'LOW';
      console.log(`Flash analysis: ${flashAnalysis.complexity} complexity, deep analysis ${shouldRunDeepAnalysis ? 'recommended' : 'not needed'}`);
    }

    // Step 3: Deep Pro analysis if needed
    console.log('🧠 Running Pro model deep analysis...');
    const proAnalysis = await this.runProAnalysis(
      prTitle, 
      prDescription, 
      diff, 
      changedFiles, 
      staticResults,
      options.includeContext,
      flashAnalysis
    );
    totalCost += 1.0; // Rough cost estimate

    const processingTime = Date.now() - startTime;
    console.log(`✅ Multi-model analysis completed in ${processingTime}ms`);

    return {
      flashAnalysis,
      proAnalysis,
      analysisMode: !options.forceDeepAnalysis ? 
        (flashAnalysis ? 'flash-then-pro' : 'pro-only') : 'pro-only',
      totalCost,
      processingTime
    };
  }

  private async runFlashAnalysis(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<MultiModelResult['flashAnalysis']> {
    const fileSummary = changedFiles.map(file => 
      `${file.filename}: +${file.additions} -${file.deletions}`
    ).join(', ');

    const prompt = `You are a senior software engineer doing a QUICK code review triage.

PR: "${prTitle}"
Files: ${fileSummary}
Changes: ${changedFiles.reduce((sum, f) => sum + f.changes, 0)} total

Code diff (first 2000 chars):
\`\`\`diff
${diff.substring(0, 2000)}${diff.length > 2000 ? '...[truncated]' : ''}
\`\`\`

QUICK ASSESSMENT TASK:
1. What does this PR do? (1 sentence)
2. Spot any obvious issues (security, bugs, performance)
3. Assess complexity: LOW (simple changes), MEDIUM (moderate complexity), HIGH (complex/risky)
4. Should this get deep analysis? (true if complex, security-related, or has potential issues)

Be fast but accurate. Focus on obvious problems and complexity assessment.`;

    try {
      const result = await this.flashModel.generateContent(prompt);
      const response = await result.response;
      return JSON.parse(response.text());
    } catch (error) {
      console.warn('Flash analysis failed:', error);
      return {
        summary: "Quick analysis failed",
        quickIssues: ["Flash analysis error - proceeding with deep analysis"],
        complexity: 'MEDIUM' as const,
        recommendDeepAnalysis: true
      };
    }
  }

  private async runProAnalysis(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>,
    staticResults: EnhancedStaticAnalysisResult | null,
    enhancedContext: any,
    flashAnalysis?: MultiModelResult['flashAnalysis']
  ): Promise<StructuredAnalysisResult> {
    const fileSummary = changedFiles.map(file => 
      `- ${file.filename}: +${file.additions} -${file.deletions}`
    ).join('\n');

    // Build static analysis summary
    const staticSummary = staticResults ? this.buildStaticAnalysisSummary(staticResults) : '';
    
    // Build context sections
    const contextSections = this.buildContextSections(enhancedContext);
    
    // Build code hunks summary
    const hunksSummary = staticResults?.codeHunks ? this.buildHunksSummary(staticResults.codeHunks) : '';

    // Estimate context size
    const contextMetrics = this.measureContextSize(prTitle, prDescription, diff, fileSummary, contextSections, staticSummary);

    const prompt = `You are a **SENIOR SOFTWARE ARCHITECT** conducting a comprehensive code review.

${flashAnalysis ? `QUICK TRIAGE RESULTS: ${flashAnalysis.summary} (Complexity: ${flashAnalysis.complexity})` : ''}

## PR CONTEXT
**Title:** ${prTitle}
**Description:** ${prDescription || 'No description provided'}

**Files Changed:**
${fileSummary}

${staticSummary}

${contextSections}

${hunksSummary}

## COMPLETE DIFF
\`\`\`diff
${diff}
\`\`\`

## REVIEW REQUIREMENTS

You are performing a **COMPREHENSIVE CODE REVIEW** with the following focus areas:

### 1. SECURITY ANALYSIS
- Authentication/authorization flaws
- Input validation issues  
- SQL injection, XSS, CSRF vulnerabilities
- Hardcoded secrets or credentials
- Unsafe deserialization
- Path traversal vulnerabilities

### 2. PERFORMANCE ANALYSIS  
- N+1 query problems
- Memory leaks or inefficient memory usage
- Inefficient algorithms or data structures
- Unnecessary database calls
- Poor caching strategies
- Resource management issues

### 3. LOGIC & CORRECTNESS
- Business logic errors
- Edge case handling
- Error handling and recovery
- Race conditions or concurrency issues
- Data consistency problems
- API contract violations

### 4. ARCHITECTURE & MAINTAINABILITY
- SOLID principle violations
- Code duplication (DRY violations)
- Tight coupling between components
- Missing abstractions
- Inconsistent patterns
- Technical debt accumulation

### 5. TESTING & QUALITY
- Missing test coverage for critical paths
- Inadequate edge case testing
- Integration test gaps
- Performance test needs
- Security test requirements

## ANALYSIS INSTRUCTIONS

1. **Validate Static Analysis**: Confirm if static tool findings are real issues
2. **Find Missing Issues**: Look for problems static analysis missed
3. **Provide Context**: Explain WHY issues matter and HOW to fix them  
4. **Code Examples**: Show specific before/after code improvements
5. **Prioritize**: Focus on HIGH severity issues that could cause production problems

## RESPONSE FORMAT

Respond with structured JSON containing detailed, actionable feedback. Each suggestion must include:
- Specific file and line reference
- Clear explanation of the problem
- Concrete solution with code example
- Reasoning for why the change improves the code

Focus on being **constructive** and **educational** - help the developer understand not just what to change, but why it matters.`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = await result.response;
      const parsedResult = JSON.parse(response.text());

      // Add metadata
      return {
        ...parsedResult,
        staticAnalysisIntegration: {
          issuesFound: staticResults?.summary.totalIssues || 0,
          toolsUsed: staticResults?.summary.toolsRun || [],
          highPriorityFindings: staticResults?.issues
            .filter(issue => issue.severity === 'error')
            .slice(0, 5)
            .map(issue => `${issue.tool}: ${issue.message}`) || []
        },
        contextMetrics: {
          filesAnalyzed: changedFiles.length,
          hunksExtracted: staticResults?.summary.hunksExtracted || 0,
          totalTokensEstimate: contextMetrics.total.estimatedTokens,
          analysisDepth: contextMetrics.total.estimatedTokens > 50000 ? 'deep' : 
                        contextMetrics.total.estimatedTokens > 20000 ? 'moderate' : 'shallow'
        }
      };
    } catch (error) {
      console.error('Pro analysis failed:', error);
      throw new Error(`Enhanced analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildStaticAnalysisSummary(staticResults: EnhancedStaticAnalysisResult): string {
    if (staticResults.summary.totalIssues === 0) {
      return '\n## STATIC ANALYSIS RESULTS\n✅ No issues found by static analysis tools\n';
    }

    const topIssues = staticResults.issues
      .slice(0, 10)
      .map(issue => `- **${issue.file}:${issue.line}** [${issue.severity.toUpperCase()}] ${issue.message} (${issue.tool}: ${issue.rule})`)
      .join('\n');

    return `
## STATIC ANALYSIS RESULTS
**Tools Used:** ${staticResults.summary.toolsRun.join(', ')}
**Issues Found:** ${staticResults.summary.totalIssues} (${staticResults.summary.errorCount} errors, ${staticResults.summary.warningCount} warnings)

**Top Issues:**
${topIssues}
${staticResults.summary.totalIssues > 10 ? `\n...and ${staticResults.summary.totalIssues - 10} more issues` : ''}
`;
  }

  private buildContextSections(enhancedContext?: any): string {
    if (!enhancedContext) return "";

    let contextSections = "";

    // CI/CD Status
    if (enhancedContext.cicdContext) {
      const ci = enhancedContext.cicdContext;
      contextSections += `
## CI/CD STATUS
- **Checks:** ${ci.summary.totalChecks} (✅ ${ci.summary.passing} | ❌ ${ci.summary.failing})
${ci.summary.failing > 0 ? `- **Failing Checks:** ${ci.checkRuns.filter((r: any) => r.conclusion === 'failure').map((r: any) => r.name).join(', ')}` : ''}`;
    }

    // Branch Context
    if (enhancedContext.branchContext) {
      const branch = enhancedContext.branchContext;
      contextSections += `
## BRANCH CONTEXT  
- **Branch:** ${branch.headBranch} → ${branch.baseBranch}
- **Status:** ${branch.mergeable ? '✅ Mergeable' : '❌ Conflicts'} (${branch.mergeableState})
- **Position:** ${branch.aheadBy} ahead, ${branch.behindBy} behind`;
    }

    return contextSections;
  }

  private buildHunksSummary(hunks: CodeHunk[]): string {
    if (hunks.length === 0) return '';

    const functionHunks = hunks.filter(h => h.type === 'function' || h.type === 'method');
    const classHunks = hunks.filter(h => h.type === 'class');

    let summary = `
## CODE STRUCTURE ANALYSIS
**Extracted Hunks:** ${hunks.length} code blocks`;

    if (functionHunks.length > 0) {
      summary += `
**Functions/Methods Modified:**
${functionHunks.map(h => `- ${h.functionName} in ${h.filename} (lines ${h.startLine}-${h.endLine})`).join('\n')}`;
    }

    if (classHunks.length > 0) {
      summary += `
**Classes Modified:**
${classHunks.map(h => `- ${h.className} in ${h.filename} (lines ${h.startLine}-${h.endLine})`).join('\n')}`;
    }

    return summary;
  }

  private measureContextSize(
    prTitle: string, 
    prDescription: string, 
    diff: string, 
    fileSummary: string, 
    contextSections: string,
    staticSummary: string
  ) {
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);

    const metrics = {
      prTitle: {
        chars: prTitle.length,
        tokens: estimateTokens(prTitle)
      },
      prDescription: {
        chars: prDescription.length,
        tokens: estimateTokens(prDescription)
      },
      diff: {
        chars: diff.length,
        tokens: estimateTokens(diff),
        lines: diff.split('\n').length
      },
      fileSummary: {
        chars: fileSummary.length,
        tokens: estimateTokens(fileSummary)
      },
      contextSections: {
        chars: contextSections.length,
        tokens: estimateTokens(contextSections)
      },
      staticSummary: {
        chars: staticSummary.length,
        tokens: estimateTokens(staticSummary)
      },
      total: {
        chars: 0,
        estimatedTokens: 0,
        geminiLimit: 1000000,
        utilizationPercent: 0
      }
    };

    metrics.total.chars = metrics.prTitle.chars + metrics.prDescription.chars + 
                         metrics.diff.chars + metrics.fileSummary.chars + 
                         metrics.contextSections.chars + metrics.staticSummary.chars;
    
    metrics.total.estimatedTokens = metrics.prTitle.tokens + metrics.prDescription.tokens + 
                                   metrics.diff.tokens + metrics.fileSummary.tokens + 
                                   metrics.contextSections.tokens + metrics.staticSummary.tokens;
    
    metrics.total.utilizationPercent = Math.round((metrics.total.estimatedTokens / metrics.total.geminiLimit) * 100 * 100) / 100;

    return metrics;
  }
}

// Helper function to get enhanced Gemini service
let enhancedGeminiService: EnhancedGeminiService | null = null;

export function getEnhancedGeminiService(apiKey: string): EnhancedGeminiService {
  if (!enhancedGeminiService || !apiKey) {
    enhancedGeminiService = new EnhancedGeminiService(apiKey);
  }
  return enhancedGeminiService;
}
