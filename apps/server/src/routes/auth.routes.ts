import { Router } from "express";
import type { Router as RouterType } from "express";
import { requireAuth } from "../middleware";
import {
  getUser,
  githubOAuth,
  githubOAuthOptions,
} from "../controllers";

const router: RouterType = Router();

/**
 * Get current authenticated user
 * GET /auth/user
 */
router.get("/user", requireAuth, getUser);

/**
 * Handle OPTIONS preflight for GitHub OAuth
 * OPTIONS /auth/github
 */
router.options("/github", githubOAuthOptions);

/**
 * GitHub OAuth callback
 * POST /auth/github
 */
router.post("/github", githubOAuth);

export default router;

