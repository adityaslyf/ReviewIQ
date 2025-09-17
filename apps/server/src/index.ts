import "dotenv/config";
import cors from "cors";
import express from "express";
import { GitHubService } from "./services/github";
import { WebhookService } from "./services/webhook";
import { GeminiService } from "./services/gemini";
import { eq } from "drizzle-orm";

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
let geminiService: GeminiService | null = null;
let webhookService: WebhookService | null = null;

function getGitHubService(): GitHubService {
  if (!githubService) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    
    if (!appId || !privateKey) {
      throw new Error("GitHub App ID and Private Key must be set in environment variables");
    }
    
    githubService = new GitHubService(appId, privateKey);
  }
  return githubService;
}

function getGeminiService(): GeminiService | null {
  if (!geminiService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set - AI analysis will be disabled");
      return null;
    }
    
    try {
      geminiService = new GeminiService(apiKey);
      console.log("Gemini AI service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Gemini service:", error);
      return null;
    }
  }
  return geminiService;
}

function getWebhookService(): WebhookService {
  if (!webhookService) {
    const github = getGitHubService();
    const gemini = getGeminiService();
    webhookService = new WebhookService(github, gemini || undefined);
  }
  return webhookService;
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
          GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET ? "✓ Set" : "✗ Missing",
          GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "✓ Set" : "✗ Missing"
        };


    // Try to initialize GitHub service
    let authStatus = "Not initialized";
    
    try {
      getGitHubService();
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
        authStatus = `✓ Authenticated as: ${app?.name || 'Unknown'}`;
      
    } catch (error: any) {
      authStatus = `✗ Authentication failed: ${error.message}`;
    }

        // Check Gemini service status
        let geminiStatus = "Not initialized";
        try {
          const gemini = getGeminiService();
          geminiStatus = gemini ? "✓ Gemini AI service ready" : "✗ Gemini AI service unavailable";
        } catch (error: any) {
          geminiStatus = `✗ Gemini service error: ${error?.message || 'Unknown error'}`;
        }

        res.json({
          environment: envCheck,
          authentication: authStatus,
          gemini: geminiStatus,
          timestamp: new Date().toISOString()
        });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to check GitHub status", 
      details: error?.message || 'Unknown error' 
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

app.get("/api/pull-requests/:id/ai-suggestions", async (req, res) => {
  try {
    const prId = parseInt(req.params.id);
    if (isNaN(prId)) {
      return res.status(400).json({ error: "Invalid PR ID" });
    }

    const { db, schema } = await import("./db");
    const suggestions = await db
      .select()
      .from(schema.aiSuggestions)
      .where(eq(schema.aiSuggestions.pullRequestId, prId))
      .orderBy(schema.aiSuggestions.createdAt);

    if (suggestions.length === 0) {
      return res.status(404).json({ error: "No AI suggestions found for this PR" });
    }

    res.json(suggestions[0]); // Return the most recent analysis
  } catch (error) {
    console.error("Error fetching AI suggestions:", error);
    res.status(500).json({ error: "Failed to fetch AI suggestions" });
  }
});

app.get("/api/pull-requests-with-ai", async (_req, res) => {
  try {
    const { db, schema } = await import("./db");
    
    // Get PRs with their AI suggestions
    const prsWithAI = await db
      .select({
        pr: schema.pullRequests,
        ai: schema.aiSuggestions
      })
      .from(schema.pullRequests)
      .leftJoin(schema.aiSuggestions, eq(schema.aiSuggestions.pullRequestId, schema.pullRequests.id))
      .orderBy(schema.pullRequests.createdAt);

    // Group by PR and get the latest AI suggestion for each
    const groupedPRs = prsWithAI.reduce((acc: Record<string, any>, row: any) => {
      const prId = row.pr.id;
      if (!acc[prId]) {
        acc[prId] = {
          ...row.pr,
          aiSuggestions: row.ai
        };
      }
      return acc;
    }, {});

    res.json(Object.values(groupedPRs));
  } catch (error: any) {
    console.error("Error fetching PRs with AI:", error);
    res.status(500).json({ error: "Failed to fetch PRs with AI suggestions" });
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
  } catch (error: any) {
    console.error("Error fetching GitHub PRs:", error);
    res.status(500).json({ error: "Failed to fetch GitHub pull requests", details: error?.message || 'Unknown error' });
  }
});


// Analyze a specific GitHub PR with AI
app.post("/api/analyze-pr", async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.body;
    
    if (!owner || !repo || !prNumber) {
      return res.status(400).json({ error: "Owner, repo, and prNumber are required" });
    }

    const githubService = getGitHubService();
    const geminiService = getGeminiService();
    
    if (!geminiService) {
      return res.status(500).json({ error: "Gemini AI service not available" });
    }

    // Get installation ID
    const installationId = await githubService.getInstallationId(owner, repo);
    if (!installationId) {
      return res.status(404).json({ error: "GitHub App not installed on this repository" });
    }

    // Fetch PR data from GitHub
    const prData = await githubService.getPullRequestData(owner, repo, prNumber, installationId);
    
    // Check if PR already exists in database
    const { db, schema } = await import("./db");
    const existingPR = await db
      .select()
      .from(schema.pullRequests)
      .where(eq(schema.pullRequests.number, prNumber))
      .limit(1);

    let storedPR;
    if (existingPR.length > 0) {
      storedPR = existingPR[0];
    } else {
      // Store PR data
      const [newPR] = await db.insert(schema.pullRequests).values({
        repo: `${owner}/${repo}`,
        number: prNumber,
        title: prData.pr.title,
        author: prData.pr.user?.login || "unknown",
        summary: null,
      }).returning();
      storedPR = newPR;
    }

    // Run AI analysis
    try {
      
      const analysisResult = await geminiService.analyzePullRequest(
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

      
      res.json({
        message: "AI analysis completed successfully",
        prId: storedPR.id,
        prNumber: prNumber,
        summary: analysisResult.summary,
        refactorSuggestions: analysisResult.refactorSuggestions,
        potentialIssues: analysisResult.potentialIssues
      });
      
    } catch (aiError) {
      console.error("AI analysis error:", aiError);
      
      // Mark analysis as failed
      await db.insert(schema.aiSuggestions).values({
        pullRequestId: storedPR.id,
        summary: "AI analysis failed",
        refactorSuggestions: "Unable to generate suggestions",
        potentialIssues: "Unable to identify issues",
        analysisStatus: "failed"
      });
      
      res.status(500).json({ 
        error: "AI analysis failed", 
        details: aiError instanceof Error ? aiError.message : 'Unknown error' 
      });
    }
    
  } catch (error: any) {
    console.error("Error analyzing PR:", error);
    res.status(500).json({ 
      error: "Failed to analyze PR", 
      details: error?.message || 'Unknown error' 
    });
  }
});

// webhook for GitHub events
app.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;
    const payload = req.body;


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
  } catch (error: any) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
