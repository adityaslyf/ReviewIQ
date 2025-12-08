import type { Request, Response } from "express";
import { getGitHubService, getWebhookService } from "../services";

/**
 * Handle GitHub webhook events
 * POST /webhook
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;
    const payload = req.body;

    // Get GitHub service (will initialize if needed)
    const githubService = getGitHubService();
    const webhookService = getWebhookService();

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";
    if (
      !githubService.verifyWebhookSignature(payload, signature, webhookSecret)
    ) {
      console.error("Invalid webhook signature");
      return res.status(401).send("Unauthorized");
    }

    // Parse JSON payload
    const jsonPayload = JSON.parse(payload.toString());

    if (event === "pull_request") {
      await webhookService.handlePullRequestEvent(jsonPayload);
    }

    res.status(200).send("OK");
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
}

