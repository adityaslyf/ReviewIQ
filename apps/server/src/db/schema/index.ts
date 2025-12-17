import { pgTable, serial, text, timestamp, integer, varchar, index, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Custom type for pgvector - 768 dimensions for Gemini text-embedding-004
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    // Parse the vector string from PostgreSQL
    return value
      .slice(1, -1)
      .split(",")
      .map((v) => parseFloat(v));
  },
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  username: text("username"),
  name: text("name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"), // Store encrypted token for API access
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pullRequests = pgTable("pull_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Link to user who owns this PR
  repo: text("repo").notNull(),
  owner: text("owner"), // Repository owner (nullable for existing records)
  number: integer("number").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(), // PR author (GitHub username)
  summary: text("summary"),
  status: text("status").default("open"), // open, closed, merged
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  pullRequestId: integer("pull_request_id").notNull().references(() => pullRequests.id),
  summary: text("summary"),
  refactorSuggestions: text("refactor_suggestions"),
  potentialIssues: text("potential_issues"),
  detailedAnalysis: text("detailed_analysis"), // JSON string storing the detailed analysis
  staticAnalysisResults: text("static_analysis_results"), // JSON string storing static analysis results
  analysisMode: text("analysis_mode").default("single-pass"), // single-pass, multi-pass, static-enhanced
  analysisStatus: text("analysis_status").default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Store code chunks with vector embeddings for semantic search
export const codeEmbeddings = pgTable(
  "code_embeddings",
  {
    id: serial("id").primaryKey(),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    chunkType: varchar("chunk_type", { length: 50 }).notNull(),
    functionName: varchar("function_name", { length: 200 }),
    className: varchar("class_name", { length: 200 }),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding"),  // 768-dimensional vector
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    language: varchar("language", { length: 50 }),
    fileSize: integer("file_size"),
    imports: text("imports"),
    exports: text("exports"),
    repoOwner: varchar("repo_owner", { length: 200 }),
    repoName: varchar("repo_name", { length: 200 }),
    branch: varchar("branch", { length: 200 }).default("main"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    filePathIdx: index("code_embeddings_file_path_idx").on(table.filePath),
    repoIdx: index("code_embeddings_repo_idx").on(table.repoOwner, table.repoName),
    contentHashIdx: index("code_embeddings_content_hash_idx").on(table.contentHash),
  })
);
