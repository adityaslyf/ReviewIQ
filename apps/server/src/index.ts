import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GitHubService } from "./services/github";
import { WebhookService } from "./services/webhook";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Raw body parser for webhook signature verification
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "",
		methods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(express.json());

// Initialize GitHub service only when needed
let githubService: GitHubService | null = null;
let webhookService: WebhookService | null = null;

function getGitHubService(): GitHubService {
  if (!githubService) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    
    if (!appId || !privateKey) {
      throw new Error("GitHub App ID and Private Key must be set in environment variables");
    }
    
    githubService = new GitHubService(appId, privateKey);
    webhookService = new WebhookService(githubService);
  }
  return githubService;
}

function getWebhookService(): WebhookService {
  if (!webhookService) {
    getGitHubService(); // This will initialize webhookService too
  }
  return webhookService!;
}

app.get("/", (_req, res) => {
	res.status(200).send("OK");
});

// Debug endpoint to check GitHub App status
app.get("/api/github/status", async (_req, res) => {
  try {
    console.log("Checking GitHub App status...");
    
    // Check environment variables
    const envCheck = {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID ? "✓ Set" : "✗ Missing",
      GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY ? "✓ Set" : "✗ Missing", 
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET ? "✓ Set" : "✗ Missing"
    };

    console.log("Environment variables:", envCheck);

    // Try to initialize GitHub service
    let githubService;
    let authStatus = "Not initialized";
    
    try {
      githubService = getGitHubService();
      authStatus = "✓ GitHub service initialized";
      
      // Try to get app info (this will test the credentials)
      const { Octokit } = await import("octokit");
      const { createAppAuth } = await import("@octokit/auth-app");
      const formattedPrivateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n');
      const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID!,
          privateKey: formattedPrivateKey,
        },
      });
      
      const { data: app } = await octokit.rest.apps.getAuthenticated();
      authStatus = `✓ Authenticated as: ${app.name}`;
      
    } catch (error) {
      authStatus = `✗ Authentication failed: ${error.message}`;
    }

    res.json({
      environment: envCheck,
      authentication: authStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to check GitHub status", 
      details: error.message 
    });
  }
});

// API endpoint to fetch PRs from database
app.get("/api/pull-requests", async (_req, res) => {
  try {
    const { db, schema } = await import("./db");
    const prs = await db.select().from(schema.pullRequests).orderBy(schema.pullRequests.createdAt);
    res.json(prs);
  } catch (error) {
    console.error("Error fetching PRs:", error);
    res.status(500).json({ error: "Failed to fetch pull requests" });
  }
});

// API endpoint to fetch PRs from GitHub
app.get("/api/github/pull-requests", async (req, res) => {
  try {
    const { owner, repo } = req.query;
    
    console.log(`Fetching PRs for: ${owner}/${repo}`);
    
    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo parameters are required" });
    }


    const githubService = getGitHubService();
    
    // Get installation ID for the repository
    console.log("Getting installation ID...");
    const installationId = await githubService.getInstallationId(owner as string, repo as string);
    console.log("Installation ID:", installationId);
    
    if (!installationId) {
      return res.status(404).json({ error: "GitHub App not installed on this repository" });
    }

    // Use the GitHub service to fetch PRs with installation-scoped authentication
    console.log("Fetching pull requests with installation-scoped auth...");
    
    const { Octokit } = await import("octokit");
    const { createAppAuth } = await import("@octokit/auth-app");
    const formattedPrivateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n');
    
    // Create installation-scoped Octokit
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: formattedPrivateKey,
        installationId: installationId,
      },
    });

    // Fetch open pull requests
    const { data: prs } = await octokit.rest.pulls.list({
      owner: owner as string,
      repo: repo as string,
      state: "open",
      sort: "created",
      direction: "desc",
      per_page: 20
    });

    console.log(`Found ${prs.length} open pull requests`);

    // Transform the data to match our schema
    const transformedPRs = prs.map(pr => ({
      id: pr.id,
      repo: `${owner}/${repo}`,
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || "unknown",
      summary: null, // Will be filled with AI analysis later
      createdAt: pr.created_at,
      url: pr.html_url,
      state: pr.state,
      body: pr.body
    }));

    res.json(transformedPRs);
  } catch (error) {
    console.error("Error fetching GitHub PRs:", error);
    res.status(500).json({ error: "Failed to fetch GitHub pull requests", details: error.message });
  }
});

// Test endpoint to simulate a GitHub webhook (for testing)
app.post("/test-webhook", async (req, res) => {
  try {
    const testPayload = {
      action: "opened",
      pull_request: {
        number: Math.floor(Math.random() * 1000),
        title: `Test PR #${Math.floor(Math.random() * 1000)}`,
        user: {
          login: "testuser"
        }
      },
      repository: {
        owner: {
          login: "testowner"
        },
        name: "testrepo"
      },
      installation: {
        id: 12345
      }
    };

    console.log("Simulating test webhook...");
    
    // Directly store test PR data without GitHub API calls
    const { db, schema } = await import("./db");
    await db.insert(schema.pullRequests).values({
      repo: `${testPayload.repository.owner.login}/${testPayload.repository.name}`,
      number: testPayload.pull_request.number,
      title: testPayload.pull_request.title,
      author: testPayload.pull_request.user.login,
      summary: null,
    });
    
    console.log(`Test PR #${testPayload.pull_request.number} stored successfully`);
    res.json({ message: "Test webhook processed successfully", payload: testPayload });
  } catch (error) {
    console.error("Test webhook error:", error);
    res.status(500).json({ error: "Test webhook failed", details: error.message });
  }
});

// webhook for GitHub events
app.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;
    const payload = req.body;

    console.log(`Received webhook event: ${event}`);

    // Get GitHub service (will initialize if needed)
    const githubService = getGitHubService();
    const webhookService = getWebhookService();

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";
    if (!githubService.verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return res.status(401).send("Unauthorized");
    }

    // Parse JSON payload
    const jsonPayload = JSON.parse(payload.toString());

    if (event === "pull_request") {
      await webhookService.handlePullRequestEvent(jsonPayload);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
