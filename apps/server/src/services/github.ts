import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { VectorEmbeddingService, getVectorEmbeddingService } from './vector-embedding';
import crypto from "crypto";

export class GitHubService {
  private appOctokit: Octokit;
  private formattedPrivateKey: string;
  private vectorService: VectorEmbeddingService | null = null;
  private appIdInternal: string;

  constructor(private appId: string, private privateKey: string) {
    if (!appId || !privateKey) {
      throw new Error("GitHub App ID and Private Key must be provided");
    }

    // Fix the private key formatting - convert \n to actual newlines
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n').trim();
    this.formattedPrivateKey = formattedPrivateKey;
    this.appIdInternal = appId;

    // Minimal validation
    if (!formattedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----") ||
        !formattedPrivateKey.includes("-----END RSA PRIVATE KEY-----")) {
      throw new Error("Invalid private key format. Ensure BEGIN/END markers are present.");
    }

    // App-level Octokit (JWT) – used for app endpoints like getting installations
    this.appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appIdInternal,
        privateKey: this.formattedPrivateKey,
      },
    });
  }

  // Helper to get an installation-scoped Octokit
  private getInstallationOctokit(installationId: number): Octokit {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appIdInternal,
        privateKey: this.formattedPrivateKey,
        installationId,
      },
    });
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Get installation token for a repository (handy for debugging/tools)
  async getInstallationToken(installationId: number): Promise<string> {
    const octokit = this.getInstallationOctokit(installationId);
    const auth = await (octokit.auth as any)({ type: "installation" });
    return auth.token as string;
  }

  // Fetch pull request data including diff
  async getPullRequestData(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number
  ) {
    const octokit = this.getInstallationOctokit(installationId);

    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const { data: diff } = await octokit.request(
      `GET /repos/${owner}/${repo}/pulls/${pullNumber}`,
      {
        headers: {
          accept: "application/vnd.github.v3.diff",
        },
      }
    );

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return { pr, diff, files };
  }

  // Enhanced PR data with comprehensive context
  async getEnhancedPRData(
    owner: string,
    repo: string,
    pullNumber: number,
    installationId: number
  ) {
    try {
      const octokit = this.getInstallationOctokit(installationId);

      // Get basic PR data first
      const { pr, diff, files } = await this.getPullRequestData(owner, repo, pullNumber, installationId);

      // Safely gather enhanced context with individual error handling
      const enhancedContext: any = {};

      // 1. Repository History - Get recent commits affecting the same files
      try {
        const fileNames = files.map(f => f.filename);
        enhancedContext.recentCommits = await this.getRecentCommitsForFiles(octokit, owner, repo, fileNames);
      } catch (error) {
        console.warn('Failed to get recent commits context:', error);
        enhancedContext.recentCommits = [];
      }

      // 2. Branch Context - Check mergeability and conflicts
      try {
        enhancedContext.branchContext = await this.getBranchContext(octokit, owner, repo, pullNumber);
      } catch (error) {
        console.warn('Failed to get branch context:', error);
        enhancedContext.branchContext = null;
      }

      // 3. Issue References - Extract and fetch linked issues
      try {
        enhancedContext.linkedIssues = await this.getLinkedIssues(octokit, owner, repo, pr.body || "");
      } catch (error) {
        console.warn('Failed to get linked issues:', error);
        enhancedContext.linkedIssues = [];
      }

      // 4. Repository Structure - Get key config files
      try {
        enhancedContext.repoStructure = await this.getRepositoryStructure(octokit, owner, repo);
      } catch (error) {
        console.warn('Failed to get repository structure:', error);
        enhancedContext.repoStructure = {};
      }

      // 5. CI/CD Context - Get check runs and workflow status
      try {
        enhancedContext.cicdContext = await this.getCICDContext(octokit, owner, repo, pr.head.sha);
      } catch (error) {
        console.warn('Failed to get CI/CD context:', error);
        enhancedContext.cicdContext = null;
      }

      // 6. Review Comments - Get existing review comments
      try {
        enhancedContext.reviewComments = await this.getReviewComments(octokit, owner, repo, pullNumber);
      } catch (error) {
        console.warn('Failed to get review comments:', error);
        enhancedContext.reviewComments = { reviews: [], comments: [] };
      }

      // 7. INTELLIGENT VECTOR-BASED CONTEXT GATHERING
      if (this.vectorService) {
        const vectorStatus = this.vectorService.getInitializationStatus();
        
        // If vector service exists but isn't initialized, initialize it with the current project
        if (!vectorStatus.isInitialized && !vectorStatus.isInitializing) {
          try {
            console.log('🚀 Starting vector service initialization...');
            
            // Use the current working directory as the codebase path
            const codebasePath = process.cwd();
            await this.vectorService.initialize(codebasePath, false, true);
            console.log('🔄 Vector service initialization started in background');
            
            // Start progress monitoring
            this.startProgressMonitoring();
          } catch (error) {
            console.warn('Failed to start vector initialization:', error);
          }
        }
        
        if (vectorStatus.isInitialized) {
          try {
            console.log('🎯 Using Vector Embeddings for Intelligent Context Retrieval...');
            
            // Get comprehensive context using semantic search
            const vectorContext = await this.vectorService.getPRContext(
              pr.title,
              pr.body || '',
              files.map(f => f.filename),
              diff
            );
            
            enhancedContext.vectorContext = vectorContext;
            
            // Convert vector results to legacy format for compatibility
            enhancedContext.fullFileContext = this.convertVectorToLegacyFormat(vectorContext.directContext);
            enhancedContext.relatedCode = {
              relatedFiles: vectorContext.relatedContext.map(r => ({
                path: r.chunk.filePath,
                content: r.chunk.content,
                relevance: r.similarity,
                contextType: r.contextType
              })),
              testFiles: vectorContext.testContext.map(r => r.chunk.filePath),
              imports: {},
              exports: {}
            };
            enhancedContext.architecturalContext = {
              documentation: vectorContext.documentationContext.reduce((acc, r) => {
                acc[r.chunk.filePath] = {
                  content: r.chunk.content,
                  relevance: r.similarity
                };
                return acc;
              }, {} as any)
            };
            
            // Log vector-based context summary
            this.logVectorContextSummary(vectorContext);
            
          } catch (error) {
            console.warn('Vector context retrieval failed, falling back to traditional method:', error);
            // Fallback to traditional context gathering
            await this.gatherTraditionalContext(enhancedContext, octokit, owner, repo, pr, files);
          }
        } else if (vectorStatus.isInitializing) {
          console.log('🔄 Vector service is still initializing, using traditional context gathering...');
          if (vectorStatus.progress) {
            const progress = vectorStatus.progress;
            console.log(`   📊 Progress: ${progress.stage} - ${progress.percentage.toFixed(1)}% (${progress.elapsedTime.toFixed(1)}s elapsed)`);
            if (progress.estimatedCompletion) {
              const remaining = (progress.estimatedCompletion.getTime() - Date.now()) / 1000;
              console.log(`   ⏱️ Estimated completion: ${remaining.toFixed(0)}s remaining`);
            }
          }
          await this.gatherTraditionalContext(enhancedContext, octokit, owner, repo, pr, files);
        } else {
          console.log('⚠️ Vector service not initialized, using traditional context gathering...');
          await this.gatherTraditionalContext(enhancedContext, octokit, owner, repo, pr, files);
        }
      } else {
        console.log('⚠️ Vector service not available, using traditional context gathering...');
        await this.gatherTraditionalContext(enhancedContext, octokit, owner, repo, pr, files);
      }

      // COMPREHENSIVE CONTEXT LOGGING
      this.logContextSummary(enhancedContext);
      console.log(`✅ Enhanced context gathered: ${Object.keys(enhancedContext).length} context types`);

      return {
        pr,
        diff,
        files,
        enhancedContext
      };
    } catch (error) {
      console.error('Failed to get enhanced PR data, falling back to basic data:', error);
      // Fallback to basic PR data if enhanced context fails
      return await this.getPullRequestData(owner, repo, pullNumber, installationId);
    }
  }

  private async getRecentCommitsForFiles(octokit: any, owner: string, repo: string, fileNames: string[]) {
    try {
      const commits = [];
      
      // Get last 10 commits for each file (limited to avoid API rate limits)
      for (const fileName of fileNames.slice(0, 5)) { // Limit to first 5 files
        try {
          const { data: fileCommits } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            path: fileName,
            per_page: 5 // Last 5 commits per file
          });
          
          commits.push({
            file: fileName,
            recentCommits: fileCommits.map(commit => ({
              sha: commit.sha.substring(0, 7),
              message: commit.commit.message.split('\n')[0], // First line only
              author: commit.commit.author.name,
              date: commit.commit.author.date
            }))
          });
        } catch (error) {
          console.warn(`Failed to get commits for ${fileName}:`, error);
        }
      }
      
      return commits;
    } catch (error) {
      console.warn('Failed to get recent commits:', error);
      return [];
    }
  }

  private async getBranchContext(octokit: any, owner: string, repo: string, pullNumber: number) {
    try {
      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });

      return {
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state,
        behindBy: pr.behind_by || 0,
        aheadBy: pr.ahead_by || 0,
        conflictFiles: pr.mergeable === false ? "Merge conflicts detected" : null
      };
    } catch (error) {
      console.warn('Failed to get branch context:', error);
      return null;
    }
  }

  private async getLinkedIssues(octokit: any, owner: string, repo: string, prBody: string) {
    try {
      const issueNumbers = this.extractIssueNumbers(prBody);
      const issues = [];

      for (const issueNumber of issueNumbers.slice(0, 3)) { // Limit to 3 issues
        try {
          const { data: issue } = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber
          });
          
          issues.push({
            number: issue.number,
            title: issue.title,
            body: issue.body?.substring(0, 500) || "", // First 500 chars
            state: issue.state,
            labels: issue.labels.map((label: any) => label.name)
          });
        } catch (error) {
          console.warn(`Failed to get issue #${issueNumber}:`, error);
        }
      }

      return issues;
    } catch (error) {
      console.warn('Failed to get linked issues:', error);
      return [];
    }
  }

  private extractIssueNumbers(text: string): number[] {
    const matches = text.match(/(?:fixes?|closes?|resolves?)\s+#(\d+)/gi) || [];
    return matches.map(match => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0]) : 0;
    }).filter(n => n > 0);
  }

  private async getRepositoryStructure(octokit: any, owner: string, repo: string) {
    try {
      const structure: any = {};

      // Get package.json for dependencies
      try {
        const { data: packageJson } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: 'package.json'
        });
        
        if ('content' in packageJson) {
          const content = Buffer.from(packageJson.content, 'base64').toString();
          const parsed = JSON.parse(content);
          structure.dependencies = {
            dependencies: Object.keys(parsed.dependencies || {}),
            devDependencies: Object.keys(parsed.devDependencies || {}),
            scripts: Object.keys(parsed.scripts || {})
          };
        }
      } catch (error) {
        // Try other config files
        const configFiles = ['tsconfig.json', 'next.config.js', '.eslintrc.json'];
        for (const configFile of configFiles) {
          try {
            const { data } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: configFile
            });
            if ('content' in data) {
              structure[configFile] = Buffer.from(data.content, 'base64').toString().substring(0, 1000);
            }
          } catch {
            // Config file doesn't exist, continue
          }
        }
      }

      return structure;
    } catch (error) {
      console.warn('Failed to get repository structure:', error);
      return {};
    }
  }

  private async getCICDContext(octokit: any, owner: string, repo: string, sha: string) {
    try {
      const { data: checkRuns } = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: sha
      });

      const { data: statuses } = await octokit.rest.repos.listCommitStatusesForRef({
        owner,
        repo,
        ref: sha
      });

      return {
        checkRuns: checkRuns.check_runs.map(run => ({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          startedAt: run.started_at
        })),
        statuses: statuses.map(status => ({
          context: status.context,
          state: status.state,
          description: status.description
        })),
        summary: {
          totalChecks: checkRuns.total_count,
          passing: checkRuns.check_runs.filter(r => r.conclusion === 'success').length,
          failing: checkRuns.check_runs.filter(r => r.conclusion === 'failure').length
        }
      };
    } catch (error) {
      console.warn('Failed to get CI/CD context:', error);
      return null;
    }
  }

  private async getReviewComments(octokit: any, owner: string, repo: string, pullNumber: number) {
    try {
      const { data: reviews } = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber
      });

      const { data: comments } = await octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber
      });

      return {
        reviews: reviews.slice(0, 5).map(review => ({
          state: review.state,
          body: review.body?.substring(0, 300) || "",
          user: review.user.login
        })),
        comments: comments.slice(0, 10).map(comment => ({
          body: comment.body.substring(0, 200),
          path: comment.path,
          line: comment.line,
          user: comment.user.login
        }))
      };
    } catch (error) {
      console.warn('Failed to get review comments:', error);
      return { reviews: [], comments: [] };
    }
  }

  // Get full file content for modified files
  private async getFullFileContext(octokit: any, owner: string, repo: string, sha: string, files: any[]) {
    const fullFileContext: any = {};
    
    // MAXIMUM CONTEXT: Fetch up to 25 files for comprehensive analysis
    // This gives Gemini the most complete picture possible
    const filesToFetch = files.slice(0, 25);
    
    for (const file of filesToFetch) {
      try {
        // Skip binary files and very large files
        if (this.shouldSkipFile(file.filename)) {
          continue;
        }

        console.log(`📄 Fetching full content for: ${file.filename}`);
        
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: sha
        });

        if (data.type === 'file' && data.content) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          
          // MAXIMUM CONTEXT: Allow files up to 1MB for complete understanding
          // Only skip truly massive files (generated bundles, etc.)
          if (content.length > 1000000) {
            console.log(`⚠️ Skipping massive file: ${file.filename} (${(content.length/1000000).toFixed(1)}MB)`);
            continue;
          }
          
          // Warn about large files but include them
          if (content.length > 500000) {
            console.log(`📄 Including large file: ${file.filename} (${(content.length/1000).toFixed(0)}KB)`);
          }

          fullFileContext[file.filename] = {
            content,
            size: content.length,
            lines: content.split('\n').length
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch content for ${file.filename}:`, error);
      }
    }

    return fullFileContext;
  }

  // Discover related code and dependencies
  private async getRelatedCodeContext(octokit: any, owner: string, repo: string, sha: string, files: any[]) {
    const relatedCode: any = {
      imports: {},
      exports: {},
      testFiles: [],
      relatedFiles: []
    };

    for (const file of files.slice(0, 15)) { // MAXIMUM: Analyze dependencies for up to 15 files
      try {
        // Find test files for this file
        const testFiles = await this.findTestFiles(octokit, owner, repo, sha, file.filename);
        relatedCode.testFiles.push(...testFiles);

        // Analyze imports/exports if it's a code file
        if (this.isCodeFile(file.filename)) {
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: sha
          });

          if (data.type === 'file' && data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            
            // Extract imports and exports
            const imports = this.extractImports(content, file.filename);
            const exports = this.extractExports(content, file.filename);
            
            relatedCode.imports[file.filename] = imports;
            relatedCode.exports[file.filename] = exports;

            // Find related files based on imports
            for (const importPath of imports) {
              try {
                const relatedFile = await this.resolveImportPath(octokit, owner, repo, sha, importPath, file.filename);
                if (relatedFile) {
                  relatedCode.relatedFiles.push(relatedFile);
                }
              } catch (error) {
                // Ignore import resolution errors
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze related code for ${file.filename}:`, error);
      }
    }

    // Remove duplicates
    relatedCode.testFiles = [...new Set(relatedCode.testFiles)];
    relatedCode.relatedFiles = [...new Set(relatedCode.relatedFiles.map(f => f.path))].map(path => 
      relatedCode.relatedFiles.find((f: any) => f.path === path)
    );

    return relatedCode;
  }

  // Helper methods for file analysis
  private shouldSkipFile(filename: string): boolean {
    const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.tar', '.gz'];
    const skipPaths = ['node_modules/', 'dist/', 'build/', '.git/'];
    
    return skipExtensions.some(ext => filename.toLowerCase().endsWith(ext)) ||
           skipPaths.some(path => filename.includes(path));
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs'];
    return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private async findTestFiles(octokit: any, owner: string, repo: string, sha: string, filename: string) {
    const testFiles = [];
    const baseName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    const dir = filename.includes('/') ? filename.substring(0, filename.lastIndexOf('/')) : '';
    
    // Common test file patterns
    const testPatterns = [
      `${baseName}.test.js`,
      `${baseName}.test.ts`,
      `${baseName}.spec.js`,
      `${baseName}.spec.ts`,
      `${dir}/__tests__/${baseName.split('/').pop()}.test.js`,
      `${dir}/__tests__/${baseName.split('/').pop()}.test.ts`,
      `${dir}/tests/${baseName.split('/').pop()}.test.js`,
      `${dir}/tests/${baseName.split('/').pop()}.test.ts`
    ];

    for (const pattern of testPatterns) {
      try {
        await octokit.rest.repos.getContent({
          owner,
          repo,
          path: pattern,
          ref: sha
        });
        testFiles.push(pattern);
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    return testFiles;
  }

  private extractImports(content: string, filename: string): string[] {
    const imports = [];
    
    // JavaScript/TypeScript imports
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports.filter(imp => !imp.startsWith('.') || imp.includes('/')); // Filter relative imports
  }

  private extractExports(content: string, filename: string): string[] {
    const exports = [];
    
    // JavaScript/TypeScript exports
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    const namedExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    while ((match = namedExportRegex.exec(content)) !== null) {
      const namedExports = match[1].split(',').map(exp => exp.trim().split(' as ')[0]);
      exports.push(...namedExports);
    }

    return exports;
  }

  private async resolveImportPath(octokit: any, owner: string, repo: string, sha: string, importPath: string, fromFile: string) {
    try {
      // Handle relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const dir = fromFile.includes('/') ? fromFile.substring(0, fromFile.lastIndexOf('/')) : '';
        const resolvedPath = this.resolvePath(dir, importPath);
        
        // Try common extensions
        const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
        
        for (const ext of extensions) {
          try {
            const fullPath = resolvedPath + ext;
            const { data } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: fullPath,
              ref: sha
            });
            
            if (data.type === 'file') {
              const fullContent = Buffer.from(data.content, 'base64').toString('utf-8');
              return {
                path: fullPath,
                // MAXIMUM CONTEXT: Include up to 5000 chars of related files (5x more context)
                content: fullContent.substring(0, 5000),
                fullSize: fullContent.length
              };
            }
          } catch (error) {
            // Continue trying other extensions
          }
        }
      }
    } catch (error) {
      // Import resolution failed
    }
    
    return null;
  }

  private resolvePath(basePath: string, relativePath: string): string {
    const parts = basePath.split('/').filter(p => p);
    const relativeParts = relativePath.split('/').filter(p => p);
    
    for (const part of relativeParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }
    
    return parts.join('/');
  }

  // Get architectural context - README, docs, configs for better understanding
  private async getArchitecturalContext(octokit: any, owner: string, repo: string, sha: string) {
    const architecturalContext: any = {
      documentation: {},
      configurations: {},
      projectStructure: {}
    };

    // Key files that provide architectural context
    const architecturalFiles = [
      // Documentation
      'README.md', 'README.rst', 'README.txt',
      'ARCHITECTURE.md', 'DESIGN.md', 'CONTRIBUTING.md',
      'docs/README.md', 'docs/architecture.md', 'docs/api.md',
      
      // Configuration files
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'tsconfig.json', 'jsconfig.json', 'webpack.config.js', 'vite.config.ts',
      'tailwind.config.js', 'next.config.js', 'nuxt.config.js',
      'docker-compose.yml', 'Dockerfile', '.env.example',
      'eslint.config.js', '.eslintrc.js', '.eslintrc.json',
      'prettier.config.js', '.prettierrc',
      
      // Framework specific
      'angular.json', 'vue.config.js', 'svelte.config.js',
      'gatsby-config.js', 'remix.config.js',
      
      // Backend configs
      'requirements.txt', 'Pipfile', 'poetry.lock',
      'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock',
      'pom.xml', 'build.gradle', 'composer.json'
    ];

    let fetchedCount = 0;
    const maxFiles = 20; // Limit to avoid too many API calls

    for (const filename of architecturalFiles) {
      if (fetchedCount >= maxFiles) break;
      
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filename,
          ref: sha
        });

        if (data.type === 'file' && data.content) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          
          // Skip very large files
          if (content.length > 100000) {
            console.log(`⚠️ Skipping large architectural file: ${filename} (${(content.length/1000).toFixed(0)}KB)`);
            continue;
          }

          // Categorize the file
          if (filename.toLowerCase().includes('readme') || filename.toLowerCase().includes('doc') || 
              filename.toLowerCase().includes('architecture') || filename.toLowerCase().includes('design')) {
            architecturalContext.documentation[filename] = {
              content: content.substring(0, 10000), // First 10KB of docs
              size: content.length
            };
          } else {
            architecturalContext.configurations[filename] = {
              content: content.substring(0, 5000), // First 5KB of configs
              size: content.length
            };
          }

          fetchedCount++;
          console.log(`📋 Fetched architectural context: ${filename} (${(content.length/1000).toFixed(1)}KB)`);
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    // Get high-level project structure
    try {
      const { data: rootContents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '',
        ref: sha
      });

      if (Array.isArray(rootContents)) {
        architecturalContext.projectStructure.rootFiles = rootContents
          .filter((item: any) => item.type === 'file')
          .map((item: any) => item.name)
          .slice(0, 20); // Top 20 root files

        architecturalContext.projectStructure.rootDirectories = rootContents
          .filter((item: any) => item.type === 'dir')
          .map((item: any) => item.name)
          .slice(0, 15); // Top 15 directories
      }
    } catch (error) {
      console.warn('Failed to get project structure:', error);
    }

    return architecturalContext;
  }

  // Comprehensive context logging for debugging and monitoring
  private logContextSummary(enhancedContext: any) {
    console.log('\n🚀 ===== MAXIMUM CONTEXT ANALYSIS SUMMARY =====');
    
    let totalTokens = 0;
    let totalFiles = 0;
    let totalSize = 0;

    // 1. Full File Context
    if (enhancedContext.fullFileContext) {
      const fileContext = enhancedContext.fullFileContext;
      const fileCount = Object.keys(fileContext).length;
      let fileSize = 0;
      
      console.log(`\n📄 FULL FILE CONTEXT: ${fileCount} files`);
      Object.entries(fileContext).forEach(([filename, data]: [string, any]) => {
        const sizeKB = (data.size / 1000).toFixed(1);
        console.log(`  ✅ ${filename}: ${data.lines} lines, ${sizeKB}KB`);
        fileSize += data.size;
      });
      
      totalFiles += fileCount;
      totalSize += fileSize;
      const estimatedTokens = Math.ceil(fileSize / 4);
      totalTokens += estimatedTokens;
      console.log(`  📊 Total: ${fileCount} files, ${(fileSize/1000).toFixed(1)}KB, ~${estimatedTokens.toLocaleString()} tokens`);
    }

    // 2. Related Code Context
    if (enhancedContext.relatedCode) {
      const relatedCode = enhancedContext.relatedCode;
      console.log(`\n🔗 RELATED CODE CONTEXT:`);
      
      // Imports/Exports
      const importCount = Object.keys(relatedCode.imports || {}).length;
      const exportCount = Object.keys(relatedCode.exports || {}).length;
      if (importCount > 0 || exportCount > 0) {
        console.log(`  📦 Dependencies: ${importCount} files with imports, ${exportCount} files with exports`);
        Object.entries(relatedCode.imports || {}).forEach(([file, imports]: [string, any]) => {
          if (imports.length > 0) {
            console.log(`    📥 ${file}: imports ${imports.length} modules`);
          }
        });
      }

      // Test Files
      if (relatedCode.testFiles?.length > 0) {
        console.log(`  🧪 Test Files: ${relatedCode.testFiles.length} discovered`);
        relatedCode.testFiles.forEach((testFile: string) => {
          console.log(`    ✅ ${testFile}`);
        });
      }

      // Related Files
      if (relatedCode.relatedFiles?.length > 0) {
        let relatedSize = 0;
        console.log(`  📁 Related Files: ${relatedCode.relatedFiles.length} files`);
        relatedCode.relatedFiles.forEach((file: any) => {
          if (file && file.path) {
            const sizeKB = file.fullSize ? (file.fullSize / 1000).toFixed(1) : 'unknown';
            const previewSize = file.content ? file.content.length : 0;
            console.log(`    ✅ ${file.path}: ${sizeKB}KB (${(previewSize/1000).toFixed(1)}KB preview)`);
            relatedSize += previewSize;
          }
        });
        totalSize += relatedSize;
        const relatedTokens = Math.ceil(relatedSize / 4);
        totalTokens += relatedTokens;
        console.log(`  📊 Related content: ${(relatedSize/1000).toFixed(1)}KB, ~${relatedTokens.toLocaleString()} tokens`);
      }
    }

    // 3. Architectural Context
    if (enhancedContext.architecturalContext) {
      const archContext = enhancedContext.architecturalContext;
      console.log(`\n🏗️ ARCHITECTURAL CONTEXT:`);
      
      // Documentation
      const docCount = Object.keys(archContext.documentation || {}).length;
      if (docCount > 0) {
        let docSize = 0;
        console.log(`  📚 Documentation: ${docCount} files`);
        Object.entries(archContext.documentation).forEach(([filename, data]: [string, any]) => {
          const sizeKB = (data.size / 1000).toFixed(1);
          console.log(`    ✅ ${filename}: ${sizeKB}KB`);
          docSize += data.content.length;
        });
        totalSize += docSize;
        const docTokens = Math.ceil(docSize / 4);
        totalTokens += docTokens;
        console.log(`  📊 Documentation: ${(docSize/1000).toFixed(1)}KB, ~${docTokens.toLocaleString()} tokens`);
      }

      // Configuration
      const configCount = Object.keys(archContext.configurations || {}).length;
      if (configCount > 0) {
        let configSize = 0;
        console.log(`  ⚙️ Configuration: ${configCount} files`);
        Object.entries(archContext.configurations).forEach(([filename, data]: [string, any]) => {
          const sizeKB = (data.size / 1000).toFixed(1);
          console.log(`    ✅ ${filename}: ${sizeKB}KB`);
          configSize += data.content.length;
        });
        totalSize += configSize;
        const configTokens = Math.ceil(configSize / 4);
        totalTokens += configTokens;
        console.log(`  📊 Configuration: ${(configSize/1000).toFixed(1)}KB, ~${configTokens.toLocaleString()} tokens`);
      }

      // Project Structure
      if (archContext.projectStructure) {
        const structure = archContext.projectStructure;
        const dirCount = structure.rootDirectories?.length || 0;
        const fileCount = structure.rootFiles?.length || 0;
        if (dirCount > 0 || fileCount > 0) {
          console.log(`  📁 Project Structure: ${dirCount} directories, ${fileCount} root files`);
        }
      }
    }

    // 4. Other Context Types
    const otherContextTypes = Object.keys(enhancedContext).filter(key => 
      !['fullFileContext', 'relatedCode', 'architecturalContext'].includes(key)
    );
    
    if (otherContextTypes.length > 0) {
      console.log(`\n📋 OTHER CONTEXT: ${otherContextTypes.length} types`);
      otherContextTypes.forEach(type => {
        const data = enhancedContext[type];
        if (Array.isArray(data)) {
          console.log(`  ✅ ${type}: ${data.length} items`);
        } else if (typeof data === 'object' && data !== null) {
          console.log(`  ✅ ${type}: ${Object.keys(data).length} properties`);
        } else {
          console.log(`  ✅ ${type}: available`);
        }
      });
    }

    // FINAL SUMMARY
    console.log(`\n🎯 ===== FINAL CONTEXT SUMMARY =====`);
    console.log(`📊 Total Content: ${(totalSize/1000000).toFixed(2)}MB`);
    console.log(`🔢 Estimated Tokens: ~${totalTokens.toLocaleString()}`);
    console.log(`📄 Total Files Analyzed: ${totalFiles}`);
    console.log(`💰 Estimated Cost: $${(totalTokens * 0.00000125).toFixed(4)} (input tokens)`);
    console.log(`⚡ Context Quality: ${this.getContextQualityRating(totalTokens, totalFiles)}`);
    console.log(`🚀 =======================================\n`);
  }

  private getContextQualityRating(tokens: number, files: number): string {
    if (tokens > 500000 && files > 15) return 'MAXIMUM 🔥🔥🔥';
    if (tokens > 200000 && files > 10) return 'EXCELLENT 🔥🔥';
    if (tokens > 100000 && files > 5) return 'VERY GOOD 🔥';
    if (tokens > 50000 && files > 3) return 'GOOD ✅';
    return 'BASIC ⚠️';
  }

  // Convert vector search results to legacy format for compatibility
  private convertVectorToLegacyFormat(vectorResults: any[]): any {
    const legacyFormat: any = {};
    
    for (const result of vectorResults) {
      const chunk = result.chunk;
      legacyFormat[chunk.filePath] = {
        content: chunk.content,
        size: chunk.metadata.size,
        lines: chunk.endLine - chunk.startLine + 1,
        relevance: result.similarity,
        contextType: result.contextType,
        chunkType: chunk.type,
        functionName: chunk.functionName,
        className: chunk.className
      };
    }
    
    return legacyFormat;
  }

  // Log vector-based context summary
  private logVectorContextSummary(vectorContext: any) {
    console.log('\n🎯 ===== VECTOR-BASED CONTEXT ANALYSIS =====');
    
    const { directContext, relatedContext, testContext, documentationContext, summary } = vectorContext;
    
    console.log(`\n📍 DIRECT CONTEXT: ${directContext.length} chunks`);
    directContext.slice(0, 5).forEach((result: any) => {
      const chunk = result.chunk;
      console.log(`  ✅ ${chunk.filePath}:${chunk.functionName || chunk.className || 'module'} (${(result.similarity * 100).toFixed(1)}% match)`);
    });
    
    console.log(`\n🔗 RELATED CONTEXT: ${relatedContext.length} chunks`);
    relatedContext.slice(0, 3).forEach((result: any) => {
      const chunk = result.chunk;
      console.log(`  ✅ ${chunk.filePath}:${chunk.functionName || chunk.className || 'module'} (${(result.similarity * 100).toFixed(1)}% match)`);
    });
    
    if (testContext.length > 0) {
      console.log(`\n🧪 TEST CONTEXT: ${testContext.length} chunks`);
      testContext.slice(0, 3).forEach((result: any) => {
        const chunk = result.chunk;
        console.log(`  ✅ ${chunk.filePath} (${(result.similarity * 100).toFixed(1)}% match)`);
      });
    }
    
    if (documentationContext.length > 0) {
      console.log(`\n📚 DOCUMENTATION CONTEXT: ${documentationContext.length} chunks`);
      documentationContext.forEach((result: any) => {
        const chunk = result.chunk;
        console.log(`  ✅ ${chunk.filePath} (${(result.similarity * 100).toFixed(1)}% match)`);
      });
    }
    
    console.log(`\n🎯 ===== VECTOR CONTEXT SUMMARY =====`);
    console.log(`📊 Total Chunks: ${summary.totalChunks}`);
    console.log(`🔢 Estimated Tokens: ~${summary.estimatedTokens.toLocaleString()}`);
    console.log(`💰 Estimated Cost: $${(summary.estimatedTokens * 0.00000125).toFixed(4)} (input tokens)`);
    console.log(`⚡ Context Quality: ${summary.contextQuality}`);
    console.log(`📈 Relevance Distribution:`, summary.relevanceDistribution);
    console.log(`🎯 =======================================\n`);
  }

  // Fallback to traditional context gathering
  private async gatherTraditionalContext(enhancedContext: any, octokit: any, owner: string, repo: string, pr: any, files: any[]) {
    // Full file context
    try {
      console.log('🔍 Fetching full file context for enhanced analysis...');
      enhancedContext.fullFileContext = await this.getFullFileContext(octokit, owner, repo, pr.head.sha, files);
    } catch (error) {
      console.warn('Failed to get full file context:', error);
      enhancedContext.fullFileContext = {};
    }

    // Related code context
    try {
      console.log('🔗 Discovering related code and dependencies...');
      enhancedContext.relatedCode = await this.getRelatedCodeContext(octokit, owner, repo, pr.head.sha, files);
    } catch (error) {
      console.warn('Failed to get related code context:', error);
      enhancedContext.relatedCode = {};
    }

    // Architectural context
    try {
      console.log('🏗️ Fetching architectural context (README, docs, configs)...');
      enhancedContext.architecturalContext = await this.getArchitecturalContext(octokit, owner, repo, pr.head.sha);
    } catch (error) {
      console.warn('Failed to get architectural context:', error);
      enhancedContext.architecturalContext = {};
    }
  }

  // Initialize vector embedding service
  async initializeVectorService(geminiApiKey: string, codebasePath?: string, background: boolean = true): Promise<void> {
    if (!this.vectorService) {
      console.log('🚀 Initializing Vector Embedding Service with Gemini...');
      this.vectorService = getVectorEmbeddingService(geminiApiKey);
      
      if (codebasePath) {
        await this.vectorService.initialize(codebasePath, false, background);
      }
    }
  }

  // Get vector service initialization status
  getVectorServiceStatus(): any {
    if (!this.vectorService) {
      return { isInitialized: false, isInitializing: false };
    }
    return this.vectorService.getInitializationStatus();
  }

  // Reset vector service for testing
  resetVectorService(): void {
    if (this.vectorService) {
      this.vectorService.reset();
      console.log('Vector service has been reset');
    }
  }

  // Start progress monitoring for vector initialization
  private startProgressMonitoring(): void {
    const progressInterval = setInterval(() => {
      if (!this.vectorService) {
        clearInterval(progressInterval);
        return;
      }

      const status = this.vectorService.getInitializationStatus();
      
      if (status.isInitialized) {
        console.log('✅ Vector service initialization completed!');
        clearInterval(progressInterval);
        return;
      }

      if (!status.isInitializing) {
        clearInterval(progressInterval);
        return;
      }

      if (status.progress) {
        const { stage, current, total, percentage, elapsedTime } = status.progress;
        
        console.log(`📊 Vector Progress: ${stage} - ${percentage.toFixed(1)}% (${current}/${total})`);
        
        if (status.progress.estimatedCompletion) {
          const remaining = (status.progress.estimatedCompletion.getTime() - Date.now()) / 1000;
          if (remaining > 0) {
            console.log(`⏱️  Estimated completion: ${Math.ceil(remaining)}s remaining`);
          }
        }
        
        console.log(`⏰ Time elapsed: ${Math.ceil(elapsedTime)}s`);
      }
    }, 3000); // Update every 3 seconds
  }

  // Get repository installation ID
  async getInstallationId(owner: string, repo: string): Promise<number | null> {
    try {
      const { data } = await this.appOctokit.rest.apps.getRepoInstallation({
        owner,
        repo,
      });
      return data.id;
    } catch (error) {
      console.error("Failed to get installation ID:", error);
      return null;
    }
  }
}
