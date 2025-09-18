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

// Verify user has access to a repository
async function verifyUserRepoAccess(userToken: string, owner: string, repo: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error verifying user repo access:', error);
    return false;
  }
}

app.get("/", (_req, res) => {
	res.status(200).send("OK");
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

// Reanalyze an existing PR to get enhanced analysis
app.post("/api/reanalyze-pr/:prId", async (req, res) => {
  try {
    const { db, schema } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { GeminiService } = await import("./services/gemini");
    
    const prId = parseInt(req.params.prId);
    const { enableMultiPass = false, enableStaticAnalysis = false } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    // Get the PR from database
    const pr = await db.select().from(schema.pullRequests).where(eq(schema.pullRequests.id, prId)).limit(1);
    
    if (!pr.length) {
      return res.status(404).json({ error: "PR not found" });
    }

    const prData = pr[0];
    
    // Initialize services
    const githubService = getGitHubService();
    const geminiService = new GeminiService(process.env.GEMINI_API_KEY);
    
    console.log(`Reanalyzing PR #${prData.number} from ${prData.repo}...`);
    
    try {
      // Fetch fresh PR data from GitHub
      console.log(`Fetching PR data for ${prData.repo}#${prData.number}...`);
      const [owner, repo] = prData.repo.split('/');
      const installationId = process.env.GITHUB_INSTALLATION_ID;
      
      if (!installationId) {
        throw new Error("GITHUB_INSTALLATION_ID not configured");
      }
      
      // Fetch enhanced PR data with comprehensive context
      const enhancedPRData = await githubService.getEnhancedPRData(
        owner, 
        repo, 
        prData.number, 
        parseInt(installationId)
      );
      
      const { pr, diff, files, enhancedContext } = enhancedPRData;
      // Handle fallback case where enhancedContext might not exist
      const contextToUse = enhancedContext || null;
      console.log(`Successfully fetched enhanced PR data: ${diff.length} chars diff, ${files.length} files, enhanced context available`);
      
      // Run enhanced AI analysis with full context
      const analysisResult = await geminiService.analyzePullRequest(
        pr.title,
        pr.body || "",
        diff,
        files.map(file => ({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes
        })),
        enableMultiPass,
        enableStaticAnalysis,
        contextToUse
      );

      console.log(`Analysis completed for PR #${prData.number}: ${analysisResult.detailedAnalysis ? 'with detailed analysis' : 'basic analysis only'}`);

      // Update existing AI suggestions
      await db.update(schema.aiSuggestions)
        .set({
          summary: analysisResult.summary,
          refactorSuggestions: analysisResult.refactorSuggestions,
          potentialIssues: analysisResult.potentialIssues,
          detailedAnalysis: analysisResult.detailedAnalysis ? JSON.stringify(analysisResult.detailedAnalysis) : null,
          staticAnalysisResults: (analysisResult as any).staticAnalysisResults ? JSON.stringify((analysisResult as any).staticAnalysisResults) : null,
          analysisMode: enableStaticAnalysis ? "static-enhanced" : enableMultiPass ? "multi-pass" : "single-pass",
          analysisStatus: "completed"
        })
        .where(eq(schema.aiSuggestions.pullRequestId, prId));

      // Update PR summary
      await db.update(schema.pullRequests)
        .set({ summary: analysisResult.summary })
        .where(eq(schema.pullRequests.id, prId));

      res.json({ 
        success: true, 
        message: "PR reanalyzed successfully",
        hasDetailedAnalysis: !!analysisResult.detailedAnalysis
      });
    } catch (githubError) {
      console.error("Error fetching PR data from GitHub:", githubError);
      const errorMessage = githubError instanceof Error ? githubError.message : 'Unknown error';
      return res.status(500).json({ 
        error: "Failed to fetch PR data from GitHub", 
        details: errorMessage,
        repo: prData.repo,
        prNumber: prData.number
      });
    }
  } catch (error: unknown) {
    console.error("Error reanalyzing PR:", error);
    res.status(500).json({ 
      error: "Failed to reanalyze PR", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groupedPRs = prsWithAI.reduce((acc: Record<string, unknown>, row: { pr: any; ai: any }) => {
      const prId = row.pr.id;
      if (!acc[prId]) {
        // Parse the detailedAnalysis JSON if it exists
        let detailedAnalysis = null;
        
        if (row.ai?.detailedAnalysis) {
          try {
            detailedAnalysis = JSON.parse(row.ai.detailedAnalysis);
          } catch (error) {
            console.error("Error parsing detailed analysis JSON:", error);
            detailedAnalysis = null;
          }
        }


        acc[prId] = {
          ...row.pr,
          aiSuggestions: row.ai ? {
            ...row.ai,
            detailedAnalysis
          } : null
        };
      }
      return acc;
    }, {});

    res.json(Object.values(groupedPRs));
  } catch (error: unknown) {
    console.error("Error fetching PRs with AI:", error);
    res.status(500).json({ error: "Failed to fetch PRs with AI suggestions" });
  }
});

// API endpoint to fetch PRs from GitHub
app.get("/api/github/pull-requests", async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const userToken = req.headers.authorization?.replace('Bearer ', '');
    
    console.log(`Fetching PRs for: ${owner}/${repo}`);
    
    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo parameters are required" });
    }

    if (!userToken) {
      return res.status(401).json({ error: "User token is required" });
    }

    // Verify user has access to this repository
    const hasAccess = await verifyUserRepoAccess(userToken, owner as string, repo as string);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this repository" });
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
  } catch (error: unknown) {
    console.error("Error fetching GitHub PRs:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: "Failed to fetch GitHub pull requests", details: errorMessage });
  }
});

// Analyze a specific GitHub PR with AI
app.post("/api/analyze-pr", async (req, res) => {
  try {
    const { owner, repo, prNumber, userToken, enableMultiPass = false, enableStaticAnalysis = false } = req.body;
    
    if (!owner || !repo || !prNumber || !userToken) {
      return res.status(400).json({ error: "Owner, repo, prNumber, and userToken are required" });
    }

    // Verify user has access to this repository
    const hasAccess = await verifyUserRepoAccess(userToken, owner, repo);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this repository" });
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

    // Fetch enhanced PR data from GitHub with comprehensive context
    const prData = await githubService.getEnhancedPRData(owner, repo, prNumber, installationId);
    
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
            prData.files.map(file => ({
              filename: file.filename,
              additions: file.additions,
              deletions: file.deletions,
              changes: file.changes
            })),
            enableMultiPass,
            enableStaticAnalysis,
            prData.enhancedContext || null
          );

          // Store AI analysis results
          await db.insert(schema.aiSuggestions).values({
            pullRequestId: storedPR.id,
            summary: analysisResult.summary,
            refactorSuggestions: analysisResult.refactorSuggestions,
            potentialIssues: analysisResult.potentialIssues,
            detailedAnalysis: analysisResult.detailedAnalysis ? JSON.stringify(analysisResult.detailedAnalysis) : null,
            staticAnalysisResults: (analysisResult as any).staticAnalysisResults ? JSON.stringify((analysisResult as any).staticAnalysisResults) : null,
            analysisMode: enableStaticAnalysis ? "static-enhanced" : enableMultiPass ? "multi-pass" : "single-pass",
            analysisStatus: "completed"
          });

      console.log(`Analysis completed for PR #${prNumber}: ${analysisResult.detailedAnalysis ? 'with detailed analysis' : 'basic analysis only'}`);

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
    
  } catch (error: unknown) {
    console.error("Error analyzing PR:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: "Failed to analyze PR", 
      details: errorMessage
    });
  }
});

