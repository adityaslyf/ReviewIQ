// Tree-sitter imports commented out due to build issues - using simple parsing
// import Parser from 'tree-sitter';
// import JavaScript from 'tree-sitter-javascript';
// import TypeScript from 'tree-sitter-typescript';
// import Python from 'tree-sitter-python';
import * as path from 'path';

export interface SymbolDefinition {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property';
  file: string;
  startLine: number;
  endLine: number;
  signature?: string;
  docstring?: string;
  visibility?: 'public' | 'private' | 'protected';
  parameters?: string[];
  returnType?: string;
}

export interface SymbolUsage {
  file: string;
  line: number;
  column: number;
  context: string;
  usageType: 'call' | 'import' | 'reference' | 'assignment';
}

export interface SymbolRelationship {
  symbol: string;
  relatedSymbol: string;
  relationship: 'calls' | 'imports' | 'extends' | 'implements' | 'uses';
  file: string;
  line: number;
}

export interface CodeGraphNode {
  symbol: SymbolDefinition;
  usages: SymbolUsage[];
  relationships: SymbolRelationship[];
  impactScore: number; // How many other symbols depend on this
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CodeGraph {
  nodes: Map<string, CodeGraphNode>;
  changedSymbols: string[];
  affectedSymbols: string[];
  dependencyGraph: Map<string, string[]>;
}

export interface CodeGraphAnalysisResult {
  graph: CodeGraph;
  summary: {
    totalSymbols: number;
    changedSymbols: number;
    affectedSymbols: number;
    highImpactChanges: number;
    analysisTime: number;
  };
  insights: {
    riskAssessment: string;
    dependencyIssues: string[];
    architecturalConcerns: string[];
    refactoringOpportunities: string[];
  };
}

export class CodeGraphService {
  // private parser: Parser;
  // private languageParsers: Map<string, any>;

  constructor() {
    // this.parser = new Parser();
    // this.languageParsers = new Map([
    //   ['typescript', TypeScript.typescript],
    //   ['tsx', TypeScript.tsx],
    //   ['javascript', JavaScript],
    //   ['jsx', JavaScript],
    //   ['python', Python]
    // ]);
  }

  async analyzeCodeGraph(
    files: Array<{ filename: string; content: string }>,
    diff: string,
    changedFiles: string[]
  ): Promise<CodeGraphAnalysisResult> {
    const startTime = Date.now();
    console.log('🔗 Building code graph...');

    // Step 1: Parse all files and extract symbols
    const allSymbols = new Map<string, SymbolDefinition>();
    const symbolUsages = new Map<string, SymbolUsage[]>();
    const symbolRelationships: SymbolRelationship[] = [];

    for (const file of files) {
      try {
        const language = this.detectLanguage(file.filename);
        if (!language) continue;

        const symbols = await this.extractSymbols(file, language);
        const usages = await this.extractUsages(file, language);
        const relationships = await this.extractRelationships(file, language);

        // Store symbols
        for (const symbol of symbols) {
          const key = `${symbol.file}:${symbol.name}`;
          allSymbols.set(key, symbol);
        }

        // Store usages
        for (const usage of usages) {
          const symbolKey = this.findSymbolKey(usage, allSymbols);
          if (symbolKey) {
            if (!symbolUsages.has(symbolKey)) {
              symbolUsages.set(symbolKey, []);
            }
            symbolUsages.get(symbolKey)!.push(usage);
          }
        }

        // Store relationships
        symbolRelationships.push(...relationships);
      } catch (error) {
        console.warn(`Failed to analyze ${file.filename}:`, error);
      }
    }

    // Step 2: Identify changed symbols from diff
    const changedSymbols = this.identifyChangedSymbols(diff, allSymbols, changedFiles);
    console.log(`📊 Found ${changedSymbols.length} changed symbols`);

    // Step 3: Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(symbolRelationships);

    // Step 4: Find affected symbols
    const affectedSymbols = this.findAffectedSymbols(changedSymbols, dependencyGraph);
    console.log(`🎯 Found ${affectedSymbols.length} affected symbols`);

    // Step 5: Build graph nodes with impact analysis
    const graphNodes = this.buildGraphNodes(
      allSymbols,
      symbolUsages,
      symbolRelationships,
      dependencyGraph
    );

    // Step 6: Generate insights
    const insights = this.generateInsights(
      graphNodes,
      changedSymbols,
      affectedSymbols,
      symbolRelationships
    );

    const analysisTime = Date.now() - startTime;
    console.log(`✅ Code graph analysis completed in ${analysisTime}ms`);

    return {
      graph: {
        nodes: graphNodes,
        changedSymbols,
        affectedSymbols,
        dependencyGraph
      },
      summary: {
        totalSymbols: allSymbols.size,
        changedSymbols: changedSymbols.length,
        affectedSymbols: affectedSymbols.length,
        highImpactChanges: changedSymbols.filter(symbol => 
          graphNodes.get(symbol)?.impactScore > 5
        ).length,
        analysisTime
      },
      insights
    };
  }

