import { Router } from "express";
import type { Router as RouterType } from "express";
import {
  getVectorStatus,
  resetVectorService,
  testSandbox,
  indexRepository,
  searchCodeContext,
  hybridSearchVectors,
} from "../controllers";

const router: RouterType = Router();

/**
 * Get vector service status
 * GET /vector/status
 */
router.get("/status", getVectorStatus);

/**
 * Reset vector service
 * POST /vector/reset
 */
router.post("/reset", resetVectorService);

/**
 * Index a repository - generate embeddings
 * POST /vector/index-repo
 */
router.post("/index-repo", indexRepository);

/**
 * Search for relevant code context
 * POST /vector/search
 */
router.post("/search", searchCodeContext);

/**
 * Hybrid search with keyword matching
 * GET /vector/repos/:owner/:repo/hybrid-search
 */
router.get("/repos/:owner/:repo/hybrid-search", hybridSearchVectors);

/**
 * Test sandbox validation
 * POST /vector/test-sandbox
 */
router.post("/test-sandbox", testSandbox);

export default router;

