CREATE TABLE "code_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"chunk_type" varchar(50) NOT NULL,
	"function_name" varchar(200),
	"class_name" varchar(200),
	"start_line" integer NOT NULL,
	"end_line" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"content_hash" varchar(64) NOT NULL,
	"language" varchar(50),
	"file_size" integer,
	"imports" text,
	"exports" text,
	"repo_owner" varchar(200),
	"repo_name" varchar(200),
	"branch" varchar(200) DEFAULT 'main',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "code_embeddings_file_path_idx" ON "code_embeddings" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "code_embeddings_repo_idx" ON "code_embeddings" USING btree ("repo_owner","repo_name");--> statement-breakpoint
CREATE INDEX "code_embeddings_content_hash_idx" ON "code_embeddings" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "code_embeddings_chunk_type_idx" ON "code_embeddings" USING btree ("chunk_type");