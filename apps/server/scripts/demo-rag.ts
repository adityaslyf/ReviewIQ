/**
 * RAG Demo Script
 * This script demonstrates the RAG (Retrieval-Augmented Generation) flow
 * 
 * Run: npx tsx scripts/demo-rag.ts
 */

import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function demoRAG() {
  console.log("\n🎯 RAG (Retrieval-Augmented Generation) Demo\n");
  console.log("=".repeat(50));

  // Step 1: Show database stats
  console.log("\n📊 STEP 1: Vector Database Status\n");
  
  const countResult = await pool.query("SELECT COUNT(*) as total FROM code_embeddings");
  console.log(`   Total embeddings stored: ${countResult.rows[0].total}`);
  
  const repoResult = await pool.query(`
    SELECT repo_owner, repo_name, COUNT(*) as chunks 
    FROM code_embeddings 
    GROUP BY repo_owner, repo_name
  `);
  
  console.log("\n   Repositories indexed:");
  repoResult.rows.forEach(r => {
    console.log(`   - ${r.repo_owner}/${r.repo_name}: ${r.chunks} code chunks`);
  });

  // Step 2: Show sample embeddings
  console.log("\n📄 STEP 2: Sample Code Chunks\n");
  
  const sampleResult = await pool.query(`
    SELECT file_path, chunk_type, function_name, 
           LENGTH(content) as content_length
    FROM code_embeddings 
    WHERE embedding IS NOT NULL
    LIMIT 5
  `);
  
  sampleResult.rows.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.file_path}`);
    console.log(`      Type: ${r.chunk_type}${r.function_name ? `, Function: ${r.function_name}` : ""}`);
    console.log(`      Content: ${r.content_length} chars, Embedding: 768 dimensions`);
  });

  // Step 3: Simulate semantic search
  console.log("\n🔍 STEP 3: Semantic Search Demo\n");
  console.log("   Query: 'authentication user login'");
  console.log("   → Convert to 768-dim embedding");
  console.log("   → Search using cosine similarity");
  console.log("   → Return top 15 most relevant chunks");
  
  // Step 4: Show the flow
  console.log("\n🔄 STEP 4: RAG Flow\n");
  console.log("   PR Diff + Title + Files");
  console.log("         ↓");
  console.log("   Generate Query Embedding");
  console.log("         ↓");
  console.log("   Semantic Search in pgvector");
  console.log("         ↓");
  console.log("   Retrieved Context (relevant code)");
  console.log("         ↓");
  console.log("   Context + Diff → LLM → Smart Suggestions");

  console.log("\n" + "=".repeat(50));
  console.log("✅ RAG provides context-aware code review!\n");

  await pool.end();
}

demoRAG().catch(console.error);

