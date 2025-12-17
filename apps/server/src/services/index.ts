import { GitHubService } from "./github";
import { WebhookService } from "./webhook";
import { GeminiService } from "./gemini";

// Initialize GitHub service only when needed
let githubService: GitHubService | null = null;
let geminiService: GeminiService | null = null;
let webhookService: WebhookService | null = null;

export function getGitHubService(): GitHubService {
  if (!githubService) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;

    if (!appId || !privateKey) {
      throw new Error(
        "GitHub App ID and Private Key must be set in environment variables"
      );
    }

    githubService = new GitHubService(appId, privateKey);
  }
  return githubService;
}

export function getGeminiService(): GeminiService | null {
  if (!geminiService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      geminiService = new GeminiService(apiKey);
    } catch (error) {
      console.error("Failed to initialize Gemini service:", error);
      return null;
    }
  }
  return geminiService;
}

export function getWebhookService(): WebhookService {
  if (!webhookService) {
    const github = getGitHubService();
    const gemini = getGeminiService();
    webhookService = new WebhookService(github, gemini || undefined);
  }
  return webhookService;
}

// Re-export service classes and types
export { GitHubService } from "./github";
export { WebhookService } from "./webhook";
export { GeminiService } from "./gemini";

