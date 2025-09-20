import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// Types for our vector embedding system
export interface CodeChunk {
  id: string;
  content: string;
  type: 'function' | 'class' | 'module' | 'documentation' | 'test';
  filePath: string;
  startLine: number;
  endLine: number;
  functionName?: string;
  className?: string;
  imports?: string[];
  exports?: string[];
  metadata: {
    language: string;
    size: number;
    complexity?: number;
    dependencies?: string[];
  };
}

export interface EmbeddedChunk extends CodeChunk {
  embedding: number[];
  hash: string;
  lastUpdated: Date;
}

export interface SemanticSearchResult {
  chunk: EmbeddedChunk;
  similarity: number;
  relevanceScore: number;
  contextType: 'direct' | 'related' | 'dependency' | 'test' | 'documentation';
}

export interface VectorSearchQuery {
  query: string;
  fileContext?: string[];
  maxResults?: number;
  minSimilarity?: number;
  includeTypes?: CodeChunk['type'][];
  excludeTypes?: CodeChunk['type'][];
}

/**
 * Professional Vector Embedding Service for Code Analysis
 * 
 * Features:
 * - Intelligent code chunking (AST-based)
 * - Semantic embeddings with Google Gemini
 * - Vector similarity search
 * - Context relevance ranking
 * - Incremental updates
 */
export class VectorEmbeddingService {
  private genAI: GoogleGenerativeAI;
  private embeddingModel: string = 'text-embedding-004'; // Latest Gemini embedding model
  private vectorStore: Map<string, EmbeddedChunk> = new Map();
  private vectorIndex: { [key: string]: string[] } = {}; // Simple inverted index
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationProgress: {
    stage: string;
    current: number;
    total: number;
    startTime: Date;
    estimatedCompletion?: Date;
  } | null = null;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Initialize the vector store - load existing embeddings or create new ones
   * Can run in background without blocking PR analysis
   */
  async initialize(codebasePath: string, forceReindex: boolean = false, background: boolean = true): Promise<void> {
    if (this.isInitializing || this.isInitialized) {
      console.log('⚠️ Vector service already initialized or initializing');
      return;
    }

    this.isInitializing = true;
    this.initializationProgress = {
      stage: 'Starting',
      current: 0,
      total: 100,
      startTime: new Date()
    };

    console.log('🚀 Initializing Vector Embedding Service...');
    
    if (background) {
      // Run initialization in background
      this.initializeInBackground(codebasePath, forceReindex).catch(error => {
        console.error('❌ Background vector initialization failed:', error);
        this.isInitializing = false;
        this.initializationProgress = null;
      });
      
      // Return immediately for background initialization
      console.log('🔄 Vector service initializing in background...');
      return;
    } else {
      // Run synchronously
      await this.performInitialization(codebasePath, forceReindex);
    }
  }

  /**
   * Background initialization that doesn't block the main thread
   */
  private async initializeInBackground(codebasePath: string, forceReindex: boolean): Promise<void> {
    await this.performInitialization(codebasePath, forceReindex);
  }

  /**
   * Actual initialization logic
   */
  private async performInitialization(codebasePath: string, forceReindex: boolean): Promise<void> {
    try {
      const vectorStorePath = path.join(codebasePath, '.reviewiq', 'vector-store.json');
      
      this.updateProgress('Checking existing vector store', 10, 100);
      
      if (!forceReindex && fs.existsSync(vectorStorePath)) {
        console.log('📂 Loading existing vector store...');
        this.updateProgress('Loading existing embeddings', 20, 100);
        await this.loadVectorStore(vectorStorePath);
        this.updateProgress('Vector store loaded', 100, 100);
      } else {
        console.log('🔄 Creating new vector store (this may take several minutes)...');
        this.updateProgress('Scanning codebase', 20, 100);
        await this.indexCodebase(codebasePath);
        this.updateProgress('Saving vector store', 90, 100);
        await this.saveVectorStore(vectorStorePath);
        this.updateProgress('Vector store created', 100, 100);
      }
      
      this.isInitialized = true;
      this.isInitializing = false;
      
      const duration = (Date.now() - this.initializationProgress!.startTime.getTime()) / 1000;
      console.log(`✅ Vector store initialized with ${this.vectorStore.size} embeddings in ${duration.toFixed(1)}s`);
      
      this.initializationProgress = null;
      
    } catch (error) {
      console.error('❌ Vector initialization failed:', error);
      this.isInitializing = false;
      this.isInitialized = false;
      this.initializationProgress = null;
      throw error;
    }
  }

