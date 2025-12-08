import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getGitHubService, getGeminiService } from "../services";
import { getUserFromToken, verifyUserRepoAccess } from "../middleware";
import { extractAISuggestions, convertToLegacyFormat } from "../utils";
import { getPgVectorService } from "../services/pg-vector";
import { getVectorEmbeddingService } from "../services/vector-embedding";
import crypto from "crypto";

// Track which repos are currently being indexed to avoid duplicate indexing
const indexingInProgress = new Set<string>();

/**
 * Trigger background indexing for a repository
 * This runs asynchronously and doesn't block the PR analysis
 */
async function triggerBackgroundIndexing(
  owner: string,
  repo: string,
  installationId: number,
  geminiApiKey: string
): Promise<void> {
  const repoKey = `${owner}/${repo}`;
  
  // Prevent duplicate indexing
  if (indexingInProgress.has(repoKey)) {
    return;
  }
  
  indexingInProgress.add(repoKey);
  console.log(`[RAG] Starting background indexing for ${repoKey}`);
  
  try {
    const { Octokit } = await import("octokit");
    const { createAppAuth } = await import("@octokit/auth-app");
    
    // Create installation-scoped Octokit
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        installationId,
      },
    });
    
    // Get repository default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const branch = repoData.default_branch;
    
    // Get repository tree
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });
    
    // Filter for code files
    const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs", ".cpp", ".c"];
    const codeFiles = tree.tree.filter(
      (item) =>
        item.type === "blob" &&
        item.path &&
        codeExtensions.some((ext) => item.path!.endsWith(ext)) &&
        !item.path.includes("node_modules") &&
        !item.path.includes("dist/") &&
        !item.path.includes("build/") &&
        !item.path.includes(".min.")
    );
    
    // Limit files for background indexing (index most important files first)
    const maxFiles = 50; // Limit to 50 files for background indexing
    const filesToIndex = codeFiles.slice(0, maxFiles);
    
    const vectorService = getVectorEmbeddingService(geminiApiKey, {
      storageMode: "postgres",
      repoOwner: owner,
      repoName: repo,
    });
    
    const pgService = getPgVectorService(owner, repo);
    
    // Process files in batches
    const batchSize = 5;
    let indexed = 0;
    
    for (let i = 0; i < filesToIndex.length; i += batchSize) {
      const batch = filesToIndex.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (file) => {
          try {
            const { data: fileData } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: file.path!,
              ref: branch,
            });
            
            if ("content" in fileData && fileData.type === "file") {
              const content = Buffer.from(fileData.content, "base64").toString("utf-8");
              
              // Skip very large files
              if (content.length > 50000) return;
              
              // Chunk the code
              const chunks = await vectorService.chunkCode(file.path!, content);
              
              // Generate embeddings and store
              for (const chunk of chunks) {
                const embedding = await vectorService.generateQueryEmbedding(
                  `${chunk.type}: ${chunk.functionName || chunk.className || "module"}\n${chunk.content}`
                );
                
                await pgService.storeChunk({
                  ...chunk,
                  embedding,
                  hash: crypto.createHash("md5").update(chunk.content).digest("hex"),
                  lastUpdated: new Date(),
                });
              }
              
              indexed++;
            }
          } catch (error) {
            // Silently skip files that fail
          }
        })
      );
      
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    
    console.log(`[RAG] Indexed ${indexed} files for ${repoKey}`);
    
  } catch (error) {
    console.error(`[RAG] Indexing failed for ${repoKey}:`, error instanceof Error ? error.message : error);
  } finally {
    indexingInProgress.delete(repoKey);
  }
}

/**
 * Incrementally update embeddings for changed files in a PR
 * Only re-indexes files that have actually changed
 */
