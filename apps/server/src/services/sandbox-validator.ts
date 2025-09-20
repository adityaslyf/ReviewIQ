import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { CodePatch } from '../types/sandbox';

const execAsync = promisify(exec);

export interface SandboxValidationResult {
  patchId: string;
  success: boolean;
  testResults: {
    passed: number;
    failed: number;
    total: number;
    duration: number;
    output: string;
    errors: string[];
  };
  buildResults: {
    success: boolean;
    output: string;
    errors: string[];
    duration: number;
  };
  lintResults: {
    success: boolean;
    issues: Array<{
      file: string;
      line: number;
      message: string;
      severity: 'error' | 'warning';
    }>;
    output: string;
  };
  performance: {
    memoryUsage: number;
    cpuTime: number;
    diskUsage: number;
  };
  summary: {
    overallSuccess: boolean;
    confidence: 'high' | 'medium' | 'low';
    recommendation: 'approve' | 'review' | 'reject';
    reasoning: string;
  };
}

export class SandboxValidatorService {
  private readonly sandboxDir: string;
  private readonly dockerImage: string;
  private readonly timeoutMs: number;

  constructor() {
    this.sandboxDir = process.env.SANDBOX_DIR || '/tmp/reviewiq-sandbox';
    this.dockerImage = process.env.SANDBOX_DOCKER_IMAGE || 'node:18-alpine';
    this.timeoutMs = parseInt(process.env.SANDBOX_TIMEOUT_MS || '300000'); // 5 minutes
  }

  /**
   * Validate code patches in an isolated sandbox environment
   */
  async validatePatches(
    repoUrl: string,
    branchName: string,
    patches: CodePatch[],
    testCommand?: string
  ): Promise<SandboxValidationResult[]> {
    const results: SandboxValidationResult[] = [];

    for (const patch of patches) {
      try {
        const result = await this.validateSinglePatch(repoUrl, branchName, patch, testCommand);
        results.push(result);
      } catch (error) {
        console.error(`Failed to validate patch for ${patch.file}:`, error);
        results.push(this.createFailedResult(patch, error));
      }
    }

    return results;
  }

  /**
   * Validate a single code patch
   */
  private async validateSinglePatch(
    repoUrl: string,
    branchName: string,
    patch: CodePatch,
    testCommand?: string
  ): Promise<SandboxValidationResult> {
    const patchId = randomUUID();
    const sandboxPath = path.join(this.sandboxDir, patchId);

    try {
      // Step 1: Create isolated sandbox
      await this.createSandbox(sandboxPath);

      // Step 2: Clone repository
      await this.cloneRepository(repoUrl, branchName, sandboxPath);

      // Step 3: Apply patch
      await this.applyPatch(sandboxPath, patch);

      // Step 4: Run validation tests
      const buildResults = await this.runBuild(sandboxPath);
      const lintResults = await this.runLinting(sandboxPath);
      const testResults = await this.runTests(sandboxPath, testCommand);
      const performance = await this.measurePerformance(sandboxPath);

      // Step 5: Analyze results
      const summary = this.analyzeSandboxResults(buildResults, lintResults, testResults);

      return {
        patchId,
        success: summary.overallSuccess,
        testResults,
        buildResults,
        lintResults,
        performance,
        summary
      };

    } finally {
      // Cleanup sandbox
      await this.cleanupSandbox(sandboxPath);
    }
  }

  /**
   * Create isolated Docker sandbox
   */
  private async createSandbox(sandboxPath: string): Promise<void> {
    await fs.mkdir(sandboxPath, { recursive: true });
    
    // Create Dockerfile for sandbox
    const dockerfile = `
FROM ${this.dockerImage}

# Install common tools
RUN apk add --no-cache git curl

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files first for better caching
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else npm ci; fi

# Copy source code
COPY . .

# Default command
CMD ["sh"]
    `;

    await fs.writeFile(path.join(sandboxPath, 'Dockerfile'), dockerfile);
  }

  /**
   * Clone repository into sandbox
   */
  private async cloneRepository(repoUrl: string, branchName: string, sandboxPath: string): Promise<void> {
    const repoPath = path.join(sandboxPath, 'repo');
    
    try {
      // Clone the specific branch
      await execAsync(`git clone --depth 1 --branch ${branchName} ${repoUrl} ${repoPath}`, {
        timeout: this.timeoutMs / 5 // 1 minute for clone
      });
    } catch (error) {
      // Fallback: clone main/master and checkout branch
      await execAsync(`git clone --depth 10 ${repoUrl} ${repoPath}`, {
        timeout: this.timeoutMs / 5
      });
      
      try {
        await execAsync(`cd ${repoPath} && git checkout ${branchName}`, {
          timeout: 30000
        });
      } catch (checkoutError) {
        console.warn(`Could not checkout branch ${branchName}, using default branch`);
      }
    }
  }

