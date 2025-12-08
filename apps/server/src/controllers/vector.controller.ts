import type { Request, Response } from "express";
import { getGitHubService } from "../services";

/**
 * Get vector service status
 * GET /vector-status
 */
export function getVectorStatus(req: Request, res: Response) {
  try {
    const githubService = getGitHubService();
    const status = githubService.getVectorServiceStatus();
    res.json({
      status: "OK",
      vectorService: status,
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

