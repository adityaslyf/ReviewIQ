import * as fs from 'fs/promises';
import * as path from 'path';
import type { CodePatch, AISuggestion } from '../types/sandbox';

// Re-export types for backward compatibility
export type { CodePatch, AISuggestion };

export interface PatchGenerationResult {
  patches: CodePatch[];
  skipped: Array<{
    suggestion: AISuggestion;
    reason: string;
  }>;
  summary: {
    totalSuggestions: number;
    patchesGenerated: number;
    skippedCount: number;
    categories: Record<string, number>;
  };
}

export class PatchGeneratorService {
  /**
   * Generate code patches from AI suggestions
   */
  async generatePatches(
    suggestions: AISuggestion[],
    fileContents: Record<string, string>
  ): Promise<PatchGenerationResult> {
    const patches: CodePatch[] = [];
    const skipped: Array<{ suggestion: AISuggestion; reason: string }> = [];
    const categories: Record<string, number> = {};

    for (const suggestion of suggestions) {
      try {
        // Count categories
        categories[suggestion.category] = (categories[suggestion.category] || 0) + 1;

        // Skip if no file content available
        if (!fileContents[suggestion.file]) {
          skipped.push({
            suggestion,
            reason: 'File content not available'
          });
          continue;
        }

        // Generate patch based on suggestion type
        const patch = await this.generateSinglePatch(suggestion, fileContents[suggestion.file]);
        
        if (patch) {
          patches.push(patch);
        } else {
          skipped.push({
            suggestion,
            reason: 'Could not generate applicable patch'
          });
        }
      } catch (error) {
        console.error(`Failed to generate patch for ${suggestion.file}:`, error);
        skipped.push({
          suggestion,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      patches,
      skipped,
      summary: {
        totalSuggestions: suggestions.length,
        patchesGenerated: patches.length,
        skippedCount: skipped.length,
        categories
      }
    };
  }

  /**
   * Generate a single patch from an AI suggestion
   */
  private async generateSinglePatch(
    suggestion: AISuggestion,
    originalContent: string
  ): Promise<CodePatch | null> {
    // If suggestion already includes a patch, use it
    if (suggestion.patch) {
      return {
        file: suggestion.file,
        originalContent,
        patchedContent: suggestion.patch,
        description: suggestion.suggestion,
        type: this.mapCategoryToPatchType(suggestion.category)
      };
    }

    // Generate patch based on suggestion category and content
    const patchedContent = await this.applyAISuggestion(suggestion, originalContent);
    
    if (patchedContent && patchedContent !== originalContent) {
      return {
        file: suggestion.file,
        originalContent,
        patchedContent,
        description: suggestion.suggestion,
        type: this.mapCategoryToPatchType(suggestion.category)
      };
    }

    return null;
  }

  /**
   * Apply AI suggestion to generate patched content
   */
  private async applyAISuggestion(
    suggestion: AISuggestion,
    originalContent: string
  ): Promise<string | null> {
    const lines = originalContent.split('\n');
    
    try {
      switch (suggestion.category) {
        case 'Security':
          return this.applySecurityFix(suggestion, lines);
        
        case 'Performance':
          return this.applyPerformanceFix(suggestion, lines);
        
        case 'Bug':
          return this.applyBugFix(suggestion, lines);
        
        case 'Style':
          return this.applyStyleFix(suggestion, lines);
        
        case 'Maintainability':
          return this.applyMaintainabilityFix(suggestion, lines);
        
        case 'Architecture':
          return this.applyArchitectureFix(suggestion, lines);
        
        default:
          return this.applyGenericFix(suggestion, lines);
      }
    } catch (error) {
      console.error(`Failed to apply ${suggestion.category} fix:`, error);
      return null;
    }
  }

  /**
   * Apply security-related fixes
   */
  private applySecurityFix(suggestion: AISuggestion, lines: string[]): string | null {
    const targetLine = suggestion.line ? suggestion.line - 1 : -1;
    
    // Common security fixes
    if (suggestion.issue.toLowerCase().includes('eval')) {
      return this.replaceInLines(lines, /eval\s*\(/g, 'JSON.parse(');
    }
    
    if (suggestion.issue.toLowerCase().includes('innerhtml')) {
      return this.replaceInLines(lines, /\.innerHTML\s*=/g, '.textContent =');
    }
    
    if (suggestion.issue.toLowerCase().includes('http:')) {
      return this.replaceInLines(lines, /http:/g, 'https:');
    }
    
    if (suggestion.issue.toLowerCase().includes('password') && suggestion.issue.toLowerCase().includes('plain')) {
      // Add basic password hashing (example)
      if (targetLine >= 0 && targetLine < lines.length) {
        const line = lines[targetLine];
        if (line.includes('password') && !line.includes('hash') && !line.includes('bcrypt')) {
          lines[targetLine] = line.replace(/password\s*=\s*([^;]+)/, 'password = await bcrypt.hash($1, 10)');
          return lines.join('\n');
        }
      }
    }
    
    return null;
  }

  /**
   * Apply performance-related fixes
   */
  private applyPerformanceFix(suggestion: AISuggestion, lines: string[]): string | null {
    // Convert for loops to more efficient alternatives
    if (suggestion.issue.toLowerCase().includes('for loop') || suggestion.issue.toLowerCase().includes('inefficient')) {
      return this.replaceInLines(lines, /for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*(\w+)\.length;\s*i\+\+\s*\)/g, 
        'for (const item of $1)');
    }
    
    // Add memoization hints
    if (suggestion.issue.toLowerCase().includes('expensive') && suggestion.issue.toLowerCase().includes('calculation')) {
      const targetLine = suggestion.line ? suggestion.line - 1 : -1;
      if (targetLine >= 0 && targetLine < lines.length) {
        lines.splice(targetLine, 0, '  // TODO: Consider memoizing this expensive calculation');
        return lines.join('\n');
      }
    }
    
    return null;
  }

  /**
   * Apply bug fixes
   */
  private applyBugFix(suggestion: AISuggestion, lines: string[]): string | null {
    const targetLine = suggestion.line ? suggestion.line - 1 : -1;
    
    // Null/undefined checks
    if (suggestion.issue.toLowerCase().includes('null') || suggestion.issue.toLowerCase().includes('undefined')) {
      if (targetLine >= 0 && targetLine < lines.length) {
        const line = lines[targetLine];
        // Add null check before property access
        const propertyAccess = line.match(/(\w+)\.(\w+)/);
        if (propertyAccess) {
          lines[targetLine] = line.replace(propertyAccess[0], `${propertyAccess[1]}?.${propertyAccess[2]}`);
          return lines.join('\n');
        }
      }
    }
    
    // Array bounds checking
    if (suggestion.issue.toLowerCase().includes('array') && suggestion.issue.toLowerCase().includes('bounds')) {
      return this.replaceInLines(lines, /\[(\w+)\]/g, '[$1] || undefined');
    }
    
    return null;
  }

  /**
   * Apply style fixes
   */
  private applyStyleFix(suggestion: AISuggestion, lines: string[]): string | null {
    // Convert var to const/let
    if (suggestion.issue.toLowerCase().includes('var')) {
      return this.replaceInLines(lines, /\bvar\b/g, 'const');
    }
    
    // Add missing semicolons
    if (suggestion.issue.toLowerCase().includes('semicolon')) {
      return this.replaceInLines(lines, /([^;])\s*$/gm, '$1;');
    }
    
    // Fix indentation (basic)
    if (suggestion.issue.toLowerCase().includes('indent')) {
      return lines.map(line => line.replace(/^\t+/, match => '  '.repeat(match.length))).join('\n');
    }
    
    return null;
  }

  /**
   * Apply maintainability fixes
   */
  private applyMaintainabilityFix(suggestion: AISuggestion, lines: string[]): string | null {
    const targetLine = suggestion.line ? suggestion.line - 1 : -1;
    
    // Add type annotations
    if (suggestion.issue.toLowerCase().includes('type') && targetLine >= 0 && targetLine < lines.length) {
      const line = lines[targetLine];
      if (line.includes('function') && !line.includes(':')) {
        lines[targetLine] = line.replace(/\)(\s*{)/, '): any$1');
        return lines.join('\n');
      }
    }
    
    // Extract magic numbers
    if (suggestion.issue.toLowerCase().includes('magic number')) {
      const numbers = suggestion.issue.match(/\b\d+\b/g);
      if (numbers && targetLine >= 0) {
        lines.splice(targetLine, 0, `  const CONSTANT_VALUE = ${numbers[0]};`);
        return lines.join('\n');
      }
    }
    
    return null;
  }

  /**
   * Apply architecture fixes
   */
  private applyArchitectureFix(suggestion: AISuggestion, lines: string[]): string | null {
    const targetLine = suggestion.line ? suggestion.line - 1 : -1;
    
    // Add interface definitions
    if (suggestion.issue.toLowerCase().includes('interface') && targetLine >= 0) {
      const interfaceName = suggestion.suggestion.match(/interface\s+(\w+)/)?.[1] || 'NewInterface';
      lines.splice(targetLine, 0, `interface ${interfaceName} {`, '  // TODO: Define interface properties', '}', '');
      return lines.join('\n');
    }
    
    // Add error handling
    if (suggestion.issue.toLowerCase().includes('error handling')) {
      if (targetLine >= 0 && targetLine < lines.length) {
        const line = lines[targetLine];
        if (line.includes('await') && !line.includes('try')) {
          lines[targetLine] = '  try {';
          lines.splice(targetLine + 1, 0, `    ${line.trim()}`);
          lines.splice(targetLine + 2, 0, '  } catch (error) {');
          lines.splice(targetLine + 3, 0, '    console.error("Error:", error);');
          lines.splice(targetLine + 4, 0, '    throw error;');
          lines.splice(targetLine + 5, 0, '  }');
          return lines.join('\n');
        }
      }
    }
    
    return null;
  }

  /**
   * Apply generic fixes based on suggestion text
   */
  private applyGenericFix(suggestion: AISuggestion, lines: string[]): string | null {
    const targetLine = suggestion.line ? suggestion.line - 1 : -1;
    
    // Add comments for complex suggestions
    if (targetLine >= 0 && targetLine < lines.length) {
      lines.splice(targetLine, 0, `  // ${suggestion.suggestion}`);
      return lines.join('\n');
    }
    
    return null;
  }

  /**
   * Helper to replace patterns in lines
   */
  private replaceInLines(lines: string[], pattern: RegExp, replacement: string): string {
    return lines.map(line => line.replace(pattern, replacement)).join('\n');
  }

  /**
   * Map AI suggestion category to patch type
   */
  private mapCategoryToPatchType(category: string): CodePatch['type'] {
    switch (category) {
      case 'Security':
        return 'security';
      case 'Performance':
        return 'optimization';
      case 'Bug':
        return 'fix';
      case 'Style':
      case 'Maintainability':
      case 'Architecture':
        return 'refactor';
      default:
        return 'fix';
    }
  }

  /**
   * Extract file contents from diff or repository
   */
  async extractFileContents(diff: string): Promise<Record<string, string>> {
    const fileContents: Record<string, string> = {};
    
    // Parse diff to extract file contents
    const diffLines = diff.split('\n');
    let currentFile = '';
    let currentContent: string[] = [];
    let inFileContent = false;
    
    for (const line of diffLines) {
      if (line.startsWith('diff --git')) {
        // Save previous file
        if (currentFile && currentContent.length > 0) {
          fileContents[currentFile] = currentContent.join('\n');
        }
        
        // Start new file
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        currentFile = match ? match[2] : '';
        currentContent = [];
        inFileContent = false;
      } else if (line.startsWith('@@')) {
        inFileContent = true;
      } else if (inFileContent && (line.startsWith(' ') || line.startsWith('+'))) {
        // Add line content (remove diff prefix)
        currentContent.push(line.substring(1));
      }
    }
    
    // Save last file
    if (currentFile && currentContent.length > 0) {
      fileContents[currentFile] = currentContent.join('\n');
    }
    
    return fileContents;
  }
}

// Singleton instance
let patchGeneratorService: PatchGeneratorService | null = null;

export function getPatchGeneratorService(): PatchGeneratorService {
  if (!patchGeneratorService) {
    patchGeneratorService = new PatchGeneratorService();
  }
  return patchGeneratorService;
}