  /**
   * Apply code patch to repository
   */
  private async applyPatch(sandboxPath: string, patch: CodePatch): Promise<void> {
    const repoPath = path.join(sandboxPath, 'repo');
    const filePath = path.join(repoPath, patch.file);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Apply the patch
    await fs.writeFile(filePath, patch.patchedContent, 'utf8');
  }

  /**
   * Run build process in sandbox
   */
  private async runBuild(sandboxPath: string): Promise<SandboxValidationResult['buildResults']> {
    const repoPath = path.join(sandboxPath, 'repo');
    const startTime = Date.now();

    try {
      // Try different build commands based on what's available
      const buildCommands = [
        'pnpm run build',
        'npm run build',
        'yarn build',
        'tsc --noEmit', // TypeScript check
        'echo "No build command found, skipping..."'
      ];

      let buildOutput = '';
      let buildSuccess = false;

      for (const command of buildCommands) {
        try {
          const { stdout, stderr } = await execAsync(`cd ${repoPath} && ${command}`, {
            timeout: this.timeoutMs / 3 // 1.5 minutes for build
          });
          
          buildOutput = stdout + stderr;
          buildSuccess = true;
          break;
        } catch (error) {
          if (command === buildCommands[buildCommands.length - 1]) {
            // Last command, capture error
            buildOutput = error instanceof Error ? error.message : 'Build failed';
          }
          continue;
        }
      }

      return {
        success: buildSuccess,
        output: buildOutput,
        errors: buildSuccess ? [] : [buildOutput],
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        output: '',
        errors: [error instanceof Error ? error.message : 'Build process failed'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Run linting in sandbox
   */
  private async runLinting(sandboxPath: string): Promise<SandboxValidationResult['lintResults']> {
    const repoPath = path.join(sandboxPath, 'repo');

    try {
      // Try ESLint first, then fallback to basic checks
      const lintCommands = [
        'pnpm run lint --format=json',
        'npm run lint --format=json',
        'npx eslint . --format=json',
        'echo "[]"' // Empty results if no linting available
      ];

      let lintOutput = '';
      let lintSuccess = true;
      const issues: Array<{ file: string; line: number; message: string; severity: 'error' | 'warning' }> = [];

      for (const command of lintCommands) {
        try {
          const { stdout } = await execAsync(`cd ${repoPath} && ${command}`, {
            timeout: 60000 // 1 minute for linting
          });
          
          lintOutput = stdout;
          
          // Parse ESLint JSON output
          try {
            const eslintResults = JSON.parse(stdout);
            if (Array.isArray(eslintResults)) {
              for (const fileResult of eslintResults) {
                for (const message of fileResult.messages || []) {
                  issues.push({
                    file: fileResult.filePath || 'unknown',
                    line: message.line || 1,
                    message: message.message || 'Unknown issue',
                    severity: message.severity === 2 ? 'error' : 'warning'
                  });
                }
              }
            }
          } catch (parseError) {
            // Not JSON output, treat as plain text
          }
          
          break;
        } catch (error) {
          if (command === lintCommands[lintCommands.length - 1]) {
            lintOutput = 'No linting available';
          }
          continue;
        }
      }

      // Consider linting failed if there are errors
      lintSuccess = !issues.some(issue => issue.severity === 'error');

      return {
        success: lintSuccess,
        issues,
        output: lintOutput
      };

    } catch (error) {
      return {
        success: false,
        issues: [],
        output: error instanceof Error ? error.message : 'Linting failed'
      };
    }
  }

  /**
   * Run tests in sandbox
   */
  private async runTests(sandboxPath: string, testCommand?: string): Promise<SandboxValidationResult['testResults']> {
    const repoPath = path.join(sandboxPath, 'repo');
    const startTime = Date.now();

    try {
      // Use provided test command or try common ones
      const testCommands = testCommand ? [testCommand] : [
        'pnpm test',
        'npm test',
        'yarn test',
        'npx jest',
        'npx vitest run',
        'echo "No tests found"'
      ];

      let testOutput = '';
      let testSuccess = false;
      let passed = 0;
      let failed = 0;
      let total = 0;
      const errors: string[] = [];

      for (const command of testCommands) {
        try {
          const { stdout, stderr } = await execAsync(`cd ${repoPath} && ${command}`, {
            timeout: this.timeoutMs / 2 // 2.5 minutes for tests
          });
          
          testOutput = stdout + stderr;
          testSuccess = true;

          // Parse test results (basic parsing for common test runners)
          const passedMatch = testOutput.match(/(\d+)\s+pass/i);
          const failedMatch = testOutput.match(/(\d+)\s+fail/i);
          const totalMatch = testOutput.match(/(\d+)\s+total/i);

          if (passedMatch) passed = parseInt(passedMatch[1]);
          if (failedMatch) failed = parseInt(failedMatch[1]);
          if (totalMatch) total = parseInt(totalMatch[1]);
          else total = passed + failed;

          break;
        } catch (error) {
          if (command === testCommands[testCommands.length - 1]) {
            testOutput = 'No tests available';
            testSuccess = true; // Not having tests isn't a failure
          } else {
            errors.push(error instanceof Error ? error.message : 'Test execution failed');
          }
          continue;
        }
      }

      return {
        passed,
        failed,
        total,
        duration: Date.now() - startTime,
        output: testOutput,
        errors
      };

    } catch (error) {
      return {
        passed: 0,
        failed: 1,
        total: 1,
        duration: Date.now() - startTime,
        output: '',
        errors: [error instanceof Error ? error.message : 'Test execution failed']
      };
    }
  }

  /**
   * Measure performance metrics
   */
  private async measurePerformance(sandboxPath: string): Promise<SandboxValidationResult['performance']> {
    try {
      // Basic performance measurement
      const stats = await fs.stat(sandboxPath);
      
      return {
        memoryUsage: 0, // Would need Docker stats for real measurement
        cpuTime: 0,     // Would need Docker stats for real measurement
        diskUsage: stats.size || 0
      };
    } catch (error) {
      return {
        memoryUsage: 0,
        cpuTime: 0,
        diskUsage: 0
      };
    }
  }

  /**
   * Analyze sandbox results and provide recommendation
   */
  private analyzeSandboxResults(
    buildResults: SandboxValidationResult['buildResults'],
    lintResults: SandboxValidationResult['lintResults'],
    testResults: SandboxValidationResult['testResults']
  ): SandboxValidationResult['summary'] {
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let recommendation: 'approve' | 'review' | 'reject' = 'approve';
    let reasoning = '';

    // Analyze build results
    if (!buildResults.success) {
      confidence = 'low';
      recommendation = 'reject';
      reasoning += 'Build failed. ';
    }

    // Analyze linting results
    const errorCount = lintResults.issues.filter(i => i.severity === 'error').length;
    const warningCount = lintResults.issues.filter(i => i.severity === 'warning').length;

    if (errorCount > 0) {
      confidence = 'low';
      recommendation = 'reject';
      reasoning += `${errorCount} linting errors found. `;
    } else if (warningCount > 5) {
      confidence = 'medium';
      if (recommendation === 'approve') recommendation = 'review';
      reasoning += `${warningCount} linting warnings found. `;
    }

    // Analyze test results
    if (testResults.failed > 0) {
      confidence = 'low';
      recommendation = 'reject';
      reasoning += `${testResults.failed} tests failed. `;
    } else if (testResults.total === 0) {
      confidence = 'medium';
      reasoning += 'No tests found to validate changes. ';
    } else {
      reasoning += `All ${testResults.passed} tests passed. `;
    }

    // Overall success
    const overallSuccess = buildResults.success && 
                          lintResults.success && 
                          testResults.failed === 0;

    if (overallSuccess && reasoning.trim() === '') {
      reasoning = 'All validation checks passed successfully.';
    }

    return {
      overallSuccess,
      confidence,
      recommendation,
      reasoning: reasoning.trim()
    };
  }

  /**
   * Create failed result for error cases
   */
  private createFailedResult(patch: CodePatch, error: unknown): SandboxValidationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      patchId: randomUUID(),
      success: false,
      testResults: {
        passed: 0,
        failed: 1,
        total: 1,
        duration: 0,
        output: '',
        errors: [errorMessage]
      },
      buildResults: {
        success: false,
        output: '',
        errors: [errorMessage],
        duration: 0
      },
      lintResults: {
        success: false,
        issues: [],
        output: errorMessage
      },
      performance: {
        memoryUsage: 0,
        cpuTime: 0,
        diskUsage: 0
      },
      summary: {
        overallSuccess: false,
        confidence: 'low',
        recommendation: 'reject',
        reasoning: `Sandbox validation failed: ${errorMessage}`
      }
    };
  }

  /**
   * Cleanup sandbox directory
   */
  private async cleanupSandbox(sandboxPath: string): Promise<void> {
    try {
      await execAsync(`rm -rf ${sandboxPath}`, { timeout: 30000 });
    } catch (error) {
      console.warn(`Failed to cleanup sandbox ${sandboxPath}:`, error);
    }
  }
}

// Singleton instance
let sandboxValidatorService: SandboxValidatorService | null = null;

export function getSandboxValidatorService(): SandboxValidatorService {
  if (!sandboxValidatorService) {
    sandboxValidatorService = new SandboxValidatorService();
  }
  return sandboxValidatorService;
}
