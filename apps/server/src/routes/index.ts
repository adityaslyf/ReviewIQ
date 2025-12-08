import { Router } from "express";
import type { Router as RouterType } from "express";
import { requireAuth } from "../middleware";
import {
  getPullRequestsWithAI,
  analyzePR,
  reanalyzePR,
  getVectorStatus,
  resetVectorService,
  testSandbox,
} from "../controllers";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import pullRequestsRoutes from "./pull-requests.routes";
import githubRoutes from "./github.routes";
import webhookRoutes from "./webhook.routes";
import vectorRoutes from "./vector.routes";

const router: RouterType = Router();

// Health check routes (/, /health)
router.use("/", healthRoutes);

// Auth routes (/auth/*)
router.use("/auth", authRoutes);

// Pull requests routes (/pull-requests/*)
router.use("/pull-requests", pullRequestsRoutes);

// Legacy routes for backwards compatibility
router.get("/pull-requests-with-ai", requireAuth, getPullRequestsWithAI);
router.post("/analyze-pr", analyzePR);
router.post("/reanalyze-pr/:prId", reanalyzePR);

// GitHub routes (/github/*)
router.use("/github", githubRoutes);

// Webhook route (/webhook) - note: webhook has special body parsing
router.use("/webhook", webhookRoutes);

// Vector service routes (/vector/*)
router.use("/vector", vectorRoutes);

// Legacy vector routes for backwards compatibility
router.get("/vector-status", getVectorStatus);
router.post("/vector-reset", resetVectorService);
router.post("/test-sandbox", testSandbox);

export default router;
