import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/reviewiq",
});

export const db = drizzle(pool, { schema });

// Export schema for use in other parts of the application
export { schema };
