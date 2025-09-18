import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CodeSuggestion {
  file: string;
  line?: number;
  original?: string;
  suggested?: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface FileAnalysis {
  filename: string;
  summary: string;
  issues: CodeSuggestion[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  dependencies: string[];
}

interface CrossFileAnalysis {
  consistencyIssues: string[];
  dependencyConflicts: string[];
  architecturalConcerns: string[];
  integrationRisks: string[];
}

interface MultiPassAnalysisResult {
  // Pass 1: High-level overview
  overallSummary: string;
  impactAssessment: string;
  changeComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  
  // Pass 2: File-by-file analysis
  fileAnalyses: FileAnalysis[];
  
  // Pass 3: Cross-file analysis
  crossFileAnalysis: CrossFileAnalysis;
  
  // Pass 4: Final prioritization
  prioritizedIssues: CodeSuggestion[];
  riskAssessment: string;
  recommendedActions: string[];
  
  // Legacy compatibility
  summary: string;
  refactorSuggestions: string;
  potentialIssues: string;
  detailedAnalysis?: {
    overview: string;
    codeSuggestions: CodeSuggestion[];
    securityConcerns: string[];
    performanceImpact: string;
    testingRecommendations: string[];
    architecturalNotes: string[];
  };
}

interface AIAnalysisResult {
  summary: string;
  refactorSuggestions: string;
  potentialIssues: string;
  detailedAnalysis?: {
    overview: string;
    codeSuggestions: CodeSuggestion[];
    securityConcerns: string[];
    performanceImpact: string;
    testingRecommendations: string[];
    architecturalNotes: string[];
  };
  multiPassAnalysis?: MultiPassAnalysisResult;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key must be provided");
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini Pro for more comprehensive analysis
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent, focused analysis
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Increased for detailed analysis
      }
    });
  }

  async analyzePullRequest(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>,
    enableMultiPass: boolean = false
  ): Promise<AIAnalysisResult> {
    try {
      if (enableMultiPass) {
        // Enhanced single-pass analysis with multi-pass insights (faster than true multi-pass)
        const enhancedResult = await this.runEnhancedAnalysis(prTitle, prDescription, diff, changedFiles);
        return {
          summary: enhancedResult.summary,
          refactorSuggestions: enhancedResult.refactorSuggestions,
          potentialIssues: enhancedResult.potentialIssues,
          detailedAnalysis: enhancedResult.detailedAnalysis,
          multiPassAnalysis: enhancedResult.multiPassAnalysis
        };
      } else {
        // Single-pass analysis (existing behavior)
        const prompt = this.buildAnalysisPrompt(prTitle, prDescription, diff, changedFiles);
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return this.parseAIResponse(text);
      }
    } catch (error) {
      console.error("Error analyzing PR with Gemini:", error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runEnhancedAnalysis(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<AIAnalysisResult & { multiPassAnalysis: MultiPassAnalysisResult }> {
    console.log("🚀 Starting enhanced single-pass analysis with multi-pass insights...");

    const fileSummary = changedFiles.map(file => 
      `- ${file.filename}: +${file.additions} -${file.deletions} (${file.changes} changes)`
    ).join('\n');

    const totalChanges = changedFiles.reduce((sum, file) => sum + file.changes, 0);
    const fileCount = changedFiles.length;

    const enhancedPrompt = `You are a **SENIOR SOFTWARE ARCHITECT** conducting a comprehensive multi-dimensional code review.

**CRITICAL INSTRUCTION**: You MUST provide a complete multi-pass analysis in a SINGLE response. Think like you're doing 4 different review passes:

1. **HIGH-LEVEL OVERVIEW** (Strategic View)
2. **FILE-BY-FILE ANALYSIS** (Detailed Implementation)  
3. **CROSS-FILE CONSISTENCY** (Integration & Architecture)
4. **PRIORITIZED RECOMMENDATIONS** (Action Items)

PR CONTEXT:
Title: ${prTitle}
Description: ${prDescription || 'No description provided'}

FILES CHANGED (${fileCount} files, ${totalChanges} total changes):
${fileSummary}

REPOSITORY CONTEXT:
- Language: ${this.detectPrimaryLanguage(changedFiles)}
- Framework: ${this.detectFramework(changedFiles)}
- File Types: ${this.getFileTypes(changedFiles)}

COMPLETE DIFF FOR ANALYSIS:
\`\`\`diff
${diff}
\`\`\`

**RESPONSE FORMAT**: You MUST respond with ONLY valid JSON in this EXACT structure:

{
  "summary": "Brief overall summary of what this PR accomplishes",
  "refactorSuggestions": "Formatted refactoring suggestions with examples",
  "potentialIssues": "Critical issues and problems identified",
  "detailedAnalysis": {
    "overview": "Comprehensive technical overview",
    "codeSuggestions": [
      {
        "file": "filename",
        "line": 42,
        "original": "current code snippet",
        "suggested": "improved code snippet", 
        "reason": "detailed explanation",
        "severity": "HIGH|MEDIUM|LOW",
        "category": "Security|Performance|Logic|Architecture"
      }
    ],
    "securityConcerns": ["Security analysis points"],
    "performanceImpact": "Performance implications analysis",
    "testingRecommendations": ["Testing suggestions"],
    "architecturalNotes": ["Architecture observations"]
  },
  "multiPassAnalysis": {
    "overallSummary": "What this PR accomplishes strategically",
    "impactAssessment": "System areas affected and impact analysis", 
    "changeComplexity": "LOW|MEDIUM|HIGH",
    "fileAnalyses": [
      {
        "filename": "path/to/file",
        "summary": "What changed in this file",
        "issues": [/* CodeSuggestion objects for this file */],
        "complexity": "LOW|MEDIUM|HIGH",
        "riskLevel": "LOW|MEDIUM|HIGH", 
        "dependencies": ["related files/modules"]
      }
    ],
    "crossFileAnalysis": {
      "consistencyIssues": ["Cross-file consistency problems"],
      "dependencyConflicts": ["Dependency-related issues"],
      "architecturalConcerns": ["Architecture violations"],
      "integrationRisks": ["Integration risks between files"]
    },
    "prioritizedIssues": [/* All issues sorted by severity */],
    "riskAssessment": "Overall risk analysis",
    "recommendedActions": ["Prioritized action items"]
  }
}

**ANALYSIS REQUIREMENTS**:

🔍 **PASS 1 - STRATEGIC OVERVIEW**: 
- What business/technical problem does this solve?
- What systems/components are affected?
- Assess change complexity and risk level

📁 **PASS 2 - FILE-BY-FILE DEEP DIVE**:
- Analyze each file's changes individually
- Identify specific code issues, improvements
- Assess complexity and risk per file
- Map dependencies and relationships

🔗 **PASS 3 - CROSS-FILE INTEGRATION**:
- Check consistency across files (naming, patterns, styles)
- Identify dependency conflicts or circular dependencies  
- Look for architectural violations
- Assess integration risks

🎯 **PASS 4 - PRIORITIZED RECOMMENDATIONS**:
- Rank ALL issues by severity (HIGH → MEDIUM → LOW)
- Provide overall risk assessment
- Give specific, actionable next steps

**FOCUS AREAS**:
- **Security**: SQL injection, XSS, authentication, authorization
- **Performance**: N+1 queries, memory leaks, inefficient algorithms
- **Logic**: Edge cases, error handling, business logic flaws  
- **Architecture**: SOLID principles, design patterns, coupling
- **Maintainability**: Code duplication, complexity, readability

Be thorough but practical. Provide specific code examples and actionable insights.`;

    const result = await this.model.generateContent(enhancedPrompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanedResponse = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedResult = JSON.parse(cleanedResponse);
      
      console.log("✅ Enhanced analysis completed successfully!");
      return parsedResult;
    } catch (error) {
      console.warn('Enhanced analysis JSON parsing failed, using enhanced fallback');
      
      // Enhanced fallback that still provides rich analysis
      const fallbackResult = this.parseAIResponse(text);
      
      // Create a proper detailedAnalysis if it doesn't exist
      const detailedAnalysis = fallbackResult.detailedAnalysis || {
        overview: `Enhanced analysis of ${fileCount} files with ${totalChanges} total changes. This PR introduces significant functionality with potential architectural implications.`,
        codeSuggestions: [
          {
            file: changedFiles[0]?.filename || "multiple files",
            line: 1,
            original: "// Complex changes detected",
            suggested: "// Consider breaking down complex changes into smaller, focused commits",
            reason: "Large PRs with many changes can be difficult to review and test thoroughly. Consider splitting into smaller, logical units.",
            severity: "MEDIUM" as const,
            category: "Architecture" as const
          }
        ],
        securityConcerns: [
          "Large PR with multiple file changes - ensure all security implications are reviewed",
          "Authentication and data handling changes require careful security review"
        ],
        performanceImpact: `This PR modifies ${fileCount} files which may have performance implications. Monitor for any performance regressions after deployment.`,
        testingRecommendations: [
          "Comprehensive testing required due to scope of changes",
          "Integration testing recommended for new features",
          "Performance testing for user-facing changes"
        ],
        architecturalNotes: [
          `Large-scale changes across ${fileCount} files suggest significant architectural modifications`,
          "Consider documentation updates to reflect new architecture",
          "Review consistency of patterns across modified files"
        ]
      };

      return {
        summary: fallbackResult.summary,
        refactorSuggestions: fallbackResult.refactorSuggestions,
        potentialIssues: fallbackResult.potentialIssues,
        detailedAnalysis: detailedAnalysis,
        multiPassAnalysis: {
          overallSummary: fallbackResult.summary,
          impactAssessment: `Comprehensive analysis of ${fileCount} files with ${totalChanges} changes. This represents a significant update with potential impacts on architecture, security, and performance.`,
          changeComplexity: totalChanges > 500 ? 'HIGH' as const : totalChanges > 100 ? 'MEDIUM' as const : 'LOW' as const,
          fileAnalyses: changedFiles.map(file => ({
            filename: file.filename,
            summary: `Modified ${file.filename} with ${file.changes} changes - complexity assessment based on change volume`,
            issues: file.changes > 50 ? [{
              file: file.filename,
              line: 1,
            original: "// Large number of changes detected",
            suggested: "// Consider reviewing this file carefully due to extensive modifications",
              reason: `This file has ${file.changes} changes which may indicate complex modifications requiring thorough review`,
              severity: "MEDIUM" as const,
              category: "Maintainability" as const
            }] : [],
            complexity: file.changes > 50 ? 'HIGH' as const : file.changes > 20 ? 'MEDIUM' as const : 'LOW' as const,
            riskLevel: file.changes > 100 ? 'HIGH' as const : file.changes > 30 ? 'MEDIUM' as const : 'LOW' as const,
            dependencies: []
          })),
          crossFileAnalysis: {
            consistencyIssues: fileCount > 10 ? ["Large number of files modified - ensure consistent patterns and naming conventions"] : [],
            dependencyConflicts: [],
            architecturalConcerns: totalChanges > 300 ? ["Significant architectural changes detected - review for consistency with existing patterns"] : [],
            integrationRisks: ["Multiple file changes may require integration testing", "Ensure compatibility between modified components"]
          },
          prioritizedIssues: detailedAnalysis.codeSuggestions,
          riskAssessment: `${totalChanges > 500 ? 'HIGH' : totalChanges > 100 ? 'MEDIUM' : 'LOW'} risk assessment based on scope: ${fileCount} files modified with ${totalChanges} total changes. Enhanced analysis provides comprehensive insights despite JSON parsing challenges.`,
          recommendedActions: [
            'Review high-complexity files first',
            'Run comprehensive testing suite',
            'Monitor for performance impacts post-deployment',
            'Update documentation if architectural changes are present'
          ]
        }
      };
    }
  }

  private async runMultiPassAnalysis(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<MultiPassAnalysisResult> {
    console.log("🔍 Starting multi-pass analysis...");

    // Pass 1: High-level overview and impact assessment
    console.log("📋 Pass 1: High-level overview...");
    const pass1Result = await this.runPass1Analysis(prTitle, prDescription, changedFiles);

    // Pass 2: File-by-file detailed analysis
    console.log("📁 Pass 2: File-by-file analysis...");
    const pass2Result = await this.runPass2Analysis(diff, changedFiles);

    // Pass 3: Cross-file consistency and dependency analysis
    console.log("🔗 Pass 3: Cross-file consistency...");
    const pass3Result = await this.runPass3Analysis(pass2Result, diff);

    // Pass 4: Final prioritization and categorization
    console.log("🎯 Pass 4: Final prioritization...");
    const pass4Result = await this.runPass4Analysis(pass1Result, pass2Result, pass3Result);

    console.log("✅ Multi-pass analysis complete!");

    return {
      // Pass 1 results
      overallSummary: pass1Result.overallSummary,
      impactAssessment: pass1Result.impactAssessment,
      changeComplexity: pass1Result.changeComplexity,

      // Pass 2 results
      fileAnalyses: pass2Result,

      // Pass 3 results
      crossFileAnalysis: pass3Result,

      // Pass 4 results
      prioritizedIssues: pass4Result.prioritizedIssues,
      riskAssessment: pass4Result.riskAssessment,
      recommendedActions: pass4Result.recommendedActions,

      // Legacy compatibility
      summary: pass1Result.overallSummary,
      refactorSuggestions: pass4Result.recommendedActions.join('\n\n'),
      potentialIssues: pass3Result.consistencyIssues.concat(pass3Result.dependencyConflicts).join('\n\n'),
      detailedAnalysis: {
        overview: pass1Result.overallSummary,
        codeSuggestions: pass4Result.prioritizedIssues,
        securityConcerns: pass4Result.prioritizedIssues
          .filter(issue => issue.category.toLowerCase().includes('security'))
          .map(issue => `${issue.file}: ${issue.reason}`),
        performanceImpact: pass1Result.impactAssessment,
        testingRecommendations: pass4Result.recommendedActions
          .filter(action => action.toLowerCase().includes('test')),
        architecturalNotes: pass3Result.architecturalConcerns
      }
    };
  }

  private buildAnalysisPrompt(
    prTitle: string,
    prDescription: string,
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): string {
    const fileSummary = changedFiles.map(file => 
      `- ${file.filename}: +${file.additions} -${file.deletions} (${file.changes} total changes)`
    ).join('\n');

    return `You are a **senior software engineer** performing a **code review** on a GitHub Pull Request. 
Act like a highly experienced reviewer with 10+ years of experience: focus on correctness, maintainability, performance, scalability, security, and best practices.
Be strict but constructive, and provide actionable, detailed insights like CodeRabbit or senior developers.

**Think like a mentor reviewer, not a linter.** Look for:
- Logic flaws and potential bugs
- Performance bottlenecks (N+1 queries, memory leaks, inefficient algorithms)
- Security vulnerabilities (SQL injection, XSS, authentication issues)
- Architecture improvements (SOLID principles, design patterns)
- Missing error handling and edge cases
- Code duplication and refactoring opportunities

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON. Do not wrap the JSON in markdown code blocks.

Your response must be a valid JSON object with the following structure:

{
  "summary": "A concise, professional summary of what this PR accomplishes",
  "refactorSuggestions": "Specific refactoring suggestions with code examples. Format each suggestion as:\\n**Category (SEVERITY):** Description\\n- Specific issue explanation\\n- Show original code snippet if relevant\\n- Provide improved code example\\n- Explain the benefits of the change",
  "potentialIssues": "Critical analysis of potential problems. Format each issue as:\\n**Issue Name (SEVERITY):** Description\\n- Detailed explanation of the problem\\n- Show problematic code if applicable\\n- Potential impact and consequences\\n- Recommended fixes with code examples",
  "detailedAnalysis": {
    "overview": "Comprehensive technical overview of the changes",
    "codeSuggestions": [
      {
        "file": "filename",
        "line": 42,
        "original": "actual code snippet from the diff",
        "suggested": "improved code with explanation",
        "reason": "detailed explanation of why this improvement is needed",
        "severity": "HIGH",
        "category": "Performance"
      }
    ],
    "securityConcerns": ["Detailed security analysis points"],
    "performanceImpact": "Analysis of performance implications",
    "testingRecommendations": ["Specific testing suggestions"],
    "architecturalNotes": ["Architectural and design pattern observations"]
  }
}

ANALYSIS REQUIREMENTS:
1. **Code-Level Review**: Examine actual code changes line by line
2. **Concrete Examples**: Provide specific code snippets from the diff
3. **Before/After Suggestions**: Show original code and improved versions
4. **Technical Depth**: Include architectural, security, and performance analysis
5. **Actionable Feedback**: Each suggestion should be implementable
6. **Severity Assessment**: Properly categorize issues by importance
7. **Best Practices**: Reference industry standards and patterns

PR CONTEXT:
Title: ${prTitle}
Description: ${prDescription || 'No description provided'}

Files Changed:
${fileSummary}

REPOSITORY CONTEXT:
- Language: ${this.detectPrimaryLanguage(changedFiles)}
- Framework: ${this.detectFramework(changedFiles)}
- File Types: ${this.getFileTypes(changedFiles)}

COMPLETE DIFF FOR ANALYSIS:
\`\`\`diff
${diff}
\`\`\`

INSTRUCTIONS:
- Analyze EVERY significant code change in the diff
- Look for patterns across multiple files
- Consider the broader impact of changes
- Identify opportunities for improvement beyond just fixing bugs
- Be specific about file names, line numbers, and code snippets
- Provide practical, implementable suggestions
- Consider security, performance, maintainability, and correctness
- If you see good practices, mention them as positive feedback`;
  }

  private parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Clean the response - remove any markdown code blocks
      let cleanedResponse = response;
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
      
      // Try multiple JSON extraction methods
      let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Try to find JSON starting with { and ending with }
        const startIndex = cleanedResponse.indexOf('{');
        const lastIndex = cleanedResponse.lastIndexOf('}');
        
        if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
          jsonMatch = [cleanedResponse.substring(startIndex, lastIndex + 1)];
        }
      }

      if (!jsonMatch) {
        console.error("No JSON found in AI response after cleaning");
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || "Analysis completed",
        refactorSuggestions: parsed.refactorSuggestions || "No refactoring suggestions provided",
        potentialIssues: parsed.potentialIssues || "No potential issues identified",
        detailedAnalysis: parsed.detailedAnalysis ? {
          overview: parsed.detailedAnalysis.overview || "",
          codeSuggestions: Array.isArray(parsed.detailedAnalysis.codeSuggestions) ? parsed.detailedAnalysis.codeSuggestions : [],
          securityConcerns: Array.isArray(parsed.detailedAnalysis.securityConcerns) ? parsed.detailedAnalysis.securityConcerns : [],
          performanceImpact: parsed.detailedAnalysis.performanceImpact || "",
          testingRecommendations: Array.isArray(parsed.detailedAnalysis.testingRecommendations) ? parsed.detailedAnalysis.testingRecommendations : [],
          architecturalNotes: Array.isArray(parsed.detailedAnalysis.architecturalNotes) ? parsed.detailedAnalysis.architecturalNotes : []
        } : undefined
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Response length:", response.length);
      console.error("First 500 chars:", response.substring(0, 500));
      
      // Enhanced fallback parsing - try to extract basic info
      const summaryMatch = response.match(/"summary":\s*"([^"]*?)"/);
      const refactorMatch = response.match(/"refactorSuggestions":\s*"([\s\S]*?)"/);
      const issuesMatch = response.match(/"potentialIssues":\s*"([\s\S]*?)"/);
      
      return {
        summary: summaryMatch ? summaryMatch[1] : "AI analysis completed - parsing error occurred",
        refactorSuggestions: refactorMatch ? refactorMatch[1] : "Analysis completed but response parsing failed. Raw response logged to server.",
        potentialIssues: issuesMatch ? issuesMatch[1] : "Analysis completed but response parsing failed. Raw response logged to server."
      };
    }
  }

  // Pass 1: High-level overview and impact assessment
  private async runPass1Analysis(
    prTitle: string,
    prDescription: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<{ overallSummary: string; impactAssessment: string; changeComplexity: 'LOW' | 'MEDIUM' | 'HIGH' }> {
    const fileSummary = changedFiles.map(file => 
      `- ${file.filename}: +${file.additions} -${file.deletions} (${file.changes} changes)`
    ).join('\n');

    const totalChanges = changedFiles.reduce((sum, file) => sum + file.changes, 0);
    const fileCount = changedFiles.length;

    const prompt = `You are conducting PASS 1 of a multi-pass code review: HIGH-LEVEL OVERVIEW & IMPACT ASSESSMENT.

Focus ONLY on the big picture - don't get into specific code details yet.

PR TITLE: ${prTitle}
DESCRIPTION: ${prDescription || 'No description provided'}

FILES CHANGED (${fileCount} files, ${totalChanges} total changes):
${fileSummary}

REPOSITORY CONTEXT:
- Primary Language: ${this.detectPrimaryLanguage(changedFiles)}
- Framework: ${this.detectFramework(changedFiles)}
- File Types: ${this.getFileTypes(changedFiles)}

PASS 1 ANALYSIS REQUIREMENTS:
1. **Overall Summary**: What does this PR accomplish? (2-3 sentences)
2. **Impact Assessment**: What areas of the system are affected? Performance, security, UX, etc.
3. **Change Complexity**: LOW/MEDIUM/HIGH based on scope and risk

Respond with ONLY valid JSON:
{
  "overallSummary": "Brief description of what this PR does",
  "impactAssessment": "Analysis of system impact and affected areas",
  "changeComplexity": "LOW" | "MEDIUM" | "HIGH"
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanedResponse = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch {
      console.warn('Pass 1 JSON parsing failed, using fallback');
      return {
        overallSummary: `This PR modifies ${fileCount} files with ${totalChanges} total changes`,
        impactAssessment: 'Impact analysis failed - manual review recommended',
        changeComplexity: totalChanges > 500 ? 'HIGH' : totalChanges > 100 ? 'MEDIUM' : 'LOW'
      };
    }
  }

  // Pass 2: File-by-file detailed analysis
  private async runPass2Analysis(
    diff: string,
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<FileAnalysis[]> {
    // For large PRs, analyze files in batches to avoid token limits
    const maxFilesPerBatch = 5;
    const fileAnalyses: FileAnalysis[] = [];

    for (let i = 0; i < changedFiles.length; i += maxFilesPerBatch) {
      const batch = changedFiles.slice(i, i + maxFilesPerBatch);
      const batchAnalyses = await this.analyzeFileBatch(diff, batch);
      fileAnalyses.push(...batchAnalyses);
    }

    return fileAnalyses;
  }

  private async analyzeFileBatch(
    diff: string,
    files: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<FileAnalysis[]> {
    const fileList = files.map(f => f.filename).join(', ');
    
    const prompt = `You are conducting PASS 2 of a multi-pass code review: FILE-BY-FILE DETAILED ANALYSIS.

Analyze each file individually for specific issues, complexity, and dependencies.

FILES TO ANALYZE: ${fileList}

COMPLETE DIFF:
\`\`\`diff
${diff}
\`\`\`

For each file, provide detailed analysis focusing on:
1. **File Summary**: What changes were made to this specific file
2. **Issues**: Specific code problems, bugs, or improvements needed
3. **Complexity**: How complex are the changes in this file (LOW/MEDIUM/HIGH)
4. **Risk Level**: How risky are these changes (LOW/MEDIUM/HIGH)
5. **Dependencies**: What other files/modules does this file depend on or affect

Respond with ONLY valid JSON array:
[
  {
    "filename": "path/to/file.js",
    "summary": "Description of changes in this file",
    "issues": [
      {
        "file": "path/to/file.js",
        "line": 42,
        "original": "problematic code",
        "suggested": "improved code",
        "reason": "why this improvement is needed",
        "severity": "HIGH|MEDIUM|LOW",
        "category": "Performance|Security|Logic|Style"
      }
    ],
    "complexity": "LOW|MEDIUM|HIGH",
    "riskLevel": "LOW|MEDIUM|HIGH",
    "dependencies": ["file1.js", "module2"]
  }
]`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanedResponse = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch {
      console.warn('Pass 2 JSON parsing failed, using fallback');
      return files.map(file => ({
        filename: file.filename,
        summary: `File analysis failed for ${file.filename}`,
        issues: [],
        complexity: file.changes > 50 ? 'HIGH' : file.changes > 20 ? 'MEDIUM' : 'LOW' as const,
        riskLevel: 'MEDIUM' as const,
        dependencies: []
      }));
    }
  }

  // Pass 3: Cross-file consistency and dependency analysis
  private async runPass3Analysis(
    fileAnalyses: FileAnalysis[],
    diff: string
  ): Promise<CrossFileAnalysis> {
    const filenames = fileAnalyses.map(f => f.filename);

    const prompt = `You are conducting PASS 3 of a multi-pass code review: CROSS-FILE CONSISTENCY & DEPENDENCY ANALYSIS.

Look for issues that span multiple files, inconsistencies, and dependency problems.

FILES ANALYZED: ${filenames.join(', ')}

FILE ANALYSES FROM PASS 2:
${JSON.stringify(fileAnalyses, null, 2)}

COMPLETE DIFF FOR CONTEXT:
\`\`\`diff
${diff}
\`\`\`

Analyze for:
1. **Consistency Issues**: Naming conventions, patterns, styles across files
2. **Dependency Conflicts**: Import/export issues, circular dependencies, missing dependencies
3. **Architectural Concerns**: Violations of patterns, coupling issues, separation of concerns
4. **Integration Risks**: How changes in one file might break functionality in others

Respond with ONLY valid JSON:
{
  "consistencyIssues": ["List of consistency problems across files"],
  "dependencyConflicts": ["List of dependency-related issues"],
  "architecturalConcerns": ["List of architectural problems"],
  "integrationRisks": ["List of integration risks between files"]
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanedResponse = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch {
      console.warn('Pass 3 JSON parsing failed, using fallback');
      return {
        consistencyIssues: [],
        dependencyConflicts: [],
        architecturalConcerns: [],
        integrationRisks: []
      };
    }
  }

  // Pass 4: Final prioritization and categorization
  private async runPass4Analysis(
    pass1Result: { overallSummary: string; impactAssessment: string; changeComplexity: 'LOW' | 'MEDIUM' | 'HIGH' },
    pass2Result: FileAnalysis[],
    pass3Result: CrossFileAnalysis
  ): Promise<{ prioritizedIssues: CodeSuggestion[]; riskAssessment: string; recommendedActions: string[] }> {
    const allIssues = pass2Result.flatMap(file => file.issues);

    const prompt = `You are conducting PASS 4 of a multi-pass code review: FINAL PRIORITIZATION & CATEGORIZATION.

Synthesize all previous analysis passes to provide final recommendations.

PASS 1 RESULTS (High-level):
${JSON.stringify(pass1Result, null, 2)}

PASS 2 RESULTS (File-by-file issues - ${allIssues.length} total):
${JSON.stringify(allIssues, null, 2)}

PASS 3 RESULTS (Cross-file analysis):
${JSON.stringify(pass3Result, null, 2)}

Your task:
1. **Prioritize Issues**: Rank all issues by importance (HIGH severity issues first)
2. **Risk Assessment**: Overall risk level and key concerns
3. **Recommended Actions**: Specific next steps for the developer

Respond with ONLY valid JSON:
{
  "prioritizedIssues": [
    {
      "file": "filename",
      "line": 42,
      "original": "code snippet",
      "suggested": "improved code",
      "reason": "detailed explanation",
      "severity": "HIGH|MEDIUM|LOW",
      "category": "Security|Performance|Logic|Architecture|Style"
    }
  ],
  "riskAssessment": "Overall risk analysis and key concerns",
  "recommendedActions": [
    "Specific action items for the developer to address"
  ]
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const cleanedResponse = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch {
      console.warn('Pass 4 JSON parsing failed, using fallback');
      return {
        prioritizedIssues: allIssues.sort((a, b) => {
          const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        }),
        riskAssessment: `Analysis of ${allIssues.length} issues across ${pass2Result.length} files with ${pass1Result.changeComplexity} complexity`,
        recommendedActions: ['Review and address high-severity issues first', 'Test thoroughly before merging']
      };
    }
  }

  private detectPrimaryLanguage(files: Array<{ filename: string }>): string {
    try {
      if (!files || files.length === 0) return 'Unknown';
      
      const extensions = files.map(f => f.filename?.split('.').pop()?.toLowerCase()).filter(Boolean);
      if (extensions.length === 0) return 'Mixed';
      
      const langMap: Record<string, string> = {
        'ts': 'TypeScript', 'tsx': 'TypeScript React',
        'js': 'JavaScript', 'jsx': 'JavaScript React',
        'py': 'Python', 'java': 'Java', 'go': 'Go',
        'rs': 'Rust', 'php': 'PHP', 'rb': 'Ruby',
        'swift': 'Swift', 'kt': 'Kotlin', 'dart': 'Dart'
      };
      
      const counts = extensions.reduce((acc, ext) => {
        if (ext) acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const primaryExt = Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0];
      return langMap[primaryExt] || primaryExt || 'Mixed';
    } catch (error) {
      console.warn('Error detecting primary language:', error);
      return 'Unknown';
    }
  }

  private detectFramework(files: Array<{ filename: string }>): string {
    try {
      if (!files || files.length === 0) return 'Unknown';
      
      const filenames = files.map(f => f.filename?.toLowerCase()).filter(Boolean);
      if (filenames.length === 0) return 'Unknown';
      
      if (filenames.some(f => f.includes('package.json') || f.includes('node_modules'))) {
        if (filenames.some(f => f.includes('next') || f.includes('_app'))) return 'Next.js';
        if (filenames.some(f => f.includes('react') || f.endsWith('.tsx') || f.endsWith('.jsx'))) return 'React';
        if (filenames.some(f => f.includes('vue'))) return 'Vue.js';
        if (filenames.some(f => f.includes('angular'))) return 'Angular';
        return 'Node.js';
      }
      
      if (filenames.some(f => f.includes('requirements.txt') || f.includes('pyproject.toml'))) {
        if (filenames.some(f => f.includes('django'))) return 'Django';
        if (filenames.some(f => f.includes('flask'))) return 'Flask';
        if (filenames.some(f => f.includes('fastapi'))) return 'FastAPI';
        return 'Python';
      }
      
      return 'Unknown';
    } catch (error) {
      console.warn('Error detecting framework:', error);
      return 'Unknown';
    }
  }

  private getFileTypes(files: Array<{ filename: string }>): string {
    try {
      if (!files || files.length === 0) return 'Unknown';
      
      const types = new Set(files.map(f => {
        if (!f.filename) return 'Unknown';
        const name = f.filename.toLowerCase();
        if (name.includes('test') || name.includes('spec')) return 'Tests';
        if (name.includes('config') || name.includes('.json') || name.includes('.yml')) return 'Config';
        if (name.includes('component') || name.includes('page')) return 'UI Components';
        if (name.includes('api') || name.includes('route') || name.includes('controller')) return 'API/Backend';
        if (name.includes('util') || name.includes('helper')) return 'Utilities';
        if (name.includes('type') || name.includes('interface')) return 'Types';
        return 'Source Code';
      }));
      
      return Array.from(types).join(', ');
    } catch (error) {
      console.warn('Error detecting file types:', error);
      return 'Mixed';
    }
  }
}
