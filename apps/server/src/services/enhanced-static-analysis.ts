import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
// Tree-sitter imports commented out due to build issues - using fallback parsing
// import Parser from 'tree-sitter';
// import JavaScript from 'tree-sitter-javascript';
// import TypeScript from 'tree-sitter-typescript';
// import Python from 'tree-sitter-python';

const execAsync = promisify(exec);

export interface StaticAnalysisIssue {
  tool: string;
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  category: 'syntax' | 'type' | 'security' | 'performance' | 'style' | 'maintainability';
  suggestion?: string;
}

export interface CodeHunk {
  filename: string;
  startLine: number;
  endLine: number;
  content: string;
  functionName?: string;
  className?: string;
  type: 'function' | 'class' | 'method' | 'interface' | 'other';
}

export interface EnhancedStaticAnalysisResult {
  issues: StaticAnalysisIssue[];
  codeHunks: CodeHunk[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    toolsRun: string[];
    analysisTime: number;
    hunksExtracted: number;
  };
  toolResults: {
    eslint?: any;
    typescript?: any;
    semgrep?: any;
    treeSitter?: any;
  };
}

export class EnhancedStaticAnalysisService {
  private tempDir: string;
  // private parser: Parser;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp-enhanced-analysis');
    // this.parser = new Parser();
  }

  async analyzeCodeEnhanced(
    files: Array<{ filename: string; content: string }>,
    diff: string,
    repoContext?: { language: string; framework: string }
  ): Promise<EnhancedStaticAnalysisResult> {
    const startTime = Date.now();
    const issues: StaticAnalysisIssue[] = [];
    const codeHunks: CodeHunk[] = [];
    const toolsRun: string[] = [];
    const toolResults: any = {};

    try {
      // Create temporary directory for analysis
      await this.setupTempDirectory();

      // Write files to temp directory
      await this.writeFilesToTemp(files);

      // 1. Extract high-signal code hunks using simple parsing (AST fallback)
      console.log('🔍 Extracting code hunks with simple parsing...');
      const extractedHunks = await this.extractCodeHunksSimple(files, diff);
      codeHunks.push(...extractedHunks);
      toolResults.simpleParsing = { hunksExtracted: extractedHunks.length };

      // 2. Run enhanced ESLint with TypeScript support
      const jsFiles = files.filter(f => 
        f.filename.endsWith('.js') || 
        f.filename.endsWith('.ts') || 
        f.filename.endsWith('.jsx') || 
        f.filename.endsWith('.tsx')
      );
      
      if (jsFiles.length > 0) {
        console.log('🔧 Running enhanced ESLint analysis...');
        const eslintResults = await this.runEnhancedESLint(jsFiles);
        issues.push(...eslintResults.issues);
        toolResults.eslint = eslintResults.raw;
        toolsRun.push('ESLint');
      }

      // 3. Run TypeScript compiler checks with strict settings
      const tsFiles = files.filter(f => f.filename.endsWith('.ts') || f.filename.endsWith('.tsx'));
      if (tsFiles.length > 0) {
        console.log('📝 Running TypeScript analysis...');
        const tsResults = await this.runEnhancedTypeScriptCheck(tsFiles);
        issues.push(...tsResults.issues);
        toolResults.typescript = tsResults.raw;
        toolsRun.push('TypeScript');
      }

      // 4. Run enhanced security analysis
      console.log('🛡️ Running enhanced security analysis...');
      const securityResults = await this.runEnhancedSecurityAnalysis(files);
      if (securityResults.issues.length > 0) {
        issues.push(...securityResults.issues);
        toolResults.security = securityResults.raw;
        toolsRun.push('Security Scanner');
      }

      const analysisTime = Date.now() - startTime;
      console.log(`✅ Enhanced static analysis completed in ${analysisTime}ms`);

      return {
        issues: this.prioritizeIssues(issues),
        codeHunks,
        summary: {
          totalIssues: issues.length,
          errorCount: issues.filter(i => i.severity === 'error').length,
          warningCount: issues.filter(i => i.severity === 'warning').length,
          infoCount: issues.filter(i => i.severity === 'info').length,
          toolsRun,
          analysisTime,
          hunksExtracted: codeHunks.length
        },
        toolResults
      };

    } finally {
      // Clean up temporary files
      await this.cleanupTempDirectory();
    }
  }

  private async extractCodeHunksSimple(
    files: Array<{ filename: string; content: string }>,
    diff: string
  ): Promise<CodeHunk[]> {
    const hunks: CodeHunk[] = [];
    
    // Parse diff to identify changed line ranges
    const changedRanges = this.parseDiffForChangedRanges(diff);

    for (const file of files) {
      const ranges = changedRanges.get(file.filename) || [];
      if (ranges.length === 0) continue;

      try {
        const fileHunks = await this.extractFileHunksSimple(file, ranges);
        hunks.push(...fileHunks);
      } catch (error) {
        console.warn(`Failed to extract hunks from ${file.filename}:`, error);
      }
    }

    return hunks;
  }

  private async extractFileHunksSimple(
    file: { filename: string; content: string },
    changedRanges: Array<{ start: number; end: number }>
  ): Promise<CodeHunk[]> {
    // Use simple regex-based parsing for now
    return this.extractSimpleHunks(file, changedRanges);
  }

  private findRelevantNodes(rootNode: any, startLine: number, endLine: number): any[] {
    const relevantNodes: any[] = [];
    
    const traverse = (node: any) => {
      const nodeStartLine = node.startPosition.row + 1;
      const nodeEndLine = node.endPosition.row + 1;
      
      // Check if node overlaps with changed range
      if (nodeStartLine <= endLine && nodeEndLine >= startLine) {
        // Prioritize function and class declarations
        if (['function_declaration', 'method_definition', 'class_declaration', 
             'interface_declaration', 'arrow_function', 'function_expression'].includes(node.type)) {
          relevantNodes.push(node);
          return; // Don't traverse children if we found a function/class
        }
      }
      
      // Continue traversing children
      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };
    
    traverse(rootNode);
    return relevantNodes;
  }

  private createHunkFromNode(filename: string, node: any, content: string): CodeHunk | null {
    const lines = content.split('\n');
    const startLine = node.startPosition.row + 1;
    const endLine = node.endPosition.row + 1;
    
    // Add some context lines
    const contextLines = 3;
    const actualStartLine = Math.max(1, startLine - contextLines);
    const actualEndLine = Math.min(lines.length, endLine + contextLines);
    
    const hunkContent = lines.slice(actualStartLine - 1, actualEndLine).join('\n');
    
    // Extract function/class name
    let functionName: string | undefined;
    let className: string | undefined;
    let type: CodeHunk['type'] = 'other';
    
    if (node.type === 'function_declaration' || node.type === 'arrow_function') {
      type = 'function';
      functionName = this.extractIdentifierName(node);
    } else if (node.type === 'method_definition') {
      type = 'method';
      functionName = this.extractIdentifierName(node);
    } else if (node.type === 'class_declaration') {
      type = 'class';
      className = this.extractIdentifierName(node);
    } else if (node.type === 'interface_declaration') {
      type = 'interface';
      className = this.extractIdentifierName(node);
    }
    
    return {
      filename,
      startLine: actualStartLine,
      endLine: actualEndLine,
      content: hunkContent,
      functionName,
      className,
      type
    };
  }

  private extractIdentifierName(node: any): string | undefined {
    // Find identifier child node
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'identifier') {
        return child.text;
      }
    }
    return undefined;
  }

  private extractSimpleHunks(
    file: { filename: string; content: string },
    changedRanges: Array<{ start: number; end: number }>
  ): CodeHunk[] {
    const hunks: CodeHunk[] = [];
    const lines = file.content.split('\n');
    
    for (const range of changedRanges) {
      const contextLines = 5;
      const startLine = Math.max(1, range.start - contextLines);
      const endLine = Math.min(lines.length, range.end + contextLines);
      
      const hunkContent = lines.slice(startLine - 1, endLine).join('\n');
      
      // Simple function/class detection using regex
      let functionName: string | undefined;
      let className: string | undefined;
      let type: CodeHunk['type'] = 'other';
      
      // Look for function declarations
      const functionMatch = hunkContent.match(/(?:function|const|let|var)\s+(\w+)\s*[=\(]|(\w+)\s*:\s*\([^)]*\)\s*=>/);
      if (functionMatch) {
        functionName = functionMatch[1] || functionMatch[2];
        type = 'function';
      }
      
      // Look for class declarations
      const classMatch = hunkContent.match(/class\s+(\w+)/);
      if (classMatch) {
        className = classMatch[1];
        type = 'class';
      }
      
      // Look for method declarations
      const methodMatch = hunkContent.match(/(\w+)\s*\([^)]*\)\s*\{/);
      if (methodMatch && !functionMatch && !classMatch) {
        functionName = methodMatch[1];
        type = 'method';
      }
      
      hunks.push({
        filename: file.filename,
        startLine,
        endLine,
        content: hunkContent,
        functionName,
        className,
        type
      });
    }
    
    return hunks;
  }

  private parseDiffForChangedRanges(diff: string): Map<string, Array<{ start: number; end: number }>> {
    const ranges = new Map<string, Array<{ start: number; end: number }>>();
    const lines = diff.split('\n');
    
    let currentFile = '';
    let currentStart = 0;
    
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        currentFile = match ? match[2] : '';
      } else if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?(\d*) @@/);
        if (match && currentFile) {
          currentStart = parseInt(match[2]);
          const length = parseInt(match[3]) || 1;
          
          if (!ranges.has(currentFile)) {
            ranges.set(currentFile, []);
          }
          
          ranges.get(currentFile)!.push({
            start: currentStart,
            end: currentStart + length - 1
          });
        }
      }
    }
    
    return ranges;
  }

  private async runEnhancedESLint(files: Array<{ filename: string; content: string }>): Promise<{ issues: StaticAnalysisIssue[]; raw: any }> {
    const issues: StaticAnalysisIssue[] = [];
    
    try {
      // Create enhanced ESLint config with TypeScript support
      const eslintConfig = {
        env: {
          browser: true,
          es2021: true,
          node: true
        },
        extends: [
          'eslint:recommended',
          '@typescript-eslint/recommended'
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          project: './tsconfig.json'
        },
        plugins: ['@typescript-eslint'],
        rules: {
          // Security rules
          'no-eval': 'error',
          'no-implied-eval': 'error',
          'no-new-func': 'error',
          'no-script-url': 'error',
          
          // Performance rules
          'prefer-const': 'error',
          'no-var': 'error',
          'no-loop-func': 'warn',
          
          // Type safety
          '@typescript-eslint/no-explicit-any': 'warn',
          '@typescript-eslint/no-unused-vars': 'warn',
          '@typescript-eslint/prefer-nullish-coalescing': 'warn',
          '@typescript-eslint/prefer-optional-chain': 'warn',
          
          // Code quality
          'complexity': ['warn', { max: 10 }],
          'max-depth': ['warn', { max: 4 }],
          'max-lines-per-function': ['warn', { max: 50 }],
          
          // Best practices
          'eqeqeq': 'error',
          'no-console': 'warn',
          'no-debugger': 'error',
          'no-alert': 'error'
        }
      };

      await fs.writeFile(
        path.join(this.tempDir, '.eslintrc.json'), 
        JSON.stringify(eslintConfig, null, 2)
      );

      // Create basic tsconfig for ESLint
      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM"],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          moduleResolution: "node",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx"
        },
        include: ["**/*"]
      };

      await fs.writeFile(
        path.join(this.tempDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      // Run ESLint
      const fileList = files.map(f => path.join(this.tempDir, f.filename)).join(' ');
      const command = `npx eslint --format json ${fileList}`;
      
      try {
        const { stdout } = await execAsync(command, { cwd: this.tempDir });
        const eslintResults = JSON.parse(stdout);
        this.processESLintResults(eslintResults, issues);
        return { issues, raw: eslintResults };
      } catch (execError: any) {
        if (execError.stdout) {
          try {
            const eslintResults = JSON.parse(execError.stdout);
            this.processESLintResults(eslintResults, issues);
            return { issues, raw: eslintResults };
          } catch {
            console.warn('Failed to parse ESLint output');
          }
        }
      }
    } catch (error) {
      console.warn('Enhanced ESLint analysis failed:', error);
    }

    return { issues, raw: null };
  }

  private processESLintResults(eslintResults: any[], issues: StaticAnalysisIssue[]): void {
    for (const result of eslintResults) {
      for (const message of result.messages) {
        issues.push({
          tool: 'ESLint',
          file: path.relative(this.tempDir, result.filePath),
          line: message.line,
          column: message.column,
          severity: message.severity === 2 ? 'error' : message.severity === 1 ? 'warning' : 'info',
          rule: message.ruleId || 'unknown',
          message: message.message,
          category: this.categorizeESLintRule(message.ruleId || ''),
          suggestion: message.suggestions?.[0]?.desc
        });
      }
    }
  }

  private async runEnhancedTypeScriptCheck(files: Array<{ filename: string; content: string }>): Promise<{ issues: StaticAnalysisIssue[]; raw: any }> {
    const issues: StaticAnalysisIssue[] = [];
    
    try {
      // Create strict TypeScript config
      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM"],
          module: "ESNext",
          moduleResolution: "node",
          allowJs: true,
          checkJs: true,
          declaration: false,
          declarationMap: false,
          sourceMap: false,
          outDir: "./dist",
          removeComments: true,
          importHelpers: true,
          downlevelIteration: true,
          isolatedModules: true,
          
          // Strict type checking
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          strictFunctionTypes: true,
          strictBindCallApply: true,
          strictPropertyInitialization: true,
          noImplicitThis: true,
          alwaysStrict: true,
          
          // Additional checks
          noUnusedLocals: true,
          noUnusedParameters: true,
          exactOptionalPropertyTypes: true,
          noImplicitReturns: true,
          noFallthroughCasesInSwitch: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
          
          // Module resolution
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          skipLibCheck: true,
          
          noEmit: true,
          jsx: "react-jsx"
        },
        include: ["**/*"],
        exclude: ["node_modules", "dist"]
      };

      await fs.writeFile(
        path.join(this.tempDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      const command = 'npx tsc --noEmit --pretty false';
      
      try {
        await execAsync(command, { cwd: this.tempDir });
        return { issues, raw: null };
      } catch (execError: any) {
        const output = execError.stderr || execError.stdout;
        if (output) {
          this.parseTypeScriptErrors(output, issues);
        }
        return { issues, raw: execError };
      }
    } catch (error) {
      console.warn('Enhanced TypeScript analysis failed:', error);
    }

    return { issues, raw: null };
  }

  private parseTypeScriptErrors(output: string, issues: StaticAnalysisIssue[]): void {
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
      if (match) {
        const [, filePath, lineNum, colNum, errorCode, message] = match;
        issues.push({
          tool: 'TypeScript',
          file: path.relative(this.tempDir, filePath),
          line: parseInt(lineNum),
          column: parseInt(colNum),
          severity: 'error',
          rule: `TS${errorCode}`,
          message: message,
          category: this.categorizeTypeScriptError(errorCode)
        });
      }
    }
  }

  private async runEnhancedSecurityAnalysis(files: Array<{ filename: string; content: string }>): Promise<{ issues: StaticAnalysisIssue[]; raw: any }> {
    const issues: StaticAnalysisIssue[] = [];
    
    // Enhanced security patterns with more comprehensive detection
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        message: 'Use of eval() can lead to code injection vulnerabilities',
        rule: 'no-eval',
        severity: 'error' as const,
        category: 'security' as const,
        suggestion: 'Use JSON.parse() for data or create a safer alternative'
      },
      {
        pattern: /innerHTML\s*=/g,
        message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
        rule: 'no-inner-html',
        severity: 'warning' as const,
        category: 'security' as const,
        suggestion: 'Use textContent or a sanitization library'
      },
      {
        pattern: /document\.write\s*\(/g,
        message: 'document.write can be dangerous and should be avoided',
        rule: 'no-document-write',
        severity: 'warning' as const,
        category: 'security' as const,
        suggestion: 'Use DOM manipulation methods instead'
      },
      {
        pattern: /(password|pwd|secret|token|key).*=.*['"]\w+['"]/gi,
        message: 'Hardcoded credential detected - security risk',
        rule: 'no-hardcoded-credentials',
        severity: 'error' as const,
        category: 'security' as const,
        suggestion: 'Use environment variables or secure credential storage'
      },
      {
        pattern: /api[_-]?key.*=.*['"]\w{10,}['"]/gi,
        message: 'Hardcoded API key detected',
        rule: 'no-hardcoded-api-key',
        severity: 'error' as const,
        category: 'security' as const,
        suggestion: 'Store API keys in environment variables'
      },
      {
        pattern: /Math\.random\(\)/g,
        message: 'Math.random() is not cryptographically secure',
        rule: 'no-weak-random',
        severity: 'warning' as const,
        category: 'security' as const,
        suggestion: 'Use crypto.randomBytes() for security-sensitive operations'
      },
      {
        pattern: /localStorage\.|sessionStorage\./g,
        message: 'Web storage can be accessed by XSS attacks',
        rule: 'web-storage-security',
        severity: 'info' as const,
        category: 'security' as const,
        suggestion: 'Avoid storing sensitive data in web storage'
      },
      {
        pattern: /\.exec\(|child_process|spawn\(/g,
        message: 'Command execution detected - potential security risk',
        rule: 'command-injection',
        severity: 'warning' as const,
        category: 'security' as const,
        suggestion: 'Validate and sanitize all inputs to command execution'
      },
      {
        pattern: /SELECT.*FROM.*WHERE.*\+|UPDATE.*SET.*WHERE.*\+|INSERT.*VALUES.*\+/gi,
        message: 'Potential SQL injection vulnerability',
        rule: 'sql-injection',
        severity: 'error' as const,
        category: 'security' as const,
        suggestion: 'Use parameterized queries or prepared statements'
      },
      {
        pattern: /console\.log\s*\(/g,
        message: 'Console.log statements should be removed in production',
        rule: 'no-console',
        severity: 'info' as const,
        category: 'maintainability' as const,
        suggestion: 'Use proper logging framework or remove debug statements'
      },
      {
        pattern: /debugger;/g,
        message: 'Debugger statements should not be committed',
        rule: 'no-debugger',
        severity: 'warning' as const,
        category: 'maintainability' as const,
        suggestion: 'Remove debugger statements before committing'
      },
      {
        pattern: /fetch\s*\(\s*['"](http:\/\/|\/\/)/gi,
        message: 'Insecure HTTP requests detected',
        rule: 'no-insecure-requests',
        severity: 'warning' as const,
        category: 'security' as const,
        suggestion: 'Use HTTPS for all external requests'
      }
    ];

    for (const file of files) {
      const lines = file.content.split('\n');
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        
        for (const pattern of securityPatterns) {
          const matches = line.matchAll(pattern.pattern);
          for (const match of matches) {
            issues.push({
              tool: 'Enhanced Security Scanner',
              file: file.filename,
              line: lineIndex + 1,
              column: match.index || 0,
              severity: pattern.severity,
              rule: pattern.rule,
              message: pattern.message,
              category: pattern.category,
              suggestion: pattern.suggestion
            });
          }
        }
      }
    }

    return { 
      issues, 
      raw: { 
        patterns: securityPatterns.length, 
        filesScanned: files.length,
        totalLinesScanned: files.reduce((sum, f) => sum + f.content.split('\n').length, 0)
      } 
    };
  }

  private prioritizeIssues(issues: StaticAnalysisIssue[]): StaticAnalysisIssue[] {
    return issues.sort((a, b) => {
      // Sort by severity first
      const severityOrder = { error: 3, warning: 2, info: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by category importance
      const categoryOrder = { security: 5, performance: 4, type: 3, maintainability: 2, style: 1, syntax: 1 };
      return categoryOrder[b.category] - categoryOrder[a.category];
    });
  }

  private categorizeESLintRule(ruleId: string): StaticAnalysisIssue['category'] {
    const securityRules = ['no-eval', 'no-implied-eval', 'no-script-url', 'no-unsafe-innerHTML'];
    const performanceRules = ['no-loop-func', 'prefer-const', 'no-var'];
    const styleRules = ['indent', 'quotes', 'semi', 'comma-spacing', 'brace-style'];
    const maintainabilityRules = ['complexity', 'max-depth', 'max-lines', 'no-duplicate-code'];

    if (securityRules.some(rule => ruleId.includes(rule))) return 'security';
    if (performanceRules.some(rule => ruleId.includes(rule))) return 'performance';
    if (styleRules.some(rule => ruleId.includes(rule))) return 'style';
    if (maintainabilityRules.some(rule => ruleId.includes(rule))) return 'maintainability';
    
    return 'syntax';
  }

  private categorizeTypeScriptError(errorCode: string): StaticAnalysisIssue['category'] {
    // Common TypeScript error codes
    const typeErrors = ['2304', '2339', '2345', '2322', '2307', '2551'];
    const syntaxErrors = ['1005', '1009', '1014', '1016'];
    
    if (typeErrors.includes(errorCode)) return 'type';
    if (syntaxErrors.includes(errorCode)) return 'syntax';
    
    return 'type'; // Default for TypeScript errors
  }

  private categorizeSecurityRule(ruleId: string): StaticAnalysisIssue['category'] {
    if (ruleId.includes('security') || ruleId.includes('injection') || ruleId.includes('credentials')) {
      return 'security';
    }
    if (ruleId.includes('performance') || ruleId.includes('efficiency')) {
      return 'performance';
    }
    return 'maintainability';
  }

  private async setupTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create temp directory:', error);
    }
  }

  private async writeFilesToTemp(files: Array<{ filename: string; content: string }>): Promise<void> {
    for (const file of files) {
      const filePath = path.join(this.tempDir, file.filename);
      const dirPath = path.dirname(filePath);
      
      try {
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      } catch (error) {
        console.warn(`Failed to write file ${file.filename}:`, error);
      }
    }
  }

  private async cleanupTempDirectory(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }

  // Extract file content from GitHub diff with better parsing
  extractFileContents(diff: string): Array<{ filename: string; content: string }> {
    const files: Array<{ filename: string; content: string }> = [];
    const diffLines = diff.split('\n');
    
    let currentFile = '';
    let currentContent: string[] = [];
    let inFileContent = false;
    
    for (let i = 0; i < diffLines.length; i++) {
      const line = diffLines[i];
      
      if (line.startsWith('diff --git')) {
        // Save previous file if exists
        if (currentFile && currentContent.length > 0) {
          files.push({
            filename: currentFile,
            content: currentContent.join('\n')
          });
        }
        
        // Extract filename from diff header
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        currentFile = match ? match[2] : '';
        currentContent = [];
        inFileContent = false;
      } else if (line.startsWith('@@')) {
        inFileContent = true;
      } else if (inFileContent && !line.startsWith('+++') && !line.startsWith('---') && !line.startsWith('index')) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          // Add new lines (excluding diff metadata)
          currentContent.push(line.substring(1));
        } else if (line.startsWith(' ')) {
          // Add context lines
          currentContent.push(line.substring(1));
        }
        // Skip deleted lines (starting with -)
      }
    }
    
    // Save last file
    if (currentFile && currentContent.length > 0) {
      files.push({
        filename: currentFile,
        content: currentContent.join('\n')
      });
    }
    
    return files;
  }
}

// Helper function to get enhanced static analysis service
let enhancedStaticAnalysisService: EnhancedStaticAnalysisService | null = null;

export function getEnhancedStaticAnalysisService(): EnhancedStaticAnalysisService {
  if (!enhancedStaticAnalysisService) {
    enhancedStaticAnalysisService = new EnhancedStaticAnalysisService();
  }
  return enhancedStaticAnalysisService;
}