async function updateEmbeddingsForChangedFiles(
  owner: string,
  repo: string,
  changedFiles: Array<{ filename: string; status: string; patch?: string }>,
  installationId: number,
  geminiApiKey: string
): Promise<{ updated: number; deleted: number; skipped: number }> {
  const results = { updated: 0, deleted: 0, skipped: 0 };
  
  try {
    const { Octokit } = await import("octokit");
    const { createAppAuth } = await import("@octokit/auth-app");
    
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        installationId,
      },
    });
    
    const vectorService = getVectorEmbeddingService(geminiApiKey, {
      storageMode: "postgres",
      repoOwner: owner,
      repoName: repo,
    });
    
    const pgService = getPgVectorService(owner, repo);
    
    // Get default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const branch = repoData.default_branch;
    
    // Filter for code files only
    const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs", ".cpp", ".c"];
    const codeFiles = changedFiles.filter(f => 
      codeExtensions.some(ext => f.filename.endsWith(ext)) &&
      !f.filename.includes("node_modules") &&
      !f.filename.includes("dist/") &&
      !f.filename.includes(".min.")
    );
    
    for (const file of codeFiles) {
      try {
        // Handle deleted files
        if (file.status === "removed") {
          const deleted = await pgService.deleteByFilePath(file.filename);
          results.deleted += deleted;
          continue;
        }
        
        // Fetch current file content
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: branch,
        });
        
        if (!("content" in fileData) || fileData.type !== "file") {
          results.skipped++;
          continue;
        }
        
        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        
        // Skip very large files
        if (content.length > 50000) {
          results.skipped++;
          continue;
        }
        
        // Calculate content hash
        const contentHash = crypto.createHash("md5").update(content).digest("hex");
        
        // Check if file already has up-to-date embeddings
        const status = await pgService.getFileEmbeddingStatus(file.filename, contentHash);
        
        if (status.exists && status.isUpToDate) {
          results.skipped++;
          continue;
        }
        
        // Delete old embeddings for this file
        if (status.exists) {
          await pgService.deleteByFilePath(file.filename);
        }
        
        // Chunk the code
        const chunks = await vectorService.chunkCode(file.filename, content);
        
        // Generate embeddings and store
        for (const chunk of chunks) {
          const embedding = await vectorService.generateQueryEmbedding(
            `${chunk.type}: ${chunk.functionName || chunk.className || "module"}\n${chunk.content}`
          );
          
          await pgService.storeChunk({
            ...chunk,
            embedding,
            hash: contentHash,
            lastUpdated: new Date(),
          });
        }
        
        results.updated++;
        
      } catch (error) {
        // Skip files that fail
        results.skipped++;
      }
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
    
  } catch (error) {
    console.error(`[RAG] Incremental update failed:`, error instanceof Error ? error.message : error);
  }
  
  return results;
}

/**
 * Get pull requests from database (user-specific)
 * GET /pull-requests
 */