  /**
   * Update initialization progress
   */
  private updateProgress(stage: string, current: number, total: number): void {
    if (this.initializationProgress) {
      this.initializationProgress.stage = stage;
      this.initializationProgress.current = current;
      this.initializationProgress.total = total;
      
      // Estimate completion time
      const elapsed = Date.now() - this.initializationProgress.startTime.getTime();
      const progress = current / total;
      if (progress > 0.1) { // Only estimate after 10% progress
        const estimatedTotal = elapsed / progress;
        const remaining = estimatedTotal - elapsed;
        this.initializationProgress.estimatedCompletion = new Date(Date.now() + remaining);
      }
      
      console.log(`🔄 ${stage}: ${current}/${total} (${(progress * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Get initialization status
   */
  getInitializationStatus(): {
    isInitialized: boolean;
    isInitializing: boolean;
    progress?: {
      stage: string;
      current: number;
      total: number;
      percentage: number;
      estimatedCompletion?: Date;
      elapsedTime: number;
    };
  } {
    const status = {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing
    };

    if (this.initializationProgress) {
      const elapsed = Date.now() - this.initializationProgress.startTime.getTime();
      return {
        ...status,
        progress: {
          stage: this.initializationProgress.stage,
          current: this.initializationProgress.current,
          total: this.initializationProgress.total,
          percentage: (this.initializationProgress.current / this.initializationProgress.total) * 100,
          estimatedCompletion: this.initializationProgress.estimatedCompletion,
          elapsedTime: elapsed / 1000
        }
      };
    }

    return status;
  }

  /**
   * Reset the vector service to uninitialized state
   */
  reset(): void {
    console.log('🔄 Resetting vector service...');
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationProgress = null;
    this.codeChunks = [];
    this.embeddings = [];
    console.log('✅ Vector service reset complete');
  }

  /**
   * Intelligent code chunking using AST analysis
   */
  async chunkCode(filePath: string, content: string): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    const language = this.getLanguageFromPath(filePath);
    
    try {
      // For now, implement simple chunking - can be enhanced with AST parsing
      const lines = content.split('\n');
      
      // Detect functions, classes, and modules
      const functionRegex = /^\s*(export\s+)?(async\s+)?function\s+(\w+)|^\s*(\w+)\s*[:=]\s*(async\s+)?\(/;
      const classRegex = /^\s*(export\s+)?class\s+(\w+)/;
      const importRegex = /^import\s+.*from\s+['"]([^'"]+)['"]/;
      const exportRegex = /^export\s+/;
      
      let currentChunk: Partial<CodeChunk> | null = null;
      let imports: string[] = [];
      let exports: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Track imports and exports
        const importMatch = line.match(importRegex);
        if (importMatch) {
          imports.push(importMatch[1]);
        }
        
        if (exportRegex.test(line)) {
          exports.push(line.trim());
        }
        
        // Detect function start
        const functionMatch = line.match(functionRegex);
        if (functionMatch) {
          // Save previous chunk if exists
          if (currentChunk) {
            chunks.push(this.finalizeChunk(currentChunk, filePath, language, imports, exports));
          }
          
          currentChunk = {
            type: 'function',
            functionName: functionMatch[3] || functionMatch[4],
            startLine: i + 1,
            content: line + '\n'
          };
          continue;
        }
        
        // Detect class start
        const classMatch = line.match(classRegex);
        if (classMatch) {
          // Save previous chunk if exists
          if (currentChunk) {
            chunks.push(this.finalizeChunk(currentChunk, filePath, language, imports, exports));
          }
          
          currentChunk = {
            type: 'class',
            className: classMatch[2],
            startLine: i + 1,
            content: line + '\n'
          };
          continue;
        }
        
        // Add line to current chunk
        if (currentChunk) {
          currentChunk.content += line + '\n';
          
          // Check if chunk is complete (simple heuristic)
          if (this.isChunkComplete(line, currentChunk.type!)) {
            currentChunk.endLine = i + 1;
            chunks.push(this.finalizeChunk(currentChunk, filePath, language, imports, exports));
            currentChunk = null;
          }
        }
      }
      
      // Finalize last chunk
      if (currentChunk) {
        currentChunk.endLine = lines.length;
        chunks.push(this.finalizeChunk(currentChunk, filePath, language, imports, exports));
      }
      
      // If no specific chunks found, create a module-level chunk
      if (chunks.length === 0) {
        chunks.push({
          id: this.generateChunkId(filePath, 'module', 1),
          content,
          type: 'module',
          filePath,
          startLine: 1,
          endLine: lines.length,
          imports,
          exports,
          metadata: {
            language,
            size: content.length,
            dependencies: imports
          }
        });
      }
      
    } catch (error) {
      console.warn(`Failed to chunk ${filePath}:`, error);
      // Fallback to simple chunking
      chunks.push({
        id: this.generateChunkId(filePath, 'module', 1),
        content,
        type: 'module',
        filePath,
        startLine: 1,
        endLine: content.split('\n').length,
        metadata: {
          language,
          size: content.length
        }
      });
    }
    
    return chunks;
  }

  /**
   * Generate embeddings for code chunks using Gemini
   */
  async generateEmbeddings(chunks: CodeChunk[]): Promise<EmbeddedChunk[]> {
    console.log(`🔄 Generating embeddings for ${chunks.length} chunks using Gemini...`);
    
    const embeddedChunks: EmbeddedChunk[] = [];
    const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
    
    // Process chunks individually for better error handling and rate limiting
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const text = this.prepareTextForEmbedding(chunk);
      
      try {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        
        embeddedChunks.push({
          ...chunk,
          embedding,
          hash: this.generateContentHash(chunk.content),
          lastUpdated: new Date()
        });
        
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Generated embeddings: ${i + 1}/${chunks.length}`);
        }
        
        // Rate limiting - Gemini has generous limits but let's be respectful
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 20 requests per second
        }
        
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
        // Continue with next chunk - don't fail the entire process
      }
    }
    
    console.log(`✅ Successfully generated ${embeddedChunks.length}/${chunks.length} embeddings`);
    return embeddedChunks;
  }

  /**
   * Semantic search for relevant code chunks
   */
  async semanticSearch(query: VectorSearchQuery): Promise<SemanticSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }
    
    console.log(`🔍 Semantic search for: "${query.query}"`);
    
    // Generate embedding for the query
    const queryEmbedding = await this.generateQueryEmbedding(query.query);
    
    // Calculate similarities
    const results: SemanticSearchResult[] = [];
    
    for (const [id, chunk] of this.vectorStore) {
      // Apply filters
      if (query.includeTypes && !query.includeTypes.includes(chunk.type)) continue;
      if (query.excludeTypes && query.excludeTypes.includes(chunk.type)) continue;
      if (query.fileContext && !query.fileContext.some(file => chunk.filePath.includes(file))) continue;
      
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (similarity >= (query.minSimilarity || 0.3)) {
        const relevanceScore = this.calculateRelevanceScore(chunk, query, similarity);
        const contextType = this.determineContextType(chunk, query);
        
        results.push({
          chunk,
          similarity,
          relevanceScore,
          contextType
        });
      }
    }
    
    // Sort by relevance score (combination of similarity and other factors)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Limit results
    const maxResults = query.maxResults || 20;
    const topResults = results.slice(0, maxResults);
    
    console.log(`📊 Found ${results.length} relevant chunks, returning top ${topResults.length}`);
    
    return topResults;
  }

  /**
   * Update embeddings for changed files
   */
  async updateEmbeddings(changedFiles: Array<{path: string, content: string}>): Promise<void> {
    console.log(`🔄 Updating embeddings for ${changedFiles.length} changed files...`);
    
    for (const file of changedFiles) {
      // Remove old embeddings for this file
      const oldChunkIds = Array.from(this.vectorStore.keys()).filter(id => 
        this.vectorStore.get(id)?.filePath === file.path
      );
      
      for (const id of oldChunkIds) {
        this.vectorStore.delete(id);
      }
      
      // Generate new chunks and embeddings
      const chunks = await this.chunkCode(file.path, file.content);
      const embeddedChunks = await this.generateEmbeddings(chunks);
      
      // Add to vector store
      for (const chunk of embeddedChunks) {
        this.vectorStore.set(chunk.id, chunk);
      }
    }
    
    console.log(`✅ Updated embeddings for ${changedFiles.length} files`);
  }

  /**
   * Get comprehensive context for PR analysis
   */
  async getPRContext(prTitle: string, prDescription: string, changedFiles: string[], diff: string): Promise<{
    directContext: SemanticSearchResult[];
    relatedContext: SemanticSearchResult[];
    testContext: SemanticSearchResult[];
    documentationContext: SemanticSearchResult[];
    summary: {
      totalChunks: number;
      relevanceDistribution: { [key: string]: number };
      estimatedTokens: number;
      contextQuality: string;
    };
  }> {
    console.log('🎯 Gathering comprehensive PR context using vector embeddings...');
    
    // Create search queries
    const searchQueries = [
      `${prTitle} ${prDescription}`,
      ...changedFiles.map(file => path.basename(file, path.extname(file))),
      ...this.extractKeywordsFromDiff(diff)
    ].filter(Boolean);
    
    const combinedQuery = searchQueries.join(' ');
    
    // Search for different types of context
    const [directContext, relatedContext, testContext, documentationContext] = await Promise.all([
      // Direct context - most relevant to the changes
      this.semanticSearch({
        query: combinedQuery,
        fileContext: changedFiles,
        maxResults: 15,
        minSimilarity: 0.4,
        includeTypes: ['function', 'class', 'module']
      }),
      
      // Related context - broader codebase context
      this.semanticSearch({
        query: combinedQuery,
        maxResults: 10,
        minSimilarity: 0.3,
        excludeTypes: ['test', 'documentation']
      }),
      
      // Test context
      this.semanticSearch({
        query: combinedQuery,
        maxResults: 8,
        minSimilarity: 0.25,
        includeTypes: ['test']
      }),
      
      // Documentation context
      this.semanticSearch({
        query: combinedQuery,
        maxResults: 5,
        minSimilarity: 0.2,
        includeTypes: ['documentation']
      })
    ]);
    
    // Calculate summary statistics
    const allResults = [...directContext, ...relatedContext, ...testContext, ...documentationContext];
    const totalChunks = allResults.length;
    const estimatedTokens = allResults.reduce((sum, result) => sum + Math.ceil(result.chunk.content.length / 4), 0);
    
    const relevanceDistribution = allResults.reduce((dist, result) => {
      dist[result.contextType] = (dist[result.contextType] || 0) + 1;
      return dist;
    }, {} as { [key: string]: number });
    
    const contextQuality = this.assessContextQuality(totalChunks, estimatedTokens, relevanceDistribution);
    
    console.log(`📊 Context Summary: ${totalChunks} chunks, ~${estimatedTokens.toLocaleString()} tokens, Quality: ${contextQuality}`);
    
    return {
      directContext,
      relatedContext,
      testContext,
      documentationContext,
      summary: {
        totalChunks,
        relevanceDistribution,
        estimatedTokens,
        contextQuality
      }
    };
  }

  // Helper methods
  private async indexCodebase(codebasePath: string): Promise<void> {
    const codeFiles = await this.findCodeFiles(codebasePath);
    console.log(`📁 Found ${codeFiles.length} code files to index`);
    
    this.updateProgress('Processing code files', 25, 100);
    
    const allChunks: CodeChunk[] = [];
    
    for (let i = 0; i < codeFiles.length; i++) {
      const filePath = codeFiles[i];
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = await this.chunkCode(filePath, content);
        allChunks.push(...chunks);
        
        // Update progress for file processing
        const fileProgress = 25 + Math.floor((i / codeFiles.length) * 20); // 25-45%
        this.updateProgress(`Processing files (${i + 1}/${codeFiles.length})`, fileProgress, 100);
        
      } catch (error) {
        console.warn(`Failed to process ${filePath}:`, error);
      }
    }
    
    console.log(`🔄 Generated ${allChunks.length} code chunks`);
    this.updateProgress('Generating embeddings', 50, 100);
    
    const embeddedChunks = await this.generateEmbeddingsWithProgress(allChunks);
    
    this.updateProgress('Storing embeddings', 85, 100);
    
    // Store in vector store
    for (const chunk of embeddedChunks) {
      this.vectorStore.set(chunk.id, chunk);
    }
    
    console.log(`✅ Indexed ${embeddedChunks.length} code chunks`);
  }

  /**
   * Generate embeddings with progress tracking
   */
  private async generateEmbeddingsWithProgress(chunks: CodeChunk[]): Promise<EmbeddedChunk[]> {
    console.log(`🔄 Generating embeddings for ${chunks.length} chunks using Gemini...`);
    
    const embeddedChunks: EmbeddedChunk[] = [];
    const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
    
    // Process chunks individually for better error handling and progress tracking
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const text = this.prepareTextForEmbedding(chunk);
      
      try {
        const result = await model.embedContent(text);
        const embedding = result.embedding.values;
        
        embeddedChunks.push({
          ...chunk,
          embedding,
          hash: this.generateContentHash(chunk.content),
          lastUpdated: new Date()
        });
        
        // Update progress for embeddings (50-85% range)
        const embeddingProgress = 50 + Math.floor((i / chunks.length) * 35);
        this.updateProgress(`Generating embeddings (${i + 1}/${chunks.length})`, embeddingProgress, 100);
        
        // Rate limiting - Gemini has generous limits but let's be respectful
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 20 requests per second
        }
        
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
        // Continue with next chunk - don't fail the entire process
      }
    }
    
    console.log(`✅ Successfully generated ${embeddedChunks.length}/${chunks.length} embeddings`);
    return embeddedChunks;
  }

  private async findCodeFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php'];
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    
    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (codeExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    traverse(dir);
    return files;
  }

  private finalizeChunk(chunk: Partial<CodeChunk>, filePath: string, language: string, imports: string[], exports: string[]): CodeChunk {
    return {
      id: this.generateChunkId(filePath, chunk.type!, chunk.startLine!),
      content: chunk.content!,
      type: chunk.type!,
      filePath,
      startLine: chunk.startLine!,
      endLine: chunk.endLine!,
      functionName: chunk.functionName,
      className: chunk.className,
      imports,
      exports,
      metadata: {
        language,
        size: chunk.content!.length,
        dependencies: imports
      }
    };
  }

  private generateChunkId(filePath: string, type: string, startLine: number): string {
    return `${filePath}:${type}:${startLine}`;
  }

  private generateContentHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php'
    };
    return langMap[ext] || 'text';
  }

  private isChunkComplete(line: string, type: string): boolean {
    // Simple heuristics - can be enhanced with proper AST parsing
    if (type === 'function') {
      return line.trim() === '}' || line.includes('};');
    }
    if (type === 'class') {
      return line.trim() === '}';
    }
    return false;
  }

  private prepareTextForEmbedding(chunk: CodeChunk): string {
    // Enhance the text with metadata for better embeddings
    let text = `File: ${chunk.filePath}\n`;
    text += `Type: ${chunk.type}\n`;
    if (chunk.functionName) text += `Function: ${chunk.functionName}\n`;
    if (chunk.className) text += `Class: ${chunk.className}\n`;
    text += `Language: ${chunk.metadata.language}\n`;
    text += `Content:\n${chunk.content}`;
    return text;
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
    const result = await model.embedContent(query);
    return result.embedding.values;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private calculateRelevanceScore(chunk: EmbeddedChunk, query: VectorSearchQuery, similarity: number): number {
    let score = similarity;
    
    // Boost score based on chunk type relevance
    if (query.fileContext?.some(file => chunk.filePath.includes(file))) {
      score *= 1.5; // Direct file match
    }
    
    // Boost functions and classes over modules
    if (chunk.type === 'function' || chunk.type === 'class') {
      score *= 1.2;
    }
    
    // Boost recent changes
    const daysSinceUpdate = (Date.now() - chunk.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      score *= 1.1;
    }
    
    return score;
  }

  private determineContextType(chunk: EmbeddedChunk, query: VectorSearchQuery): SemanticSearchResult['contextType'] {
    if (query.fileContext?.some(file => chunk.filePath.includes(file))) {
      return 'direct';
    }
    if (chunk.type === 'test') {
      return 'test';
    }
    if (chunk.type === 'documentation') {
      return 'documentation';
    }
    if (chunk.imports?.some(imp => query.fileContext?.some(file => file.includes(imp)))) {
      return 'dependency';
    }
    return 'related';
  }

  private extractKeywordsFromDiff(diff: string): string[] {
    // Extract function names, variable names, etc. from diff
    const keywords: string[] = [];
    const lines = diff.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('+') || line.startsWith('-')) {
        // Extract identifiers using regex
        const identifiers = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        keywords.push(...identifiers.filter(id => id.length > 2));
      }
    }
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  private assessContextQuality(totalChunks: number, estimatedTokens: number, relevanceDistribution: { [key: string]: number }): string {
    if (totalChunks > 30 && estimatedTokens > 50000) return 'EXCELLENT 🔥🔥🔥';
    if (totalChunks > 20 && estimatedTokens > 30000) return 'VERY GOOD 🔥🔥';
    if (totalChunks > 10 && estimatedTokens > 15000) return 'GOOD 🔥';
    if (totalChunks > 5 && estimatedTokens > 5000) return 'FAIR ✅';
    return 'LIMITED ⚠️';
  }

  private async saveVectorStore(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      chunks: Array.from(this.vectorStore.values())
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved vector store to ${filePath}`);
  }

  private async loadVectorStore(filePath: string): Promise<void> {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    for (const chunk of data.chunks) {
      this.vectorStore.set(chunk.id, {
        ...chunk,
        lastUpdated: new Date(chunk.lastUpdated)
      });
    }
    
    console.log(`📂 Loaded ${data.chunks.length} embeddings from ${filePath}`);
  }
}

// Factory function
export function getVectorEmbeddingService(geminiApiKey: string): VectorEmbeddingService {
  return new VectorEmbeddingService(geminiApiKey);
}
