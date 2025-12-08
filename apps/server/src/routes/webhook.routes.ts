import { Router } from "express";
import type { Router as RouterType } from "express";
import { handleWebhook } from "../controllers";

const router: RouterType = Router();

/**
 * Handle GitHub webhook events
 * POST /webhook
 */
router.post("/", handleWebhook);

export default router;

