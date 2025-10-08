ALTER TABLE "pull_requests" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "owner" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "status" text DEFAULT 'open';--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;