// GitHub OAuth callback endpoint
app.post("/api/auth/github", async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    // Check environment variables
    if (!process.env.GITHUB_OAUTH_CLIENT_ID || !process.env.GITHUB_OAUTH_CLIENT_SECRET) {
      console.error("Missing GitHub OAuth environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("GitHub token exchange failed:", tokenResponse.status, errorText);
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error("OAuth error from GitHub:", tokenData);
      throw new Error(tokenData.error_description || "OAuth error");
    }

    if (!tokenData.access_token) {
      console.error("No access token received from GitHub");
      throw new Error("No access token received");
    }

    res.json({ access_token: tokenData.access_token });
  } catch (error: unknown) {
    console.error("GitHub OAuth error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: "Authentication failed", 
      details: errorMessage
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
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = process.env.PORT || 3000;
// Test endpoint for multi-pass analysis
app.post("/api/test-multipass/:prId", async (req, res) => {
  try {
    const { prId } = req.params;
    
    // Trigger reanalysis with multi-pass enabled
    const response = await fetch(`http://localhost:${port}/api/reanalyze-pr/${prId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enableMultiPass: true })
    });

    const result = await response.json();
    
    if (response.ok) {
      res.json({ 
        success: true, 
        message: "Multi-pass analysis completed", 
        ...result 
      });
    } else {
      res.status(response.status).json(result);
    }
  } catch (error) {
    console.error("Error testing multi-pass analysis:", error);
    res.status(500).json({ 
      error: "Failed to test multi-pass analysis", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Context measurement endpoint
app.get("/api/context-metrics/:prId", async (req, res) => {
  try {
    const { prId } = req.params;
    const { db, schema } = await import("./db");
    const { eq } = await import("drizzle-orm");

    // Get the PR from database
    const pr = await db.select().from(schema.pullRequests).where(eq(schema.pullRequests.id, parseInt(prId))).limit(1);
    
    if (pr.length === 0) {
      return res.status(404).json({ error: "PR not found" });
    }

    const [owner, repoName] = pr[0].repo.split('/');
    const githubService = getGitHubService();
    
    // Get installation ID
    const installationId = await githubService.getInstallationId(owner, repoName);
    if (!installationId) {
      return res.status(404).json({ error: "GitHub App not installed" });
    }

    // Fetch enhanced PR data to measure context
    const enhancedPRData = await githubService.getEnhancedPRData(
      owner, 
      repoName, 
      pr[0].number, 
      installationId
    );

    // Build context sections to measure
    const { GeminiService } = await import("./services/gemini");
    const geminiService = new GeminiService(process.env.GEMINI_API_KEY!);
    
    // Get context sections (this will log metrics)
    const fileSummary = enhancedPRData.files.map((file: any) => 
      `- ${file.filename}: +${file.additions} -${file.deletions}`
    ).join('\n');

    const contextSections = (geminiService as any).buildEnhancedContextSections(enhancedPRData.enhancedContext);
    const contextMetrics = (geminiService as any).measureContextSize(
      enhancedPRData.pr.title,
      enhancedPRData.pr.body || "",
      enhancedPRData.diff,
      fileSummary,
      contextSections
    );

    // Add enhanced context breakdown
    const contextBreakdown = {
      recentCommits: enhancedPRData.enhancedContext?.recentCommits?.length || 0,
      branchContext: enhancedPRData.enhancedContext?.branchContext ? 'Available' : 'Not available',
      linkedIssues: enhancedPRData.enhancedContext?.linkedIssues?.length || 0,
      repoStructure: Object.keys(enhancedPRData.enhancedContext?.repoStructure || {}).length,
      cicdChecks: enhancedPRData.enhancedContext?.cicdContext?.summary?.totalChecks || 0,
      reviewComments: (enhancedPRData.enhancedContext?.reviewComments?.reviews?.length || 0) + 
                     (enhancedPRData.enhancedContext?.reviewComments?.comments?.length || 0)
    };

    res.json({
      prInfo: {
        id: pr[0].id,
        number: pr[0].number,
        title: pr[0].title,
        repo: pr[0].repo
      },
      contextMetrics,
      contextBreakdown,
      enhancedContextAvailable: !!enhancedPRData.enhancedContext
    });

  } catch (error) {
    console.error("Error getting context metrics:", error);
    res.status(500).json({ 
      error: "Failed to get context metrics", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
