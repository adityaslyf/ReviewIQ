import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

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
}

export interface StaticAnalysisResult {
  issues: StaticAnalysisIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    toolsRun: string[];
    analysisTime: number;
  };
  toolResults: {
    eslint?: any;
    typescript?: any;
    security?: any;
  };
}

export class StaticAnalysisService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp-analysis');
  }

  async analyzeCode(
    files: Array<{ filename: string; content: string }>,
    repoContext?: { language: string; framework: string }
  ): Promise<StaticAnalysisResult> {
    const startTime = Date.now();
    const issues: StaticAnalysisIssue[] = [];
    const toolsRun: string[] = [];
    const toolResults: any = {};

    try {
      // Create temporary directory for analysis
      await this.setupTempDirectory();

      // Write files to temp directory
      await this.writeFilesToTemp(files);

      // Run ESLint for JavaScript/TypeScript files
      const jsFiles = files.filter(f => 
        f.filename.endsWith('.js') || 
        f.filename.endsWith('.ts') || 
        f.filename.endsWith('.jsx') || 
        f.filename.endsWith('.tsx')
      );
      
      if (jsFiles.length > 0) {
        const eslintResults = await this.runESLint(jsFiles);
        issues.push(...eslintResults.issues);
        toolResults.eslint = eslintResults.raw;
        toolsRun.push('ESLint');
      }

      // Run TypeScript compiler checks
      const tsFiles = files.filter(f => f.filename.endsWith('.ts') || f.filename.endsWith('.tsx'));
      if (tsFiles.length > 0) {
        const tsResults = await this.runTypeScriptCheck(tsFiles);
        issues.push(...tsResults.issues);
        toolResults.typescript = tsResults.raw;
        toolsRun.push('TypeScript');
      }

      // Run security analysis
      const securityResults = await this.runSecurityAnalysis(files);
      if (securityResults.issues.length > 0) {
        issues.push(...securityResults.issues);
        toolResults.security = securityResults.raw;
        toolsRun.push('Security Scanner');
      }

      const analysisTime = Date.now() - startTime;

      return {
        issues,
        summary: {
          totalIssues: issues.length,
          errorCount: issues.filter(i => i.severity === 'error').length,
          warningCount: issues.filter(i => i.severity === 'warning').length,
          infoCount: issues.filter(i => i.severity === 'info').length,
          toolsRun,
          analysisTime
        },
        toolResults
      };

    } finally {
      // Clean up temporary files
      await this.cleanupTempDirectory();
    }
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

  private async runESLint(files: Array<{ filename: string; content: string }>): Promise<{ issues: StaticAnalysisIssue[]; raw: any }> {
    const issues: StaticAnalysisIssue[] = [];
    
    try {
      // Create a basic ESLint config
      const eslintConfig = {
        env: {
          browser: true,
          es2021: true,
          node: true
        },
        extends: [
          'eslint:recommended'
        ],
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module'
        },
        rules: {
          'no-unused-vars': 'warn',
          'no-console': 'warn',
          'prefer-const': 'error',
          'no-var': 'error',
          'eqeqeq': 'error',
          'no-eval': 'error',
          'no-implied-eval': 'error'
        }
      };

      await fs.writeFile(
        path.join(this.tempDir, '.eslintrc.json'), 
        JSON.stringify(eslintConfig, null, 2)
      );

      // Run ESLint on the files
      const fileList = files.map(f => path.join(this.tempDir, f.filename)).join(' ');
      const command = `npx eslint --format json ${fileList}`;
      
      try {
        const { stdout } = await execAsync(command, { cwd: this.tempDir });
        const eslintResults = JSON.parse(stdout);

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
              category: this.categorizeESLintRule(message.ruleId || '')
            });
          }
        }

        return { issues, raw: eslintResults };
      } catch (execError) {
        // ESLint returns non-zero exit code when issues are found
        if (execError instanceof Error && 'stdout' in execError) {
          try {
            const eslintResults = JSON.parse((execError as any).stdout);
            // Process results same as above
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
                  category: this.categorizeESLintRule(message.ruleId || '')
                });
              }
            }
            return { issues, raw: eslintResults };
          } catch {
            // If we can't parse the output, return empty results
            return { issues: [], raw: null };
          }
        }
      }
    } catch (error) {
      console.warn('ESLint analysis failed:', error);
    }

    return { issues, raw: null };
  }

  private async runTypeScriptCheck(files: Array<{ filename: string; content: string }>): Promise<{ issues: StaticAnalysisIssue[]; raw: any }> {
    const issues: StaticAnalysisIssue[] = [];
    
    try {
      // Create a basic tsconfig.json
      const tsConfig = {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM"],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: "node",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx"
        },
        include: ["**/*"],
        exclude: ["node_modules"]
      };

      await fs.writeFile(
        path.join(this.tempDir, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      // Run TypeScript compiler
      const command = 'npx tsc --noEmit --pretty false';
      
      try {
        await execAsync(command, { cwd: this.tempDir });
        // No output means no errors
        return { issues, raw: null };
      } catch (execError) {
        if (execError instanceof Error && 'stderr' in execError) {
          const output = (execError as any).stderr || (execError as any).stdout;
          const lines = output.split('\n').filter((line: string) => line.trim());
          
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
                category: 'type'
              });
            }
          }
        }
        
        return { issues, raw: execError };
      }
    } catch (error) {
      console.warn('TypeScript analysis failed:', error);
    }

    return { issues, raw: null };
  }

  private async runSecurityAnalysis(files: Array<{ filename: string; content: string }>): Promise<{ issues: StaticAnalysisIssue[]; raw: any }> {
    const issues: StaticAnalysisIssue[] = [];
    
    // Simple pattern-based security analysis
    const securityPatterns = [
      {
        pattern: /eval\s*\(/g,
        message: 'Use of eval() can lead to code injection vulnerabilities',
        rule: 'no-eval',
        severity: 'error' as const
      },
      {
        pattern: /innerHTML\s*=/g,
        message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
        rule: 'no-inner-html',
        severity: 'warning' as const
      },
      {
        pattern: /document\.write\s*\(/g,
        message: 'document.write can be dangerous and should be avoided',
        rule: 'no-document-write',
        severity: 'warning' as const
      },
      {
        pattern: /password.*=.*['"]\w+['"]/gi,
        message: 'Hardcoded password detected',
        rule: 'no-hardcoded-password',
        severity: 'error' as const
      },
      {
        pattern: /api[_-]?key.*=.*['"]\w+['"]/gi,
        message: 'Hardcoded API key detected',
        rule: 'no-hardcoded-api-key',
        severity: 'error' as const
      },
      {
        pattern: /console\.log\s*\(/g,
        message: 'Console.log statements should be removed in production',
        rule: 'no-console',
        severity: 'info' as const
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
              tool: 'Security Scanner',
              file: file.filename,
              line: lineIndex + 1,
              column: match.index || 0,
              severity: pattern.severity,
              rule: pattern.rule,
              message: pattern.message,
              category: 'security'
            });
          }
        }
      }
    }

    return { issues, raw: { patterns: securityPatterns.length, filesScanned: files.length } };
  }

  private categorizeESLintRule(ruleId: string): 'syntax' | 'type' | 'security' | 'performance' | 'style' | 'maintainability' {
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

  private async cleanupTempDirectory(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }

  // Extract file content from GitHub diff
  extractFileContents(diff: string): Array<{ filename: string; content: string }> {
    const files: Array<{ filename: string; content: string }> = [];
    const diffLines = diff.split('\n');
    
    let currentFile = '';
    let currentContent: string[] = [];
    
    for (const line of diffLines) {
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
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        // Add new lines (excluding diff metadata)
        currentContent.push(line.substring(1));
      } else if (!line.startsWith('-') && !line.startsWith('@@') && !line.startsWith('index')) {
        // Add unchanged lines for context
        currentContent.push(line);
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

// Helper function to get static analysis service
let staticAnalysisService: StaticAnalysisService | null = null;

export function getStaticAnalysisService(): StaticAnalysisService {
  if (!staticAnalysisService) {
    staticAnalysisService = new StaticAnalysisService();
  }
  return staticAnalysisService;
}
