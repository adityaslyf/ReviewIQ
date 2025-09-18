import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CodeSuggestion {
  file: string;
  line?: number;
  original: string;
  suggested: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

export interface AIAnalysisResult {
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
    changedFiles: Array<{ filename: string; additions: number; deletions: number; changes: number }>
  ): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(prTitle, prDescription, diff, changedFiles);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseAIResponse(text);
    } catch (error) {
      console.error("Error analyzing PR with Gemini:", error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

    return `You are an expert code reviewer with deep expertise in software engineering best practices, security, performance optimization, and code quality. Analyze this GitHub pull request with the depth and thoroughness of CodeRabbit or similar professional code review tools.

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
}
