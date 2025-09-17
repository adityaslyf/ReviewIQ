CREATE TABLE "pull_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"summary" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "users";--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);