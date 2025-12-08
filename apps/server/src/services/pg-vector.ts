import { db, schema } from "../db";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { EmbeddedChunk, CodeChunk, SemanticSearchResult, VectorSearchQuery } from "./vector-embedding";

/**
 * PostgreSQL Vector Service using pgvector
 * Provides persistent vector storage with similarity search
 */
export class PgVectorService {
  private repoOwner?: string;
  private repoName?: string;

  constructor(repoOwner?: string, repoName?: string) {
    this.repoOwner = repoOwner;
    this.repoName = repoName;
  }

  /**
   * Enable pgvector extension (run once per database)
   */
  async enableExtension(): Promise<void> {
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
      console.log("✅ pgvector extension enabled");
    } catch (error) {
      console.error("Failed to enable pgvector extension:", error);
      throw error;
    }
  }

  /**
   * Store an embedded chunk in the database
   */
  async storeChunk(chunk: EmbeddedChunk): Promise<void> {
    try {
      // Check if chunk already exists (by file path, start line, and chunk type)
      const existing = await db
        .select({ id: schema.codeEmbeddings.id })
        .from(schema.codeEmbeddings)
        .where(
          and(
            eq(schema.codeEmbeddings.filePath, chunk.filePath),
            eq(schema.codeEmbeddings.startLine, chunk.startLine),
            eq(schema.codeEmbeddings.chunkType, chunk.type)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing chunk
        await db
          .update(schema.codeEmbeddings)
          .set({
            content: chunk.content,
            embedding: chunk.embedding,
            contentHash: chunk.hash,
            endLine: chunk.endLine,
            functionName: chunk.functionName,
            className: chunk.className,
            language: chunk.metadata.language,
            fileSize: chunk.metadata.size,
            imports: chunk.imports ? JSON.stringify(chunk.imports) : null,
            exports: chunk.exports ? JSON.stringify(chunk.exports) : null,
            repoOwner: this.repoOwner,
            repoName: this.repoName,
            updatedAt: new Date(),
          })
          .where(eq(schema.codeEmbeddings.id, existing[0].id));
      } else {
        // Insert new chunk
        await db.insert(schema.codeEmbeddings).values({
          filePath: chunk.filePath,
          chunkType: chunk.type,
          functionName: chunk.functionName,
          className: chunk.className,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          content: chunk.content,
          embedding: chunk.embedding,
          contentHash: chunk.hash,
          language: chunk.metadata.language,
          fileSize: chunk.metadata.size,
          imports: chunk.imports ? JSON.stringify(chunk.imports) : null,
          exports: chunk.exports ? JSON.stringify(chunk.exports) : null,
          repoOwner: this.repoOwner,
          repoName: this.repoName,
        });
      }
    } catch (error) {
      console.error(`Failed to store chunk ${chunk.id}:`, error);
      throw error;
    }
  }

  /**
   * Store multiple chunks in batch
   */
  async storeChunks(chunks: EmbeddedChunk[]): Promise<void> {
    console.log(`📦 Storing ${chunks.length} chunks in database...`);
    
    // Process in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await Promise.all(batch.map((chunk) => this.storeChunk(chunk)));
      console.log(`  Stored ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks`);
    }
    
    console.log(`✅ Stored ${chunks.length} chunks in database`);
  }

  /**
   * Semantic similarity search using pgvector cosine distance
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: {
      maxResults?: number;
      minSimilarity?: number;
      includeTypes?: string[];
      excludeTypes?: string[];
      fileContext?: string[];
    } = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      maxResults = 20,
      minSimilarity = 0.3,
      includeTypes,
      excludeTypes,
      fileContext,
    } = options;

    try {
      // Build the vector string for pgvector
      const vectorStr = `[${queryEmbedding.join(",")}]`;

      // Use raw SQL for vector similarity search
      // pgvector uses <=> for cosine distance (1 - similarity)
      const results = await db.execute(sql`
        SELECT 
          id,
          file_path,
          chunk_type,
          function_name,
          class_name,
          start_line,
          end_line,
          content,
          content_hash,
          language,
          file_size,
          imports,
          exports,
          1 - (embedding <=> ${vectorStr}::vector) as similarity
        FROM code_embeddings
        WHERE embedding IS NOT NULL
          ${this.repoOwner ? sql`AND repo_owner = ${this.repoOwner}` : sql``}
          ${this.repoName ? sql`AND repo_name = ${this.repoName}` : sql``}
          ${includeTypes?.length ? sql`AND chunk_type = ANY(${includeTypes})` : sql``}
          ${excludeTypes?.length ? sql`AND chunk_type != ALL(${excludeTypes})` : sql``}
          ${fileContext?.length ? sql`AND file_path = ANY(${fileContext})` : sql``}
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${maxResults}
      `);

      // Transform results to SemanticSearchResult format
      const searchResults: SemanticSearchResult[] = [];
      
      for (const row of results.rows as any[]) {
        const similarity = parseFloat(row.similarity);
        
        if (similarity < minSimilarity) continue;

        const chunk: EmbeddedChunk = {
          id: `${row.file_path}:${row.chunk_type}:${row.start_line}`,
          filePath: row.file_path,
          type: row.chunk_type as CodeChunk["type"],
          functionName: row.function_name,
          className: row.class_name,
          startLine: row.start_line,
          endLine: row.end_line,
          content: row.content,
          embedding: [], // Don't include embedding in results to save memory
          hash: row.content_hash,
          lastUpdated: new Date(),
          imports: row.imports ? JSON.parse(row.imports) : undefined,
          exports: row.exports ? JSON.parse(row.exports) : undefined,
          metadata: {
            language: row.language || "unknown",
            size: row.file_size || 0,
          },
        };

        searchResults.push({
          chunk,
          similarity,
          relevanceScore: this.calculateRelevanceScore(similarity, chunk),
          contextType: this.determineContextType(chunk),
        });
      }

      return searchResults;
    } catch (error) {
      console.error("Semantic search failed:", error);
      throw error;
    }
  }

  /**
   * Get all chunks for a specific file
   */
  async getChunksForFile(filePath: string): Promise<EmbeddedChunk[]> {
    const results = await db
      .select()
      .from(schema.codeEmbeddings)
      .where(eq(schema.codeEmbeddings.filePath, filePath));

    return results.map((row) => this.rowToEmbeddedChunk(row));
  }

  /**
   * Delete all chunks for a specific file (for re-indexing)
   */
  async deleteChunksForFile(filePath: string): Promise<void> {
    await db
      .delete(schema.codeEmbeddings)
      .where(eq(schema.codeEmbeddings.filePath, filePath));
  }

  /**
   * Delete all chunks for a repository
   */
  async deleteAllChunks(): Promise<void> {
    if (this.repoOwner && this.repoName) {
      await db
        .delete(schema.codeEmbeddings)
        .where(
          and(
            eq(schema.codeEmbeddings.repoOwner, this.repoOwner),
            eq(schema.codeEmbeddings.repoName, this.repoName)
          )
        );
    } else {
      // Delete all chunks (be careful with this!)
      await db.delete(schema.codeEmbeddings);
    }
  }

  /**
   * Get total count of embeddings
   */
  async getEmbeddingCount(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM code_embeddings 
      ${this.repoOwner ? sql`WHERE repo_owner = ${this.repoOwner}` : sql``}
      ${this.repoOwner && this.repoName ? sql`AND repo_name = ${this.repoName}` : sql``}
    `);
    return parseInt((result.rows[0] as any).count) || 0;
  }

  /**
   * Check if a file needs re-indexing based on content hash
   */
  async needsReindex(filePath: string, contentHash: string): Promise<boolean> {
    const existing = await db
      .select({ contentHash: schema.codeEmbeddings.contentHash })
      .from(schema.codeEmbeddings)
      .where(eq(schema.codeEmbeddings.filePath, filePath))
      .limit(1);

    if (existing.length === 0) return true;
    return existing[0].contentHash !== contentHash;
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<{
    totalChunks: number;
    chunksByType: Record<string, number>;
    chunksByLanguage: Record<string, number>;
    totalSize: number;
  }> {
    const [countResult, typeResult, langResult, sizeResult] = await Promise.all([
      this.getEmbeddingCount(),
      db.execute(sql`
        SELECT chunk_type, COUNT(*) as count 
        FROM code_embeddings 
        GROUP BY chunk_type
      `),
      db.execute(sql`
        SELECT language, COUNT(*) as count 
        FROM code_embeddings 
        GROUP BY language
      `),
      db.execute(sql`
        SELECT SUM(file_size) as total_size 
        FROM code_embeddings
      `),
    ]);

    const chunksByType: Record<string, number> = {};
    for (const row of typeResult.rows as any[]) {
      chunksByType[row.chunk_type] = parseInt(row.count);
    }

    const chunksByLanguage: Record<string, number> = {};
    for (const row of langResult.rows as any[]) {
      if (row.language) {
        chunksByLanguage[row.language] = parseInt(row.count);
      }
    }

    return {
      totalChunks: countResult,
      chunksByType,
      chunksByLanguage,
      totalSize: parseInt((sizeResult.rows[0] as any)?.total_size) || 0,
    };
  }

  // Helper methods

  private rowToEmbeddedChunk(row: any): EmbeddedChunk {
    return {
      id: `${row.filePath}:${row.chunkType}:${row.startLine}`,
      filePath: row.filePath,
      type: row.chunkType as CodeChunk["type"],
      functionName: row.functionName,
      className: row.className,
      startLine: row.startLine,
      endLine: row.endLine,
      content: row.content,
      embedding: row.embedding || [],
      hash: row.contentHash,
      lastUpdated: row.updatedAt || new Date(),
      imports: row.imports ? JSON.parse(row.imports) : undefined,
      exports: row.exports ? JSON.parse(row.exports) : undefined,
      metadata: {
        language: row.language || "unknown",
        size: row.fileSize || 0,
      },
    };
  }

  private calculateRelevanceScore(similarity: number, chunk: EmbeddedChunk): number {
    let score = similarity;

    // Boost functions and classes
    if (chunk.type === "function" || chunk.type === "class") {
      score *= 1.1;
    }

    // Slight penalty for documentation
    if (chunk.type === "documentation") {
      score *= 0.9;
    }

    // Boost if it has exports (likely important)
    if (chunk.exports && chunk.exports.length > 0) {
      score *= 1.05;
    }

    return Math.min(score, 1.0);
  }

  private determineContextType(
    chunk: EmbeddedChunk
  ): "direct" | "related" | "dependency" | "test" | "documentation" {
    if (chunk.type === "test") return "test";
    if (chunk.type === "documentation") return "documentation";
    if (chunk.filePath.includes("test") || chunk.filePath.includes("spec")) return "test";
    return "related";
  }
}

// Singleton instance
let pgVectorServiceInstance: PgVectorService | null = null;

export function getPgVectorService(repoOwner?: string, repoName?: string): PgVectorService {
  if (!pgVectorServiceInstance || (repoOwner && repoName)) {
    pgVectorServiceInstance = new PgVectorService(repoOwner, repoName);
  }
  return pgVectorServiceInstance;
}

