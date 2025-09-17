import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIAnalysisResult {
  summary: string;
  refactorSuggestions: string;
  potentialIssues: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any; // GoogleGenerativeAI model

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key must be provided");
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

    return `You are an expert code reviewer analyzing a GitHub pull request. Please provide a comprehensive analysis in the following JSON format:

{
  "summary": "A concise TL;DR summary of what this PR does (2-3 sentences max)",
  "refactorSuggestions": "Specific refactoring suggestions focusing on:\n- Code readability and maintainability\n- DRY principles and code duplication\n- Better naming conventions\n- Modularization opportunities\n- Performance improvements\n\nFormat as bullet points with specific file/line references when possible",
  "potentialIssues": "Potential issues to watch out for:\n- Logic errors or edge cases\n- Security vulnerabilities\n- Performance bottlenecks\n- Memory leaks\n- Breaking changes\n- Missing error handling\n\nFormat as bullet points with severity levels (HIGH/MEDIUM/LOW)"
}

PR Details:
Title: ${prTitle}
Description: ${prDescription || 'No description provided'}

Files Changed:
${fileSummary}

Diff:
\`\`\`
${diff}
\`\`\`

Please analyze this code change and provide actionable feedback. Focus on practical improvements that would make the code more maintainable, secure, and performant.`;
  }

  private parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || "Analysis completed",
        refactorSuggestions: parsed.refactorSuggestions || "No refactoring suggestions",
        potentialIssues: parsed.potentialIssues || "No potential issues identified"
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.log("Raw AI response:", response);
      
      // Fallback parsing if JSON parsing fails
      return {
        summary: response.substring(0, 200) + (response.length > 200 ? "..." : ""),
        refactorSuggestions: "Unable to parse refactoring suggestions",
        potentialIssues: "Unable to parse potential issues"
      };
    }
  }
}
