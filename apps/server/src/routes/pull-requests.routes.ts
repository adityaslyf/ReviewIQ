import { Router } from "express";
import type { Router as RouterType } from "express";
import { requireAuth } from "../middleware";
import {
  getPullRequests,
  getPullRequestsWithAI,
  getAISuggestions,
  analyzePR,
  reanalyzePR,
} from "../controllers";

const router: RouterType = Router();

/**
 * Get pull requests from database (user-specific)
 * GET /pull-requests
 */
router.get("/", requireAuth, getPullRequests);

/**
 * Get pull requests with AI suggestions
 * GET /pull-requests-with-ai
 */
router.get("/with-ai", requireAuth, getPullRequestsWithAI);

/**
 * Get AI suggestions for a specific PR
 * GET /pull-requests/:id/ai-suggestions
 */
router.get("/:id/ai-suggestions", getAISuggestions);

/**
 * Analyze a pull request
 * POST /analyze-pr
 */
router.post("/analyze", analyzePR);

/**
 * Reanalyze a pull request with enhanced analysis
 * POST /reanalyze-pr/:prId
 */
router.post("/reanalyze/:prId", reanalyzePR);

export default router;

