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
