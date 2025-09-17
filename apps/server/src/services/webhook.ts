import { db, schema } from "../db";
import { GitHubService } from "./github";
import type { GitHubWebhookPayload } from "../types/github";

export class WebhookService {
  constructor(private githubService: GitHubService) {}

  async handlePullRequestEvent(payload: GitHubWebhookPayload) {
    const { action, pull_request, repository, installation } = payload;

    // Only process opened and synchronize events for now
    if (!["opened", "synchronize"].includes(action)) {
      console.log(`Skipping PR event: ${action}`);
      return;
    }

    const { owner, name: repo } = repository;
    const pullNumber = pull_request.number;

    console.log(`Processing PR #${pullNumber} in ${owner.login}/${repo} (action: ${action})`);

    try {
      // Get installation token
      const installationId = installation?.id;
      if (!installationId) {
        console.error("No installation ID found");
        return;
      }

      // Fetch detailed PR data using installation-scoped authentication
      const prData = await this.githubService.getPullRequestData(
        owner.login,
        repo,
        pullNumber,
        installationId
      );

      // Store PR data in database
      await this.storePullRequestData(prData, repository);

      console.log(`Successfully processed PR #${pullNumber} in ${owner.login}/${repo}`);
    } catch (error) {
      console.error("Error processing PR:", error);
    }
  }

  private async storePullRequestData(prData: { pr: { number: number; title: string; user: { login: string } }; diff: string; files: Array<{ filename: string }> }, repository: { owner: { login: string }; name: string }) {
    const { pr, files } = prData;

    try {
      // Store pull request
      await db.insert(schema.pullRequests).values({
        repo: `${repository.owner.login}/${repository.name}`,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        summary: null, // Will be filled in Phase 2 with AI analysis
      });

      console.log(`Stored PR #${pr.number} with ${files.length} changed files`);
      console.log(`Files changed: ${files.map((f) => f.filename).join(", ")}`);
    } catch (error) {
      console.error("Error storing PR data:", error);
    }
  }
}