export async function getPullRequests(req: Request, res: Response) {
  try {
    const { db, schema } = await import("../db");
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Fetch ONLY the authenticated user's PRs with AI suggestions
    const prsWithAI = await db
      .select({
        pr: schema.pullRequests,
        ai: schema.aiSuggestions,
      })
      .from(schema.pullRequests)
      .leftJoin(
        schema.aiSuggestions,
        eq(schema.aiSuggestions.pullRequestId, schema.pullRequests.id)
      )
      .where(eq(schema.pullRequests.userId, user.id))
      .orderBy(schema.pullRequests.createdAt);

    // Group by PR and get the latest AI suggestion for each
    const prMap = new Map();
    prsWithAI.forEach((row: any) => {
      const prId = row.pr.id;
      if (!prMap.has(prId)) {
        prMap.set(prId, { ...row.pr, aiSuggestions: null });
      }
      if (row.ai) {
        const existing = prMap.get(prId);
        if (
          !existing.aiSuggestions ||
          new Date(row.ai.createdAt) > new Date(existing.aiSuggestions.createdAt)
        ) {
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
}

/**
 * Get pull requests with AI suggestions
 * GET /pull-requests-with-ai
 */
export async function getPullRequestsWithAI(req: Request, res: Response) {
  try {
    const { db, schema } = await import("../db");
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get ONLY the authenticated user's PRs with their AI suggestions
    const prsWithAI = await db
      .select({
        pr: schema.pullRequests,
        ai: schema.aiSuggestions,
      })
      .from(schema.pullRequests)
      .leftJoin(
        schema.aiSuggestions,
        eq(schema.aiSuggestions.pullRequestId, schema.pullRequests.id)
      )
      .where(eq(schema.pullRequests.userId, user.id))
      .orderBy(schema.pullRequests.createdAt);

    // Group by PR and get the latest AI suggestion for each
    const groupedPRs = prsWithAI.reduce(
      (acc: Record<string, unknown>, row: { pr: any; ai: any }) => {
        const prId = row.pr.id;
        if (!acc[prId]) {
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
            aiSuggestions: row.ai
              ? {
                  ...row.ai,
                  detailedAnalysis,
                }
              : null,
          };
        }
        return acc;
      },
      {}
    );

    res.json(Object.values(groupedPRs));
  } catch (error: unknown) {
    console.error("Error fetching PRs with AI:", error);
    res.status(500).json({ error: "Failed to fetch PRs with AI suggestions" });
  }
}

/**
 * Get AI suggestions for a specific PR
 * GET /pull-requests/:id/ai-suggestions
 */
export async function getAISuggestions(req: Request, res: Response) {
  try {
    const prId = parseInt(req.params.id);
    if (isNaN(prId)) {
      return res.status(400).json({ error: "Invalid PR ID" });
    }

    const { db, schema } = await import("../db");
    const suggestions = await db
      .select()
      .from(schema.aiSuggestions)
      .where(eq(schema.aiSuggestions.pullRequestId, prId))
      .orderBy(schema.aiSuggestions.createdAt);

    if (suggestions.length === 0) {
      return res
        .status(404)
        .json({ error: "No AI suggestions found for this PR" });
    }

    res.json(suggestions[0]);
  } catch (error) {
    console.error("Error fetching AI suggestions:", error);
    res.status(500).json({ error: "Failed to fetch AI suggestions" });
  }
}

/**
 * Analyze a pull request
 * POST /analyze-pr
 */
export async function analyzePR(req: Request, res: Response) {
  try {
    const {
      owner,
      repo,
      prNumber,
      userToken,
      enableMultiPass = false,
      enableStaticAnalysis = true,
      enableCodeGraph = false,
      enableSandboxValidation = false,
      forceDeepAnalysis = false,
    } = req.body;

    if (!owner || !repo || !prNumber || !userToken) {
      return res
        .status(400)
        .json({ error: "Owner, repo, prNumber, and userToken are required" });
    }

    // Verify user has access to this repository
    const hasAccess = await verifyUserRepoAccess(userToken, owner, repo);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Access denied to this repository" });
    }

    const githubService = getGitHubService();

    // Note: Vector service initialization is now handled via /vector/index-repo endpoint
    // We no longer auto-index the local codebase - only GitHub repos
    const geminiApiKey = process.env.GEMINI_API_KEY;

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
        const { getEnhancedStaticAnalysisService } = await import(
          "../services/enhanced-static-analysis"
        );
        staticAnalysisService = getEnhancedStaticAnalysisService();
      } catch (error) {
        // Enhanced static analysis not available
      }
    }

    if (enableCodeGraph) {
      try {
        const { getCodeGraphService } = await import("../services/code-graph");
        codeGraphService = getCodeGraphService();
      } catch (error) {
        // Code graph service not available
      }
    }

    if (enableSandboxValidation) {
      try {
        const { getSandboxValidatorService } = await import(
          "../services/sandbox-validator"
        );
        const { getPatchGeneratorService } = await import(
          "../services/patch-generator"
        );
        sandboxValidatorService = getSandboxValidatorService();
        patchGeneratorService = getPatchGeneratorService();
      } catch (error) {
        // Sandbox validation not available
      }
    }

    // Get installation ID
    const installationId = await githubService.getInstallationId(owner, repo);
    if (!installationId) {
      return res
        .status(404)
        .json({ error: "GitHub App not installed on this repository" });
    }

    // Fetch enhanced PR data from GitHub
    const prData = await githubService.getEnhancedPRData(
      owner,
      repo,
      prNumber,
      installationId
    );

    // Check if PR already exists in database
    const { db, schema } = await import("../db");
    const existingPR = await db
      .select()
      .from(schema.pullRequests)
      .where(eq(schema.pullRequests.number, prNumber))
      .limit(1);

    // Get user from token
    const token =
      req.headers.authorization?.replace("Bearer ", "") || userToken;
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
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: "application/json",
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();

          const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) =>
              eq(users.githubId, userData.id.toString()),
          });

          if (existingUser) {
            userId = existingUser.id;
          } else {
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
        console.error("Failed to fetch user from GitHub:", error);
      }
    }

    let storedPR;
    if (existingPR.length > 0) {
      storedPR = existingPR[0];
      if (!storedPR.userId && userId) {
        await db
          .update(schema.pullRequests)
          .set({ userId, updatedAt: new Date() })
          .where(eq(schema.pullRequests.id, storedPR.id));
        storedPR.userId = userId;
      }
    } else {
      const [newPR] = await db
        .insert(schema.pullRequests)
        .values({
          userId,
          repo: `${owner}/${repo}`,
          owner,
          number: prNumber,
          title: prData.pr.title,
          author: prData.pr.user?.login || "unknown",
          summary: null,
          status: prData.pr.state || "open",
        })
        .returning();
      storedPR = newPR;
    }

    // Run analysis
    try {
      let staticResults = null;
      if (enableStaticAnalysis && staticAnalysisService) {
        const fileContents = staticAnalysisService.extractFileContents(
          prData.diff
        );
        staticResults = await staticAnalysisService.analyzeCodeEnhanced(
          fileContents,
          prData.diff
        );
      }

      let codeGraphResults = null;
      if (enableCodeGraph && codeGraphService && staticAnalysisService) {
        const fileContents = staticAnalysisService.extractFileContents(
          prData.diff
        );
        const changedFileNames = prData.files.map((f) => f.filename);
        codeGraphResults = await codeGraphService.analyzeCodeGraph(
          fileContents,
          prData.diff,
          changedFileNames
        );
      }

      // RAG: Retrieve relevant context from vector database
      let ragContext = null;
      if (geminiApiKey) {
        try {
          const pgService = getPgVectorService(owner, repo);
          const embeddingCount = await pgService.getEmbeddingCount();
          
          if (embeddingCount > 0) {
            // Phase 3: Incremental update - update embeddings for changed files
            const changedFilesWithStatus = prData.files.map(f => ({
              filename: f.filename,
              status: f.status || "modified",
              patch: f.patch,
            }));
            
            // Run incremental update in background (non-blocking)
            updateEmbeddingsForChangedFiles(
              owner,
              repo,
              changedFilesWithStatus,
              installationId,
              geminiApiKey
            ).catch(() => {});
            
            const vectorService = getVectorEmbeddingService(geminiApiKey, {
              storageMode: "postgres",
              repoOwner: owner,
              repoName: repo,
            });
            
            // Build search query from PR title, description, and changed files
            const searchQuery = `${prData.pr.title} ${prData.pr.body || ""} ${prData.files.map(f => f.filename).join(" ")}`;
            const queryEmbedding = await vectorService.generateQueryEmbedding(searchQuery);
            
            // Search for relevant code context
            const relevantContext = await pgService.semanticSearch(queryEmbedding, {
              maxResults: 15,
              minSimilarity: 0.25,
            });
            
            if (relevantContext.length > 0) {
              ragContext = {
                retrievedChunks: relevantContext.map(r => ({
                  filePath: r.chunk.filePath,
                  type: r.chunk.type,
                  functionName: r.chunk.functionName,
                  className: r.chunk.className,
                  content: r.chunk.content,
                  similarity: r.similarity,
                  lines: `${r.chunk.startLine}-${r.chunk.endLine}`,
                })),
                summary: {
                  totalChunks: relevantContext.length,
                  avgSimilarity: relevantContext.reduce((sum, r) => sum + r.similarity, 0) / relevantContext.length,
                  filesCovered: [...new Set(relevantContext.map(r => r.chunk.filePath))].length,
                },
              };
            }
          } else {
            // Auto-index for first-time repos (non-blocking)
            triggerBackgroundIndexing(owner, repo, installationId, geminiApiKey).catch(() => {});
          }
        } catch (error) {
          // Continue without RAG context
        }
      }

      // Merge RAG context with existing enhanced context
      const enhancedContext = {
        ...(prData as any).enhancedContext,
        ragContext,
      };

      const analysisResult = await geminiService.analyzePullRequest(
        prData.pr.title,
        prData.pr.body || "",
        prData.diff,
        prData.files.map((file) => ({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        })),
        enableMultiPass || forceDeepAnalysis,
        enableStaticAnalysis,
        enhancedContext
      );

      let sandboxResults = null;
      if (
        enableSandboxValidation &&
        sandboxValidatorService &&
        patchGeneratorService
      ) {
        try {
          const aiSuggestions = extractAISuggestions(analysisResult);

          if (aiSuggestions.length > 0) {
            const fileContents = await patchGeneratorService.extractFileContents(
              prData.diff
            );
            const patchResults = await patchGeneratorService.generatePatches(
              aiSuggestions,
              fileContents
            );

            if (patchResults.patches.length > 0) {
              const repoUrl = `https://github.com/${owner}/${repo}.git`;
              const branchName = prData.pr.head?.ref || "main";

              sandboxResults = await sandboxValidatorService.validatePatches(
                repoUrl,
                branchName,
                patchResults.patches
              );
            }
          }
        } catch (sandboxError) {
          console.error("Sandbox validation failed:", sandboxError);
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
            sandboxValidation: !!sandboxResults,
          },
        }),
        staticAnalysisResults: staticResults
          ? JSON.stringify(staticResults)
          : null,
        analysisMode: enableStaticAnalysis
          ? "enhanced-static"
          : enableMultiPass
            ? "multi-pass"
            : "single-pass",
        analysisStatus: "completed",
      });

      // Update the PR summary
      await db
        .update(schema.pullRequests)
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
          sandboxValidationEnabled: !!sandboxResults,
        },
      });
    } catch (aiError) {
      console.error("AI analysis error:", aiError);

      await db.insert(schema.aiSuggestions).values({
        pullRequestId: storedPR.id,
        summary: "AI analysis failed",
        refactorSuggestions: "Unable to generate suggestions",
        potentialIssues: "Unable to identify issues",
        analysisStatus: "failed",
      });

      res.status(500).json({
        error: "AI analysis failed",
        details: aiError instanceof Error ? aiError.message : "Unknown error",
      });
    }
  } catch (error: unknown) {
    console.error("Error analyzing PR:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to analyze PR",
      details: errorMessage,
    });
  }
}

