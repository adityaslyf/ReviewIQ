import { Router } from "express";
import type { Router as RouterType } from "express";
import {
  getVectorStatus,
  resetVectorService,
  testSandbox,
} from "../controllers";

const router: RouterType = Router();

/**
 * Get vector service status
 * GET /vector-status
 */
router.get("/status", getVectorStatus);

/**
 * Reset vector service
 * POST /vector-reset
 */
router.post("/reset", resetVectorService);

/**
 * Test sandbox validation
 * POST /test-sandbox
 */
router.post("/test-sandbox", testSandbox);

export default router;

