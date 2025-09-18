import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import crypto from "crypto";

export class GitHubService {
  private appOctokit: Octokit;
  private formattedPrivateKey: string;
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

      console.log(`Enhanced context gathered: ${Object.keys(enhancedContext).length} context types`);

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