/**
 * Reanalyze a pull request with enhanced analysis
 * POST /reanalyze-pr/:prId
 */
export async function reanalyzePR(req: Request, res: Response) {
  try {
    const { db, schema } = await import("../db");
    const { getEnhancedGeminiService } = await import(
      "../services/enhanced-gemini"
    );
    const { getEnhancedStaticAnalysisService } = await import(
      "../services/enhanced-static-analysis"
    );
    const { getCodeGraphService } = await import("../services/code-graph");

    const prId = parseInt(req.params.prId);
    const {
      enableStaticAnalysis = true,
      enableCodeGraph = false,
      enableSandboxValidation = false,
      forceDeepAnalysis = false,
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    // Get the PR from database
    const pr = await db
      .select()
      .from(schema.pullRequests)
      .where(eq(schema.pullRequests.id, prId))
      .limit(1);

    if (!pr.length) {
      return res.status(404).json({ error: "PR not found" });
    }

    const prData = pr[0];

    // Initialize enhanced services
    const githubService = getGitHubService();
    const enhancedGeminiService = getEnhancedGeminiService(
      process.env.GEMINI_API_KEY
    );
    const staticAnalysisService = getEnhancedStaticAnalysisService();
    const codeGraphService = getCodeGraphService();

    // Initialize vector embedding service
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const codebasePath = process.cwd();
        await githubService.initializeVectorService(
          geminiApiKey,
          codebasePath,
          true
        );
      } catch (error) {
        // Vector service initialization failed, continue without it
      }
    }

    try {
      // Fetch fresh PR data from GitHub
      const [owner, repo] = prData.repo.split("/");
      const installationId = process.env.GITHUB_INSTALLATION_ID;

      if (!installationId) {
        throw new Error("GITHUB_INSTALLATION_ID not configured");
      }

      // Fetch enhanced PR data
      const enhancedPRData = await githubService.getEnhancedPRData(
        owner,
        repo,
        prData.number,
        parseInt(installationId)
      );

      const { pr: prInfo, diff, files } = enhancedPRData;
      const contextToUse = (enhancedPRData as any).enhancedContext || null;

      // Step 1: Enhanced static analysis
      let staticResults = null;
      if (enableStaticAnalysis) {
        const fileContents = staticAnalysisService.extractFileContents(diff);
        staticResults = await staticAnalysisService.analyzeCodeEnhanced(
          fileContents,
          diff
        );
      }

      // Step 2: Code graph analysis
      let codeGraphResults = null;
      if (enableCodeGraph) {
        const fileContents = staticAnalysisService.extractFileContents(diff);
        const changedFileNames = files.map((f) => f.filename);
        codeGraphResults = await codeGraphService.analyzeCodeGraph(
          fileContents,
          diff,
          changedFileNames
        );
      }

      // Step 3: Enhanced AI analysis
      const analysisResult = await enhancedGeminiService.analyzeWithMultiModel(
        prInfo.title,
        prInfo.body || "",
        diff,
        files.map((file) => ({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        })),
        {
          enableStaticAnalysis,
          forceDeepAnalysis,
          includeContext: {
            ...contextToUse,
            staticAnalysis: staticResults,
            codeGraph: codeGraphResults,
          },
        }
      );

      // Convert structured result to legacy format
      const legacyResult = convertToLegacyFormat(analysisResult.proAnalysis);

      // Update existing AI suggestions
      await db
        .update(schema.aiSuggestions)
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
              estimatedCost: analysisResult.totalCost,
            },
          }),
          analysisMode: `enhanced-${analysisResult.analysisMode}`,
          analysisStatus: "completed",
        })
        .where(eq(schema.aiSuggestions.pullRequestId, prId));

      // Update PR summary
      await db
        .update(schema.pullRequests)
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
        contextMetrics: analysisResult.proAnalysis.contextMetrics,
      });
    } catch (githubError) {
      console.error("Error fetching PR data from GitHub:", githubError);
      const errorMessage =
        githubError instanceof Error ? githubError.message : "Unknown error";
      return res.status(500).json({
        error: "Failed to fetch PR data from GitHub",
        details: errorMessage,
        repo: prData.repo,
        prNumber: prData.number,
      });
    }
  } catch (error: unknown) {
    console.error("Error reanalyzing PR:", error);
    res.status(500).json({
      error: "Failed to reanalyze PR",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

