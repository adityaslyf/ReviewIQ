import { db, schema } from "../db";
import { GitHubService } from "./github";
import { GeminiService } from "./gemini";
import type { GitHubWebhookPayload } from "../types/github";
import { eq } from "drizzle-orm";

export class WebhookService {
  constructor(
    private githubService: GitHubService,
    private geminiService?: GeminiService
  ) {}

  async handlePullRequestEvent(payload: GitHubWebhookPayload) {
    const { action, pull_request, repository, installation } = payload;

    // Only process opened and synchronize events for now
    if (!["opened", "synchronize"].includes(action)) {
      console.log(`Skipping PR event: ${action}`);
      return;
    }

    const { owner, name: repo } = repository;
    const pullNumber = pull_request.number;


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

      // Store PR data in database and get the stored PR ID
      const storedPR = await this.storePullRequestData(prData, repository);

      // Run AI analysis if Gemini service is available
      if (this.geminiService && storedPR) {
        await this.runAIAnalysis(storedPR, prData);
      }

    } catch (error) {
      console.error("Error processing PR:", error);
    }
  }

  private async storePullRequestData(
    prData: { 
      pr: { number: number; title: string; user: { login: string }; body: string | null }; 
      diff: string; 
      files: Array<{ filename: string; additions: number; deletions: number; changes: number }> 
    }, 
    repository: { owner: { login: string }; name: string }
  ) {
    const { pr } = prData;

    try {
      // Store pull request and return the inserted record
      const [storedPR] = await db.insert(schema.pullRequests).values({
        repo: `${repository.owner.login}/${repository.name}`,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        summary: null, // Will be filled by AI analysis
      }).returning();

      
      return storedPR;
    } catch (error) {
      console.error("Error storing PR data:", error);
      return null;
    }
  }

  private async runAIAnalysis(
    storedPR: any, 
    prData: { 
      pr: { title: string; body: string | null }; 
      diff: string; 
      files: Array<{ filename: string; additions: number; deletions: number; changes: number }> 
    }
  ) {
    try {
      
      const analysisResult = await this.geminiService!.analyzePullRequest(
        prData.pr.title,
        prData.pr.body || "",
        prData.diff,
        prData.files
      );

      // Store AI analysis results
      await db.insert(schema.aiSuggestions).values({
        pullRequestId: storedPR.id,
        summary: analysisResult.summary,
        refactorSuggestions: analysisResult.refactorSuggestions,
        potentialIssues: analysisResult.potentialIssues,
        analysisStatus: "completed"
      });

      // Update the PR summary
      await db.update(schema.pullRequests)
        .set({ summary: analysisResult.summary })
        .where(eq(schema.pullRequests.id, storedPR.id));

    } catch (error) {
      console.error("Error running AI analysis:", error);
      
      // Mark analysis as failed
      try {
        await db.insert(schema.aiSuggestions).values({
          pullRequestId: storedPR.id,
          summary: "AI analysis failed",
          refactorSuggestions: "Unable to generate suggestions",
          potentialIssues: "Unable to identify issues",
          analysisStatus: "failed"
        });
      } catch (insertError) {
        console.error("Error storing failed analysis:", insertError);
      }
    }
  }
}