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
