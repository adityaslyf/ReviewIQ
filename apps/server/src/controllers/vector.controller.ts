import type { Request, Response } from "express";
import { getGitHubService, getGeminiService } from "../services";
import { getPgVectorService } from "../services/pg-vector";
import { getVectorEmbeddingService } from "../services/vector-embedding";

/**
 * Index a repository - generate embeddings for all code files
 * POST /vector/index-repo
 */
export async function indexRepository(req: Request, res: Response) {
  try {
    const { owner, repo, branch = "main" } = req.body;

    if (!owner || !repo) {
      return res.status(400).json({ 
        error: "owner and repo are required" 
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY not configured" 
      });
    }

    // Get vector embedding service with postgres storage
    const vectorService = getVectorEmbeddingService(geminiApiKey, {
      storageMode: "postgres",
      repoOwner: owner,
      repoName: repo,
    });

    // Get GitHub service to fetch repository files
    const githubService = getGitHubService();
    const installationId = await githubService.getInstallationId(owner, repo);

    if (!installationId) {
      return res.status(404).json({ 
        error: "GitHub App not installed on this repository" 
      });
    }

    // Start indexing in background
    res.json({
      status: "started",
      message: `Indexing started for ${owner}/${repo}`,
      note: "Check /vector-status for progress",
    });

    // Run indexing in background (after response is sent)
    setImmediate(async () => {
      try {
        await indexRepoFiles(owner, repo, branch, installationId, vectorService, githubService);
      } catch (error) {
        console.error(`Indexing failed for ${owner}/${repo}:`, error instanceof Error ? error.message : error);
      }
    });

  } catch (error) {
    console.error("Index repository failed:", error);
    res.status(500).json({
      error: "Failed to start repository indexing",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Helper function to index repository files
 */
async function indexRepoFiles(
  owner: string,
  repo: string,
  branch: string,
  installationId: number,
  vectorService: any,
  githubService: any
) {
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

  // Process files in batches
  const batchSize = 10;
  const pgService = getPgVectorService(owner, repo);
  
  for (let i = 0; i < codeFiles.length; i += batchSize) {
    const batch = codeFiles.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (file) => {
        try {
          // Fetch file content
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.path!,
            ref: branch,
          });

          if ("content" in fileData && fileData.type === "file") {
            const content = Buffer.from(fileData.content, "base64").toString("utf-8");
            
            // Skip very large files
            if (content.length > 100000) {
              return;
            }

            // Chunk the code
            const chunks = await vectorService.chunkCode(file.path!, content);
            
            // Generate embeddings and store
            for (const chunk of chunks) {
              const embedding = await vectorService.generateQueryEmbedding(
                vectorService.prepareTextForEmbedding
                  ? chunk.content
                  : `${chunk.type}: ${chunk.functionName || chunk.className || "module"}\n${chunk.content}`
              );

              await pgService.storeChunk({
                ...chunk,
                embedding,
                hash: require("crypto").createHash("md5").update(chunk.content).digest("hex"),
                lastUpdated: new Date(),
              });
            }

          }
        } catch (error) {
          // Skip files that fail to index
        }
      })
    );
    
    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Search for relevant code context
 * POST /vector/search
 */
export async function searchCodeContext(req: Request, res: Response) {
  try {
    const { query, owner, repo, maxResults = 10, minSimilarity = 0.3 } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    // Get vector service
    const vectorService = getVectorEmbeddingService(geminiApiKey, {
      storageMode: "postgres",
      repoOwner: owner,
      repoName: repo,
    });

    // Generate query embedding
    const queryEmbedding = await vectorService.generateQueryEmbedding(query);

    // Search in PostgreSQL
    const pgService = getPgVectorService(owner, repo);
    const results = await pgService.semanticSearch(queryEmbedding, {
      maxResults,
      minSimilarity,
    });

    res.json({
      query,
      resultsCount: results.length,
      results: results.map((r) => ({
        filePath: r.chunk.filePath,
        chunkType: r.chunk.type,
        functionName: r.chunk.functionName,
        className: r.chunk.className,
        similarity: r.similarity.toFixed(4),
        relevanceScore: r.relevanceScore.toFixed(4),
        preview: r.chunk.content.substring(0, 200) + "...",
        lines: `${r.chunk.startLine}-${r.chunk.endLine}`,
      })),
    });
  } catch (error) {
    console.error("Code search failed:", error);
    res.status(500).json({
      error: "Code search failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Hybrid search combining vector similarity and keyword matching
 * GET /repos/:owner/:repo/hybrid-search?query=...&keywords=...&maxResults=...&minSimilarity=...
 */
export async function hybridSearchVectors(req: Request, res: Response) {
  try {
    const { owner, repo } = req.params;
    const { query, keywords, maxResults = 20, minSimilarity = 0.2, changedFiles } = req.query;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const vectorService = getVectorEmbeddingService(geminiApiKey, {
      storageMode: "postgres",
      repoOwner: owner,
      repoName: repo,
    });

    const queryEmbedding = await vectorService.generateQueryEmbedding(query as string);

    const keywordList = keywords 
      ? (typeof keywords === 'string' ? keywords.split(',') : keywords as string[])
      : (query as string).split(/\s+/).filter(k => k.length > 3);

    const changedFileList = changedFiles
      ? (typeof changedFiles === 'string' ? changedFiles.split(',') : changedFiles as string[])
      : [];

    const pgService = getPgVectorService(owner, repo);
    const results = await pgService.hybridSearch(queryEmbedding, keywordList, {
      maxResults: parseInt(maxResults as string),
      minSimilarity: parseFloat(minSimilarity as string),
      changedFiles: changedFileList,
    });

    res.json({
      query,
      keywords: keywordList,
      resultsCount: results.length,
      results: results.map((r) => ({
        filePath: r.chunk.filePath,
        chunkType: r.chunk.type,
        functionName: r.chunk.functionName,
        relevanceScore: r.relevanceScore.toFixed(4),
        preview: r.chunk.content.substring(0, 200) + "...",
        lines: `${r.chunk.startLine}-${r.chunk.endLine}`,
      })),
    });
  } catch (error) {
    console.error("Hybrid search failed:", error);
    res.status(500).json({
      error: "Hybrid search failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get vector service status
 * GET /vector-status
 */
export async function getVectorStatus(req: Request, res: Response) {
  try {
    const githubService = getGitHubService();
    const status = githubService.getVectorServiceStatus();
    
    // Get PostgreSQL stats if available
    let pgStats = null;
    if (process.env.DATABASE_URL) {
      try {
        const pgService = getPgVectorService();
        pgStats = await pgService.getStats();
      } catch (error) {
        console.warn("Failed to get pgvector stats:", error);
      }
    }
    
    res.json({
      status: "OK",
      vectorService: status,
      pgvectorStats: pgStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: "Failed to get vector service status",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Reset vector service
 * POST /vector-reset
 */
export function resetVectorService(req: Request, res: Response) {
  try {
    const githubService = getGitHubService();
    githubService.resetVectorService();
    res.json({
      status: "OK",
      message: "Vector service reset successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: "Failed to reset vector service",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Test sandbox validation
 * POST /test-sandbox
 */
export async function testSandbox(req: Request, res: Response) {
  try {
    const { repoUrl, branchName, testPatch } = req.body;

    if (!repoUrl || !branchName) {
      return res
        .status(400)
        .json({ error: "repoUrl and branchName are required" });
    }

    const { getSandboxValidatorService } = await import(
      "../services/sandbox-validator"
    );
    const sandboxService = getSandboxValidatorService();

    // Create a simple test patch
    const patches = testPatch
      ? [testPatch]
      : [
          {
            file: "test.js",
            originalContent: "console.log('hello');",
            patchedContent: "console.log('hello world');",
            description: "Update console log message",
            type: "fix" as const,
          },
        ];

    const results = await sandboxService.validatePatches(
      repoUrl,
      branchName,
      patches
    );

    res.json({
      success: true,
      message: "Sandbox validation completed",
      results: results.map((r) => ({
        patchId: r.patchId,
        success: r.success,
        recommendation: r.summary.recommendation,
        reasoning: r.summary.reasoning,
        testsPassed: r.testResults.passed,
        testsFailed: r.testResults.failed,
        buildSuccess: r.buildResults.success,
        lintIssues: r.lintResults.issues.length,
      })),
    });
  } catch (error) {
    console.error("Sandbox test failed:", error);
    res.status(500).json({
      error: "Sandbox test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