  private detectLanguage(filename: string): string | null {
    const ext = path.extname(filename).toLowerCase();
    const extMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.py': 'python'
    };
    return extMap[ext] || null;
  }

  private async extractSymbols(
    file: { filename: string; content: string },
    language: string
  ): Promise<SymbolDefinition[]> {
    // Use simple regex-based symbol extraction for now
    return this.extractSymbolsSimple(file, language);
  }

  private extractSymbolsSimple(
    file: { filename: string; content: string },
    language: string
  ): SymbolDefinition[] {
    const symbols: SymbolDefinition[] = [];
    const lines = file.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Function declarations
      const functionMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*[=\(]/);
      if (functionMatch) {
        symbols.push({
          name: functionMatch[1],
          type: 'function',
          file: file.filename,
          startLine: lineNumber,
          endLine: lineNumber, // Simple approximation
          signature: line.trim(),
          visibility: 'public'
        });
      }
      
      // Class declarations
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          file: file.filename,
          startLine: lineNumber,
          endLine: lineNumber,
          signature: line.trim(),
          visibility: 'public'
        });
      }
      
      // Interface declarations (TypeScript)
      const interfaceMatch = line.match(/interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          type: 'interface',
          file: file.filename,
          startLine: lineNumber,
          endLine: lineNumber,
          signature: line.trim(),
          visibility: 'public'
        });
      }
      
      // Method declarations
      const methodMatch = line.match(/\s+(\w+)\s*\([^)]*\)\s*[{:]/);
      if (methodMatch && !functionMatch && !classMatch) {
        symbols.push({
          name: methodMatch[1],
          type: 'method',
          file: file.filename,
          startLine: lineNumber,
          endLine: lineNumber,
          signature: line.trim(),
          visibility: line.includes('private') ? 'private' : 
                     line.includes('protected') ? 'protected' : 'public'
        });
      }
    }
    
    return symbols;
  }

  private traverseForSymbols(
    node: any,
    file: { filename: string; content: string },
    symbols: SymbolDefinition[]
  ): void {
    // Extract different types of symbols based on node type
    switch (node.type) {
      case 'function_declaration':
        symbols.push(this.extractFunctionSymbol(node, file));
        break;
      case 'class_declaration':
        symbols.push(this.extractClassSymbol(node, file));
        break;
      case 'interface_declaration':
        symbols.push(this.extractInterfaceSymbol(node, file));
        break;
      case 'method_definition':
        symbols.push(this.extractMethodSymbol(node, file));
        break;
      case 'variable_declaration':
        const varSymbols = this.extractVariableSymbols(node, file);
        symbols.push(...varSymbols);
        break;
      case 'arrow_function':
        const arrowSymbol = this.extractArrowFunctionSymbol(node, file);
        if (arrowSymbol) symbols.push(arrowSymbol);
        break;
    }

    // Recursively traverse children
    for (let i = 0; i < node.childCount; i++) {
      this.traverseForSymbols(node.child(i), file, symbols);
    }
  }

  private extractFunctionSymbol(node: any, file: { filename: string; content: string }): SymbolDefinition {
    const nameNode = node.childForFieldName('name');
    const paramsNode = node.childForFieldName('parameters');
    
    return {
      name: nameNode?.text || 'anonymous',
      type: 'function',
      file: file.filename,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: node.text.split('\n')[0],
      parameters: this.extractParameters(paramsNode),
      visibility: 'public' // Default for functions
    };
  }

  private extractClassSymbol(node: any, file: { filename: string; content: string }): SymbolDefinition {
    const nameNode = node.childForFieldName('name');
    
    return {
      name: nameNode?.text || 'anonymous',
      type: 'class',
      file: file.filename,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `class ${nameNode?.text || 'anonymous'}`,
      visibility: 'public'
    };
  }

  private extractInterfaceSymbol(node: any, file: { filename: string; content: string }): SymbolDefinition {
    const nameNode = node.childForFieldName('name');
    
    return {
      name: nameNode?.text || 'anonymous',
      type: 'interface',
      file: file.filename,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `interface ${nameNode?.text || 'anonymous'}`,
      visibility: 'public'
    };
  }

  private extractMethodSymbol(node: any, file: { filename: string; content: string }): SymbolDefinition {
    const nameNode = node.childForFieldName('key');
    const paramsNode = node.childForFieldName('value')?.childForFieldName('parameters');
    
    return {
      name: nameNode?.text || 'anonymous',
      type: 'method',
      file: file.filename,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      signature: `${nameNode?.text || 'anonymous'}(${this.extractParameters(paramsNode)?.join(', ') || ''})`,
      parameters: this.extractParameters(paramsNode),
      visibility: this.extractVisibility(node)
    };
  }

  private extractVariableSymbols(node: any, file: { filename: string; content: string }): SymbolDefinition[] {
    const symbols: SymbolDefinition[] = [];
    
    // Handle variable declarations
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'variable_declarator') {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          symbols.push({
            name: nameNode.text,
            type: 'variable',
            file: file.filename,
            startLine: child.startPosition.row + 1,
            endLine: child.endPosition.row + 1,
            signature: child.text,
            visibility: 'public'
          });
        }
      }
    }
    
    return symbols;
  }

  private extractArrowFunctionSymbol(node: any, file: { filename: string; content: string }): SymbolDefinition | null {
    // Try to find if this arrow function is assigned to a variable
    let parent = node.parent;
    while (parent) {
      if (parent.type === 'variable_declarator') {
        const nameNode = parent.childForFieldName('name');
        if (nameNode) {
          return {
            name: nameNode.text,
            type: 'function',
            file: file.filename,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            signature: `${nameNode.text} = ${node.text.split('\n')[0]}`,
            visibility: 'public'
          };
        }
      }
      parent = parent.parent;
    }
    
    return null;
  }

  private extractParameters(paramsNode: any): string[] | undefined {
    if (!paramsNode) return undefined;
    
    const params: string[] = [];
    for (let i = 0; i < paramsNode.childCount; i++) {
      const param = paramsNode.child(i);
      if (param.type === 'identifier' || param.type === 'required_parameter') {
        params.push(param.text);
      }
    }
    
    return params.length > 0 ? params : undefined;
  }

  private extractVisibility(node: any): 'public' | 'private' | 'protected' {
    // Look for visibility modifiers in TypeScript
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child.type === 'accessibility_modifier') {
        return child.text as 'public' | 'private' | 'protected';
      }
    }
    return 'public';
  }

  private async extractUsages(
    file: { filename: string; content: string },
    language: string
  ): Promise<SymbolUsage[]> {
    const usages: SymbolUsage[] = [];
    const parser = this.languageParsers.get(language);
    
    if (!parser) return usages;

    this.parser.setLanguage(parser);
    const tree = this.parser.parse(file.content);
    
    this.traverseForUsages(tree.rootNode, file, usages);
    return usages;
  }

  private traverseForUsages(
    node: any,
    file: { filename: string; content: string },
    usages: SymbolUsage[]
  ): void {
    // Look for function calls, imports, and references
    switch (node.type) {
      case 'call_expression':
        const calleeNode = node.childForFieldName('function');
        if (calleeNode && calleeNode.type === 'identifier') {
          usages.push({
            file: file.filename,
            line: calleeNode.startPosition.row + 1,
            column: calleeNode.startPosition.column + 1,
            context: this.getLineContext(file.content, calleeNode.startPosition.row),
            usageType: 'call'
          });
        }
        break;
      case 'import_specifier':
        const importedNode = node.childForFieldName('name');
        if (importedNode) {
          usages.push({
            file: file.filename,
            line: importedNode.startPosition.row + 1,
            column: importedNode.startPosition.column + 1,
            context: this.getLineContext(file.content, importedNode.startPosition.row),
            usageType: 'import'
          });
        }
        break;
      case 'identifier':
        // Only count identifiers that are not definitions
        if (!this.isDefinition(node)) {
          usages.push({
            file: file.filename,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            context: this.getLineContext(file.content, node.startPosition.row),
            usageType: 'reference'
          });
        }
        break;
    }

    // Recursively traverse children
    for (let i = 0; i < node.childCount; i++) {
      this.traverseForUsages(node.child(i), file, usages);
    }
  }

  private async extractRelationships(
    file: { filename: string; content: string },
    language: string
  ): Promise<SymbolRelationship[]> {
    const relationships: SymbolRelationship[] = [];
    // This would be implemented to find imports, extends, implements, etc.
    // For now, returning empty array as a placeholder
    return relationships;
  }

  private identifyChangedSymbols(
    diff: string,
    allSymbols: Map<string, SymbolDefinition>,
    changedFiles: string[]
  ): string[] {
    const changedSymbols: string[] = [];
    const changedRanges = this.parseDiffForChangedRanges(diff);

    for (const [symbolKey, symbol] of allSymbols) {
      if (!changedFiles.includes(symbol.file)) continue;
      
      const ranges = changedRanges.get(symbol.file) || [];
      for (const range of ranges) {
        if (this.symbolOverlapsRange(symbol, range)) {
          changedSymbols.push(symbolKey);
          break;
        }
      }
    }

    return changedSymbols;
  }

  private buildDependencyGraph(relationships: SymbolRelationship[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const rel of relationships) {
      if (!graph.has(rel.symbol)) {
        graph.set(rel.symbol, []);
      }
      graph.get(rel.symbol)!.push(rel.relatedSymbol);
    }
    
    return graph;
  }

  private findAffectedSymbols(
    changedSymbols: string[],
    dependencyGraph: Map<string, string[]>
  ): string[] {
    const affected = new Set<string>();
    const visited = new Set<string>();
    
    const traverse = (symbol: string) => {
      if (visited.has(symbol)) return;
      visited.add(symbol);
      
      const dependencies = dependencyGraph.get(symbol) || [];
      for (const dep of dependencies) {
        affected.add(dep);
        traverse(dep);
      }
    };
    
    for (const changedSymbol of changedSymbols) {
      traverse(changedSymbol);
    }
    
    return Array.from(affected);
  }

  private buildGraphNodes(
    allSymbols: Map<string, SymbolDefinition>,
    symbolUsages: Map<string, SymbolUsage[]>,
    symbolRelationships: SymbolRelationship[],
    dependencyGraph: Map<string, string[]>
  ): Map<string, CodeGraphNode> {
    const nodes = new Map<string, CodeGraphNode>();
    
    for (const [symbolKey, symbol] of allSymbols) {
      const usages = symbolUsages.get(symbolKey) || [];
      const relationships = symbolRelationships.filter(rel => 
        rel.symbol === symbolKey || rel.relatedSymbol === symbolKey
      );
      const impactScore = this.calculateImpactScore(symbolKey, dependencyGraph, usages);
      
      nodes.set(symbolKey, {
        symbol,
        usages,
        relationships,
        impactScore,
        complexity: this.assessComplexity(symbol, usages, relationships)
      });
    }
    
    return nodes;
  }

  private calculateImpactScore(
    symbol: string,
    dependencyGraph: Map<string, string[]>,
    usages: SymbolUsage[]
  ): number {
    const directDependents = Array.from(dependencyGraph.values())
      .filter(deps => deps.includes(symbol)).length;
    return directDependents + usages.length;
  }

  private assessComplexity(
    symbol: SymbolDefinition,
    usages: SymbolUsage[],
    relationships: SymbolRelationship[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const lines = symbol.endLine - symbol.startLine;
    const usageCount = usages.length;
    const relationshipCount = relationships.length;
    
    const complexityScore = lines * 0.1 + usageCount * 0.5 + relationshipCount * 2;
    
    if (complexityScore > 20) return 'HIGH';
    if (complexityScore > 10) return 'MEDIUM';
    return 'LOW';
  }

  private generateInsights(
    graphNodes: Map<string, CodeGraphNode>,
    changedSymbols: string[],
    affectedSymbols: string[],
    relationships: SymbolRelationship[]
  ): CodeGraphAnalysisResult['insights'] {
    const highImpactChanges = changedSymbols.filter(symbol => 
      graphNodes.get(symbol)?.impactScore > 5
    );
    
    const riskAssessment = highImpactChanges.length > 0 
      ? `HIGH RISK: ${highImpactChanges.length} high-impact symbols modified`
      : affectedSymbols.length > 10 
        ? `MEDIUM RISK: ${affectedSymbols.length} symbols affected`
        : 'LOW RISK: Limited impact scope';

    return {
      riskAssessment,
      dependencyIssues: this.findDependencyIssues(relationships),
      architecturalConcerns: this.findArchitecturalConcerns(graphNodes, changedSymbols),
      refactoringOpportunities: this.findRefactoringOpportunities(graphNodes)
    };
  }

  // Helper methods
  private getLineContext(content: string, lineIndex: number): string {
    const lines = content.split('\n');
    return lines[lineIndex] || '';
  }

  private isDefinition(node: any): boolean {
    // Check if this identifier is part of a definition
    let parent = node.parent;
    while (parent) {
      if (['function_declaration', 'variable_declarator', 'class_declaration'].includes(parent.type)) {
        return parent.childForFieldName('name') === node;
      }
      parent = parent.parent;
    }
    return false;
  }

  private parseDiffForChangedRanges(diff: string): Map<string, Array<{ start: number; end: number }>> {
    const ranges = new Map<string, Array<{ start: number; end: number }>>();
    const lines = diff.split('\n');
    
    let currentFile = '';
    
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        currentFile = match ? match[2] : '';
      } else if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?(\d*) @@/);
        if (match && currentFile) {
          const start = parseInt(match[2]);
          const length = parseInt(match[3]) || 1;
          
          if (!ranges.has(currentFile)) {
            ranges.set(currentFile, []);
          }
          
          ranges.get(currentFile)!.push({
            start,
            end: start + length - 1
          });
        }
      }
    }
    
    return ranges;
  }

  private symbolOverlapsRange(
    symbol: SymbolDefinition,
    range: { start: number; end: number }
  ): boolean {
    return symbol.startLine <= range.end && symbol.endLine >= range.start;
  }

  private findSymbolKey(usage: SymbolUsage, allSymbols: Map<string, SymbolDefinition>): string | null {
    // Simple heuristic to match usage to symbol
    for (const [key, symbol] of allSymbols) {
      if (symbol.file === usage.file && 
          Math.abs(symbol.startLine - usage.line) < 100) { // Rough proximity check
        return key;
      }
    }
    return null;
  }

  private findDependencyIssues(relationships: SymbolRelationship[]): string[] {
    // Analyze for circular dependencies, missing imports, etc.
    return ['Dependency analysis not yet implemented'];
  }

  private findArchitecturalConcerns(
    graphNodes: Map<string, CodeGraphNode>,
    changedSymbols: string[]
  ): string[] {
    const concerns: string[] = [];
    
    // Check for changes to high-impact symbols
    for (const symbolKey of changedSymbols) {
      const node = graphNodes.get(symbolKey);
      if (node && node.impactScore > 10) {
        concerns.push(`High-impact symbol modified: ${node.symbol.name} (impact score: ${node.impactScore})`);
      }
    }
    
    return concerns;
  }

  private findRefactoringOpportunities(graphNodes: Map<string, CodeGraphNode>): string[] {
    const opportunities: string[] = [];
    
    // Look for highly complex symbols
    for (const [key, node] of graphNodes) {
      if (node.complexity === 'HIGH' && node.impactScore > 5) {
        opportunities.push(`Consider refactoring ${node.symbol.name}: high complexity with high impact`);
      }
    }
    
    return opportunities;
  }
}

// Helper function to get code graph service
let codeGraphService: CodeGraphService | null = null;

export function getCodeGraphService(): CodeGraphService {
  if (!codeGraphService) {
    codeGraphService = new CodeGraphService();
  }
  return codeGraphService;
}
