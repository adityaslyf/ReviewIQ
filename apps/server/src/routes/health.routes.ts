import { Router } from "express";
import type { Request, Response, Router as RouterType } from "express";

const router: RouterType = Router();

/**
 * Root endpoint
 * GET /
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "ReviewIQ API is running",
    version: "1.0.0",
  });
});

/**
 * Health check endpoint
 * GET /health
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;

