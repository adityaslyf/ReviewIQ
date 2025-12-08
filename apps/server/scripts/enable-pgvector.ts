import "dotenv/config";
import { Pool } from "pg";

async function enablePgvector() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    console.log("🔄 Enabling pgvector extension...");
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("✅ pgvector extension enabled successfully!");
    
    // Verify it works
    const result = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    if (result.rows.length > 0) {
      console.log("✅ Verified: pgvector extension is active");
    }
  } catch (error: any) {
    console.error("❌ Failed to enable pgvector:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

enablePgvector();

