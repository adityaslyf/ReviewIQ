ALTER TABLE "ai_suggestions" ADD COLUMN "multi_pass_analysis" text;--> statement-breakpoint
ALTER TABLE "ai_suggestions" ADD COLUMN "analysis_mode" text DEFAULT 'single-pass';