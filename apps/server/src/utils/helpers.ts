/**
 * Helper function to extract AI suggestions from analysis result
 */
export function extractAISuggestions(analysisResult: any): Array<{
  file: string;
  line?: number;
  issue: string;
  suggestion: string;
  reasoning: string;
  severity: "error" | "warning" | "info";
  category:
    | "Security"
    | "Performance"
    | "Maintainability"
    | "Style"
    | "Bug"
    | "Architecture";
}> {
  const suggestions: any[] = [];

  try {
    // Extract from detailed analysis if available
    if (analysisResult.detailedAnalysis?.codeSuggestions) {
      for (const suggestion of analysisResult.detailedAnalysis.codeSuggestions) {
        suggestions.push({
          file: suggestion.file || "unknown",
          line: suggestion.line || 1,
          issue: suggestion.reason || "Issue detected",
          suggestion:
            suggestion.suggested || suggestion.reason || "Fix recommended",
          reasoning: suggestion.reason || "Improvement recommended",
          severity:
            suggestion.severity === "error"
              ? "error"
              : suggestion.severity === "warning"
                ? "warning"
                : "info",
          category: suggestion.category || "Maintainability",
        });
      }
    }

    // Extract from security concerns
    if (analysisResult.detailedAnalysis?.securityConcerns) {
      for (const concern of analysisResult.detailedAnalysis.securityConcerns) {
        if (typeof concern === "string") {
          const parts = concern.split(":");
          suggestions.push({
            file: parts[0] || "unknown",
            issue: parts[1] || concern,
            suggestion: `Address security concern: ${parts[1] || concern}`,
            reasoning: "Security vulnerability detected",
            severity: "error" as const,
            category: "Security" as const,
          });
        }
      }
    }
  } catch (error) {
    console.warn("Failed to extract AI suggestions:", error);
  }

  return suggestions;
}

/**
 * Generate original code example from issue/suggestion text
 */
export function generateOriginalCodeExample(item: any): string {
  const text = item.issue || item.suggestion || "";
  const lowerText = text.toLowerCase();

  if (lowerText.includes("function") || lowerText.includes("method")) {
    return `function example() {\n  // Original implementation\n  return 'current approach';\n}`;
  }

  if (
    lowerText.includes("variable") ||
    lowerText.includes("const") ||
    lowerText.includes("let")
  ) {
    return `let variable = 'current value';`;
  }

  if (lowerText.includes("import") || lowerText.includes("export")) {
    return `import { currentMethod } from './current-module';`;
  }

  if (lowerText.includes("async") || lowerText.includes("promise")) {
    return `function getData() {\n  return fetch('/api/data');\n}`;
  }

  // Default fallback with actual code structure
  return `// Current implementation\nconst currentCode = {\n  // ${text.slice(0, 30)}...\n};`;
}

/**
 * Generate suggested code example from issue/suggestion text
 */
export function generateSuggestedCodeExample(item: any): string {
  const text = item.suggestion || item.issue || "";
  const lowerText = text.toLowerCase();

  if (lowerText.includes("function") || lowerText.includes("method")) {
    return `function example() {\n  // Improved implementation\n  return 'better approach';\n}`;
  }

  if (
    lowerText.includes("variable") ||
    lowerText.includes("const") ||
    lowerText.includes("let")
  ) {
    return `const variable = 'improved value';`;
  }

  if (lowerText.includes("import") || lowerText.includes("export")) {
    return `import { improvedMethod } from './improved-module';`;
  }

  if (lowerText.includes("async") || lowerText.includes("promise")) {
    return `async function getData() {\n  return await fetch('/api/data');\n}`;
  }

  // Default fallback with actual code structure
  return `// Improved implementation\nconst improvedCode = {\n  // ${text.slice(0, 30)}...\n};`;
}

/**
 * Convert enhanced analysis to legacy format for database compatibility
 */
export function convertToLegacyFormat(proAnalysis: any) {
  const formatSuggestions = (suggestions: any[]) => {
    return suggestions
      .map(
        (s) =>
          `**${s.file} (${s.severity}):** ${s.issue}\n- ${s.suggestion}\n- Reasoning: ${s.reasoning}`
      )
      .join("\n\n");
  };

  return {
    summary: proAnalysis.summary,
    refactorSuggestions: formatSuggestions(
      proAnalysis.refactorSuggestions || []
    ),
    potentialIssues: formatSuggestions(proAnalysis.potentialIssues || []),
    detailedAnalysis: {
      overview: `Enhanced Analysis: ${proAnalysis.summary}. Final Verdict: ${proAnalysis.finalVerdict}`,
      codeSuggestions: [
        ...(proAnalysis.refactorSuggestions || []),
        ...(proAnalysis.potentialIssues || []),
      ].map((s: any) => ({
        file: s.file,
        line: s.line || 1,
        original: s.originalCode || generateOriginalCodeExample(s),
        suggested:
          s.suggestedCode || s.suggestion || generateSuggestedCodeExample(s),
        reason: s.reasoning,
        severity: s.severity,
        category: s.category,
      })),
      securityConcerns: (proAnalysis.potentialIssues || [])
        .filter((issue: any) => issue.category === "Security")
        .map((issue: any) => `${issue.file}: ${issue.issue}`),
      performanceImpact:
        (proAnalysis.potentialIssues || [])
          .filter((issue: any) => issue.category === "Performance")
          .map((issue: any) => issue.issue)
          .join(". ") || "No specific performance issues identified",
      testingRecommendations: (proAnalysis.testRecommendations || []).map(
        (test: any) => `${test.file}: ${test.suggestion}`
      ),
      architecturalNotes: (proAnalysis.refactorSuggestions || [])
        .filter((suggestion: any) => suggestion.category === "Architecture")
        .map((suggestion: any) => `${suggestion.file}: ${suggestion.suggestion}`),
    },
  };
}

