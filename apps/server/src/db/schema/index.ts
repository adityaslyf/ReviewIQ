import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  githubId: text("github_id").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pullRequests = pgTable("pull_requests", {
  id: serial("id").primaryKey(),
  repo: text("repo").notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
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
