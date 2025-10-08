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
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps or curl requests)
			if (!origin) return callback(null, true);
			
			const allowedOrigins = [
				process.env.CORS_ORIGIN || "http://localhost:3001",
				"http://localhost:3000",
				"http://localhost:3001",
				"http://127.0.0.1:3001",
				"http://127.0.0.1:3000",
				"https://reviewiq.xyz",
				"https://www.reviewiq.xyz"
			];
			
			if (allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				// CORS blocked origin
				callback(new Error('Not allowed by CORS'));
			}
		},
		methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
		credentials: true,
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
		optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
	}),
);

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  // Only log non-status requests to reduce noise
  // Request logging removed for production
  next();
});

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
      return null;
    }
    
    try {
      geminiService = new GeminiService(apiKey);
      // Gemini AI service initialized successfully
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

// Health check endpoints
app.get("/", (_req, res) => {
	res.status(200).json({ status: "OK", message: "ReviewIQ API is running", version: "1.0.0" });
});

app.get("/health", (_req, res) => {
	res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});


// API endpoint to fetch PRs from database (REQUIRES authentication, user-specific)
app.get("/pull-requests", async (req, res) => {
  try {
    const { db, schema } = await import("./db");
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get authenticated user
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Fetch ONLY the authenticated user's PRs with AI suggestions
    const prsWithAI = await db
      .select({
        pr: schema.pullRequests,
        ai: schema.aiSuggestions
      })
      .from(schema.pullRequests)
      .leftJoin(schema.aiSuggestions, eq(schema.aiSuggestions.pullRequestId, schema.pullRequests.id))
      .where(eq(schema.pullRequests.userId, user.id))
      .orderBy(schema.pullRequests.createdAt);

    // Group by PR and get the latest AI suggestion for each
    const prMap = new Map();
    prsWithAI.forEach((row: any) => {
      const prId = row.pr.id;
      if (!prMap.has(prId)) {
        prMap.set(prId, { ...row.pr, aiSuggestions: null });
      }
      // Keep the most recent AI suggestion
      if (row.ai) {
        const existing = prMap.get(prId);
        if (!existing.aiSuggestions || new Date(row.ai.createdAt) > new Date(existing.aiSuggestions.createdAt)) {
          prMap.get(prId).aiSuggestions = row.ai;
        }
      }
    });

    const prs = Array.from(prMap.values());
    res.json(prs);
  } catch (error) {
    console.error("Error fetching PRs:", error);
    res.status(500).json({ error: "Failed to fetch pull requests" });
  }
});

app.get("/pull-requests/:id/ai-suggestions", async (req, res) => {
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

// Enhanced reanalysis endpoint with new capabilities
app.post("/reanalyze-pr/:prId", async (req, res) => {
  try {
    const { db, schema } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { getEnhancedGeminiService } = await import("./services/enhanced-gemini");
    const { getEnhancedStaticAnalysisService } = await import("./services/enhanced-static-analysis");
    const { getCodeGraphService } = await import("./services/code-graph");
    
    const prId = parseInt(req.params.prId);
    const { 
      enableStaticAnalysis = true, // Default to true for enhanced analysis
      enableCodeGraph = false,
      enableSandboxValidation = false, // New: Enable sandbox validation
      forceDeepAnalysis = false 
    } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    // Get the PR from database
    const pr = await db.select().from(schema.pullRequests).where(eq(schema.pullRequests.id, prId)).limit(1);
    
    if (!pr.length) {
      return res.status(404).json({ error: "PR not found" });
    }

    const prData = pr[0];
    
    // Initialize enhanced services
    const githubService = getGitHubService();
    const enhancedGeminiService = getEnhancedGeminiService(process.env.GEMINI_API_KEY);
    const staticAnalysisService = getEnhancedStaticAnalysisService();
    const codeGraphService = getCodeGraphService();
    
    // Initialize vector embedding service if Gemini API key is available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        // Initialize vector service with current working directory as codebase path
        const codebasePath = process.cwd();
        // Initializing vector service
        await githubService.initializeVectorService(geminiApiKey, codebasePath, true);
        // Vector service initialization started
      } catch (error) {
        // Vector service initialization failed, continue without it
      }
    }
    
    
    try {
      // Fetch fresh PR data from GitHub
      const [owner, repo] = prData.repo.split('/');
      const installationId = process.env.GITHUB_INSTALLATION_ID;
      
      // Starting enhanced PR analysis
      
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
      
      const { pr, diff, files } = enhancedPRData;
      // Handle enhanced context if available
      const contextToUse = (enhancedPRData as any).enhancedContext || null;
      
      // Step 1: Enhanced static analysis
      let staticResults = null;
      if (enableStaticAnalysis) {
        const fileContents = staticAnalysisService.extractFileContents(diff);
        staticResults = await staticAnalysisService.analyzeCodeEnhanced(fileContents, diff);
      }

      // Step 2: Code graph analysis (optional)
      let codeGraphResults = null;
      if (enableCodeGraph) {
        const fileContents = staticAnalysisService.extractFileContents(diff);
        const changedFileNames = files.map(f => f.filename);
        codeGraphResults = await codeGraphService.analyzeCodeGraph(fileContents, diff, changedFileNames);
      }

      // Step 3: Enhanced AI analysis with multi-model approach
      // Starting AI analysis with enhanced context
      const analysisResult = await enhancedGeminiService.analyzeWithMultiModel(
        pr.title,
        pr.body || "",
        diff,
        files.map(file => ({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes
        })),
        {
          enableStaticAnalysis,
          forceDeepAnalysis,
          includeContext: {
            ...contextToUse,
            staticAnalysis: staticResults,
            codeGraph: codeGraphResults
          }
        }
      );

      // AI analysis completed successfully

      // Convert structured result to legacy format for database compatibility
      const legacyResult = convertToLegacyFormat(analysisResult.proAnalysis);

      // Update existing AI suggestions with enhanced data
      await db.update(schema.aiSuggestions)
        .set({
          summary: legacyResult.summary,
          refactorSuggestions: legacyResult.refactorSuggestions,
          potentialIssues: legacyResult.potentialIssues,
          detailedAnalysis: JSON.stringify({
            ...legacyResult.detailedAnalysis,
            enhancedAnalysis: analysisResult.proAnalysis,
            staticAnalysisResults: staticResults,
            codeGraphResults: codeGraphResults,
            analysisMetadata: {
              mode: analysisResult.analysisMode,
              processingTime: analysisResult.processingTime,
              estimatedCost: analysisResult.totalCost
            }
          }),
          analysisMode: `enhanced-${analysisResult.analysisMode}`,
          analysisStatus: "completed"
        })
        .where(eq(schema.aiSuggestions.pullRequestId, prId));

      // Update PR summary
      await db.update(schema.pullRequests)
        .set({ summary: analysisResult.proAnalysis.summary })
        .where(eq(schema.pullRequests.id, prId));

      res.json({ 
        success: true, 
        message: "Enhanced PR analysis completed successfully",
        analysisMode: analysisResult.analysisMode,
        processingTime: analysisResult.processingTime,
        staticIssuesFound: staticResults?.summary.totalIssues || 0,
        codeGraphSymbols: codeGraphResults?.summary.totalSymbols || 0,
        finalVerdict: analysisResult.proAnalysis.finalVerdict,
        contextMetrics: analysisResult.proAnalysis.contextMetrics
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

app.get("/pull-requests-with-ai", async (req, res) => {
  try {
    const { db, schema } = await import("./db");
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get authenticated user
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Get ONLY the authenticated user's PRs with their AI suggestions
    const prsWithAI = await db
      .select({
        pr: schema.pullRequests,
        ai: schema.aiSuggestions
      })
      .from(schema.pullRequests)
      .leftJoin(schema.aiSuggestions, eq(schema.aiSuggestions.pullRequestId, schema.pullRequests.id))
      .where(eq(schema.pullRequests.userId, user.id))
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
app.get("/github/pull-requests", async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const userToken = req.headers.authorization?.replace('Bearer ', '');
    
    
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
    const installationId = await githubService.getInstallationId(owner as string, repo as string);
    
    if (!installationId) {
      return res.status(404).json({ error: "GitHub App not installed on this repository" });
    }

    // Use the GitHub service to fetch PRs with installation-scoped authentication
    
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



// Enhanced analyze PR endpoint
app.post("/analyze-pr", async (req, res) => {
  try {
    // PR Analysis requested
    const { 
      owner, 
      repo, 
      prNumber, 
      userToken, 
      enableMultiPass = false,
      enableStaticAnalysis = true, // Default to true for enhanced analysis
      enableCodeGraph = false,
      enableSandboxValidation = false, // New: Enable sandbox validation
      forceDeepAnalysis = false 
    } = req.body;
    
    if (!owner || !repo || !prNumber || !userToken) {
      return res.status(400).json({ error: "Owner, repo, prNumber, and userToken are required" });
    }

    // Verify user has access to this repository
    const hasAccess = await verifyUserRepoAccess(userToken, owner, repo);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied to this repository" });
    }

    const githubService = getGitHubService();
    
    // Initialize vector embedding service if Gemini API key is available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        // Initialize vector service with current working directory as codebase path
        const codebasePath = process.cwd();
        // Initializing vector service
        await githubService.initializeVectorService(geminiApiKey, codebasePath, true);
        // Vector service initialization started
      } catch (error) {
        // Vector service initialization failed, continue without it
      }
    }
    
    // Use original Gemini service for now to avoid import issues
    const geminiService = getGeminiService();
    if (!geminiService) {
      return res.status(500).json({ error: "Gemini AI service not available" });
    }
    
    // Enhanced services (optional)
    let staticAnalysisService = null;
    let codeGraphService = null;
    let sandboxValidatorService = null;
    let patchGeneratorService = null;
    
    if (enableStaticAnalysis) {
      try {
        const { getEnhancedStaticAnalysisService } = await import("./services/enhanced-static-analysis");
        staticAnalysisService = getEnhancedStaticAnalysisService();
      } catch (error) {
        // Enhanced static analysis not available, continue without it
      }
    }
    
    if (enableCodeGraph) {
      try {
        const { getCodeGraphService } = await import("./services/code-graph");
        codeGraphService = getCodeGraphService();
      } catch (error) {
        // Code graph service not available, continue without it
      }
    }
    
    if (enableSandboxValidation) {
      try {
        const { getSandboxValidatorService } = await import("./services/sandbox-validator");
        const { getPatchGeneratorService } = await import("./services/patch-generator");
        sandboxValidatorService = getSandboxValidatorService();
        patchGeneratorService = getPatchGeneratorService();
      } catch (error) {
        // Sandbox validation not available, continue without it
      }
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

    // Get user from token (either from header or body)
    const token = req.headers.authorization?.replace('Bearer ', '') || userToken;
    let userId = null;
    if (token) {
      const user = await getUserFromToken(token);
      if (user) {
        userId = user.id;
      }
    }
    
    // If we still don't have a userId, try to find/create user from GitHub API
    if (!userId && userToken) {
      try {
        // Fetch user info from GitHub
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: "application/json",
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Check if user exists in our database
          const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.githubId, userData.id.toString()),
          });
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Create new user
            const [newUser] = await db
              .insert(schema.users)
              .values({
                githubId: userData.id.toString(),
                username: userData.login,
                name: userData.name,
                email: userData.email,
                avatarUrl: userData.avatar_url,
                accessToken: userToken,
              })
              .returning();
            userId = newUser.id;
          }
        }
      } catch (error) {
        // Failed to get user from GitHub, continue without userId
        console.error("Failed to fetch user from GitHub:", error);
      }
    }

    let storedPR;
    if (existingPR.length > 0) {
      storedPR = existingPR[0];
      // Update userId if not set and we have a user
      if (!storedPR.userId && userId) {
        await db
          .update(schema.pullRequests)
          .set({ userId, updatedAt: new Date() })
          .where(eq(schema.pullRequests.id, storedPR.id));
        storedPR.userId = userId;
      }
    } else {
      // Store PR data
      const [newPR] = await db.insert(schema.pullRequests).values({
        userId,
        repo: `${owner}/${repo}`,
        owner,
        number: prNumber,
        title: prData.pr.title,
        author: prData.pr.user?.login || "unknown",
        summary: null,
        status: prData.pr.state || "open",
      }).returning();
      storedPR = newPR;
    }

        // Run analysis (enhanced if available, fallback to original)
        try {
          // Step 1: Enhanced static analysis (if enabled and available)
          let staticResults = null;
          if (enableStaticAnalysis && staticAnalysisService) {
            const fileContents = staticAnalysisService.extractFileContents(prData.diff);
            staticResults = await staticAnalysisService.analyzeCodeEnhanced(fileContents, prData.diff);
          }

          // Step 2: Code graph analysis (if enabled and available)
          let codeGraphResults = null;
          if (enableCodeGraph && codeGraphService && staticAnalysisService) {
            const fileContents = staticAnalysisService.extractFileContents(prData.diff);
            const changedFileNames = prData.files.map(f => f.filename);
            codeGraphResults = await codeGraphService.analyzeCodeGraph(fileContents, prData.diff, changedFileNames);
          }

          // Step 3: AI analysis (use original Gemini service for reliability)
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
            enableMultiPass || forceDeepAnalysis, // Use multipass if requested
            enableStaticAnalysis,
            (prData as any).enhancedContext || null
          );

          // Step 4: Sandbox validation (if enabled and available)
          let sandboxResults = null;
          if (enableSandboxValidation && sandboxValidatorService && patchGeneratorService) {
            try {
              // Extract AI suggestions from analysis result
              const aiSuggestions = extractAISuggestions(analysisResult);
              
              if (aiSuggestions.length > 0) {
                // Generate patches from AI suggestions
                const fileContents = await patchGeneratorService.extractFileContents(prData.diff);
                const patchResults = await patchGeneratorService.generatePatches(aiSuggestions, fileContents);
                
                if (patchResults.patches.length > 0) {
                  // Validate patches in sandbox
                  const repoUrl = `https://github.com/${owner}/${repo}.git`;
                  const branchName = prData.pr.head?.ref || 'main';
                  
                  sandboxResults = await sandboxValidatorService.validatePatches(
                    repoUrl,
                    branchName,
                    patchResults.patches
                  );
                }
              }
            } catch (sandboxError) {
              console.error("Sandbox validation failed:", sandboxError);
              // Continue without sandbox results
            }
          }

          // Store AI analysis results
          await db.insert(schema.aiSuggestions).values({
            pullRequestId: storedPR.id,
            summary: analysisResult.summary,
            refactorSuggestions: analysisResult.refactorSuggestions,
            potentialIssues: analysisResult.potentialIssues,
            detailedAnalysis: JSON.stringify({
              ...(analysisResult.detailedAnalysis || {}),
              staticAnalysisResults: staticResults,
              codeGraphResults: codeGraphResults,
              sandboxValidationResults: sandboxResults,
              enhancedFeaturesUsed: {
                staticAnalysis: !!staticResults,
                codeGraph: !!codeGraphResults,
                sandboxValidation: !!sandboxResults
              }
            }),
            staticAnalysisResults: staticResults ? JSON.stringify(staticResults) : null,
            analysisMode: enableStaticAnalysis ? "enhanced-static" : enableMultiPass ? "multi-pass" : "single-pass",
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
            potentialIssues: analysisResult.potentialIssues,
            enhancedFeatures: {
              staticAnalysisIssues: staticResults?.summary.totalIssues || 0,
              codeGraphSymbols: codeGraphResults?.summary.totalSymbols || 0,
              sandboxValidationResults: sandboxResults?.length || 0,
              staticAnalysisEnabled: !!staticResults,
              codeGraphEnabled: !!codeGraphResults,
              sandboxValidationEnabled: !!sandboxResults
            }
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

// Helper function to get user from access token
async function getUserFromToken(token: string) {
  const { db, schema } = await import("./db");
  const { eq } = await import("drizzle-orm");
  
  const user = await db.query.users.findFirst({
    where: eq(schema.users.accessToken, token),
  });
  
  return user;
}

// Get current user endpoint
app.get("/auth/user", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const user = await getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    res.json({
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user information" });
  }
});

// Handle OPTIONS preflight for GitHub OAuth endpoint
app.options("/auth/github", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// GitHub OAuth callback endpoint
app.post("/auth/github", async (req, res) => {
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

    // Fetch user information from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user information from GitHub");
    }

    const userData = await userResponse.json();

    // Store or update user in database
    const { db, schema } = await import("./db");
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.githubId, userData.id.toString()),
    });

    let user;
    if (existingUser) {
      // Update existing user
      const updated = await db
        .update(schema.users)
        .set({
          username: userData.login,
          name: userData.name,
          email: userData.email,
          avatarUrl: userData.avatar_url,
          accessToken: tokenData.access_token, // Store for API access
          updatedAt: new Date(),
        })
        .where(eq(schema.users.githubId, userData.id.toString()))
        .returning();
      user = updated[0];
    } else {
      // Create new user
      const inserted = await db
        .insert(schema.users)
        .values({
          githubId: userData.id.toString(),
          username: userData.login,
          name: userData.name,
          email: userData.email,
          avatarUrl: userData.avatar_url,
          accessToken: tokenData.access_token,
        })
        .returning();
      user = inserted[0];
    }

    res.json({ 
      access_token: tokenData.access_token,
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }
    });
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

// Helper function to extract AI suggestions from analysis result
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAISuggestions(analysisResult: any): Array<{
  file: string;
  line?: number;
  issue: string;
  suggestion: string;
  reasoning: string;
  severity: 'error' | 'warning' | 'info';
  category: 'Security' | 'Performance' | 'Maintainability' | 'Style' | 'Bug' | 'Architecture';
}> {
  const suggestions: any[] = [];
  
  try {
    // Extract from detailed analysis if available
    if (analysisResult.detailedAnalysis?.codeSuggestions) {
      for (const suggestion of analysisResult.detailedAnalysis.codeSuggestions) {
        suggestions.push({
          file: suggestion.file || 'unknown',
          line: suggestion.line || 1,
          issue: suggestion.reason || 'Issue detected',
          suggestion: suggestion.suggested || suggestion.reason || 'Fix recommended',
          reasoning: suggestion.reason || 'Improvement recommended',
          severity: suggestion.severity === 'error' ? 'error' : suggestion.severity === 'warning' ? 'warning' : 'info',
          category: suggestion.category || 'Maintainability'
        });
      }
    }
    
    // Extract from security concerns
    if (analysisResult.detailedAnalysis?.securityConcerns) {
      for (const concern of analysisResult.detailedAnalysis.securityConcerns) {
        if (typeof concern === 'string') {
          const parts = concern.split(':');
          suggestions.push({
            file: parts[0] || 'unknown',
            issue: parts[1] || concern,
            suggestion: `Address security concern: ${parts[1] || concern}`,
            reasoning: 'Security vulnerability detected',
            severity: 'error' as const,
            category: 'Security' as const
          });
        }
      }
    }
  } catch (error) {
    console.warn('Failed to extract AI suggestions:', error);
  }
  
  return suggestions;
}

// Helper functions to generate code examples
function generateOriginalCodeExample(item: any): string {
  const text = item.issue || item.suggestion || '';
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('function') || lowerText.includes('method')) {
    return `function example() {\n  // Original implementation\n  return 'current approach';\n}`;
  }
  
  if (lowerText.includes('variable') || lowerText.includes('const') || lowerText.includes('let')) {
    return `let variable = 'current value';`;
  }
  
  if (lowerText.includes('import') || lowerText.includes('export')) {
    return `import { currentMethod } from './current-module';`;
  }
  
  if (lowerText.includes('async') || lowerText.includes('promise')) {
    return `function getData() {\n  return fetch('/api/data');\n}`;
  }
  
  // Default fallback with actual code structure
  return `// Current implementation\nconst currentCode = {\n  // ${text.slice(0, 30)}...\n};`;
}

function generateSuggestedCodeExample(item: any): string {
  const text = item.suggestion || item.issue || '';
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('function') || lowerText.includes('method')) {
    return `function example() {\n  // Improved implementation\n  return 'better approach';\n}`;
  }
  
  if (lowerText.includes('variable') || lowerText.includes('const') || lowerText.includes('let')) {
    return `const variable = 'improved value';`;
  }
  
  if (lowerText.includes('import') || lowerText.includes('export')) {
    return `import { improvedMethod } from './improved-module';`;
  }
  
  if (lowerText.includes('async') || lowerText.includes('promise')) {
    return `async function getData() {\n  return await fetch('/api/data');\n}`;
  }
  
  // Default fallback with actual code structure
  return `// Improved implementation\nconst improvedCode = {\n  // ${text.slice(0, 30)}...\n};`;
}

// Helper function to convert enhanced analysis to legacy format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToLegacyFormat(proAnalysis: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatSuggestions = (suggestions: any[]) => {
    return suggestions.map(s => 
      `**${s.file} (${s.severity}):** ${s.issue}\n- ${s.suggestion}\n- Reasoning: ${s.reasoning}`
    ).join('\n\n');
  };

  return {
    summary: proAnalysis.summary,
    refactorSuggestions: formatSuggestions(proAnalysis.refactorSuggestions || []),
    potentialIssues: formatSuggestions(proAnalysis.potentialIssues || []),
    detailedAnalysis: {
      overview: `Enhanced Analysis: ${proAnalysis.summary}. Final Verdict: ${proAnalysis.finalVerdict}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      codeSuggestions: [...(proAnalysis.refactorSuggestions || []), ...(proAnalysis.potentialIssues || [])].map((s: any) => ({
        file: s.file,
        line: s.line || 1,
        original: s.originalCode || generateOriginalCodeExample(s),
        suggested: s.suggestedCode || s.suggestion || generateSuggestedCodeExample(s),
        reason: s.reasoning,
        severity: s.severity,
        category: s.category
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      securityConcerns: (proAnalysis.potentialIssues || [])
        .filter((issue: any) => issue.category === 'Security')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((issue: any) => `${issue.file}: ${issue.issue}`),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      performanceImpact: (proAnalysis.potentialIssues || [])
        .filter((issue: any) => issue.category === 'Performance')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((issue: any) => issue.issue)
        .join('. ') || 'No specific performance issues identified',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testingRecommendations: (proAnalysis.testRecommendations || [])
        .map((test: any) => `${test.file}: ${test.suggestion}`),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      architecturalNotes: (proAnalysis.refactorSuggestions || [])
        .filter((suggestion: any) => suggestion.category === 'Architecture')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((suggestion: any) => `${suggestion.file}: ${suggestion.suggestion}`)
    }
  };
}




const port = process.env.PORT || 3000;


// Test endpoint for sandbox validation
app.post("/test-sandbox", async (req, res) => {
  try {
    const { repoUrl, branchName, testPatch } = req.body;
    
    if (!repoUrl || !branchName) {
      return res.status(400).json({ error: "repoUrl and branchName are required" });
    }

    const { getSandboxValidatorService } = await import("./services/sandbox-validator");
    const sandboxService = getSandboxValidatorService();
    
    // Create a simple test patch
    const patches = testPatch ? [testPatch] : [{
      file: "test.js",
      originalContent: "console.log('hello');",
      patchedContent: "console.log('hello world');",
      description: "Update console log message",
      type: "fix" as const
    }];

    const results = await sandboxService.validatePatches(repoUrl, branchName, patches);
    
    res.json({
      success: true,
      message: "Sandbox validation completed",
      results: results.map(r => ({
        patchId: r.patchId,
        success: r.success,
        recommendation: r.summary.recommendation,
        reasoning: r.summary.reasoning,
        testsPassed: r.testResults.passed,
        testsFailed: r.testResults.failed,
        buildSuccess: r.buildResults.success,
        lintIssues: r.lintResults.issues.length
      }))
    });
    
  } catch (error) {
    console.error("Sandbox test failed:", error);
    res.status(500).json({ 
      error: "Sandbox test failed", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Vector service status endpoint
app.get("/vector-status", (req, res) => {
  try {
    const githubService = getGitHubService();
    const status = githubService.getVectorServiceStatus();
    res.json({
      status: "OK",
      vectorService: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: "Failed to get vector service status",
      timestamp: new Date().toISOString()
    });
  }
});

// Reset vector service for testing
app.post("/vector-reset", (req, res) => {
  try {
    const githubService = getGitHubService();
    githubService.resetVectorService();
    // Vector service reset
    res.json({
      status: "OK",
      message: "Vector service reset successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: "Failed to reset vector service",
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
