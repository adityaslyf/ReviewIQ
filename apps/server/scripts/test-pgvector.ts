import "dotenv/config";
import { db, schema } from "../src/db";
import { sql } from "drizzle-orm";

async function testPgvector() {
  console.log("🧪 Testing pgvector integration...\n");

  try {
    // Test 1: Check pgvector extension
    console.log("1️⃣ Checking pgvector extension...");
    const extResult = await db.execute(
      sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`
    );
    console.log("   ✅ pgvector extension:", extResult.rows[0]);

    // Test 2: Check code_embeddings table
    console.log("\n2️⃣ Checking code_embeddings table...");
    const tableResult = await db.execute(
      sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'code_embeddings' ORDER BY ordinal_position`
    );
    console.log("   ✅ Table columns:");
    for (const row of tableResult.rows as any[]) {
      console.log(`      - ${row.column_name}: ${row.data_type}`);
    }

    // Test 3: Insert a test embedding
    console.log("\n3️⃣ Testing vector insertion...");
    const testEmbedding = Array.from({ length: 768 }, () => Math.random());
    const testVectorStr = `[${testEmbedding.join(",")}]`;

    await db.execute(sql`
      INSERT INTO code_embeddings (
        file_path, chunk_type, start_line, end_line, content, embedding, content_hash
      ) VALUES (
        'test/file.ts', 'function', 1, 10, 'function test() { return "hello"; }',
        ${testVectorStr}::vector, 'test-hash-123'
      )
    `);
    console.log("   ✅ Test vector inserted successfully!");

    // Test 4: Test similarity search
    console.log("\n4️⃣ Testing similarity search...");
    const searchResult = await db.execute(sql`
      SELECT 
        file_path, 
        content,
        1 - (embedding <=> ${testVectorStr}::vector) as similarity
      FROM code_embeddings
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${testVectorStr}::vector
      LIMIT 5
    `);
    console.log("   ✅ Similarity search results:");
    for (const row of searchResult.rows as any[]) {
      console.log(
        `      - ${row.file_path}: similarity=${parseFloat(row.similarity).toFixed(4)}`
      );
    }

    // Test 5: Cleanup test data
    console.log("\n5️⃣ Cleaning up test data...");
    await db.execute(
      sql`DELETE FROM code_embeddings WHERE content_hash = 'test-hash-123'`
    );
    console.log("   ✅ Test data cleaned up!");

    console.log("\n🎉 All pgvector tests passed!");
    console.log("\n📊 Summary:");
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM code_embeddings`
    );
    console.log(`   Total embeddings in database: ${(countResult.rows[0] as any).count}`);
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

testPgvector();

