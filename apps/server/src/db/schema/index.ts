import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

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
