import { Router } from "express";
import type { Router as RouterType } from "express";
import { getGitHubPullRequests } from "../controllers";

const router: RouterType = Router();

/**
 * Get pull requests from GitHub
 * GET /github/pull-requests
 */
router.get("/pull-requests", getGitHubPullRequests);

export default router;

