export interface CodePatch {
  file: string;
  originalContent: string;
  patchedContent: string;
  description: string;
  type: 'fix' | 'refactor' | 'optimization' | 'security';
}

export interface AISuggestion {
  file: string;
  line?: number;
  issue: string;
  suggestion: string;
  reasoning: string;
  severity: 'error' | 'warning' | 'info';
  category: 'Security' | 'Performance' | 'Maintainability' | 'Style' | 'Bug' | 'Architecture';
  patch?: string;
}
