import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Simple test table to get started
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// You can add more tables here as your project grows
// export const posts = pgTable("posts", { ... });
// export const comments = pgTable("comments", { ... });
