import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  Database, 
  Github, 
  RefreshCw, 
  Filter, 
  Brain, 
  Zap,
  Menu,
  BarChart3
} from 'lucide-react';
import { RepoSelector } from './repo-selector';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

interface SidebarProps {
  // Source management
  source: 'stored' | 'github';
  onSourceChange: (source: 'stored' | 'github') => void;
  
  // Repository management
  selectedRepo: Repository | null;
  onRepoSelect: (repo: Repository) => void;
  onFetchPRs: (repo: Repository) => void;
  isFetchingPRs: boolean;
  
  // Filter management
  prFilter: 'all' | 'open' | 'closed';
  onFilterChange: (filter: 'all' | 'open' | 'closed') => void;
  
  // Actions
  selectedPRs: Set<number>;
  analyzingPRs: Set<number>;
  onAnalyzeSelected: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  
  // Stats
  storedCount: number;
  githubCount: number;
}

export function Sidebar({
  source,
  onSourceChange,
  selectedRepo,
  onRepoSelect,
  onFetchPRs,
  isFetchingPRs,
  prFilter,
  onFilterChange,
  selectedPRs,
  analyzingPRs,
  onAnalyzeSelected,
  onClearSelection,
  onRefresh,
  storedCount,
  githubCount
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'} flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-gray-900">Controls</h2>
              <p className="text-xs text-gray-600">Manage your PR analysis</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-200"
          >
            <Settings className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Source Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Data Source
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={source === 'stored' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSourceChange('stored')}
                className={`flex items-center gap-2 justify-start ${source === 'stored' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Database className="h-3 w-3" />
                Stored
              </Button>
              <Button
                variant={source === 'github' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSourceChange('github')}
                className={`flex items-center gap-2 justify-start ${source === 'github' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Github className="h-3 w-3" />
                GitHub
              </Button>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs bg-gray-50 p-2 rounded">
              <span className="text-gray-700 font-medium">Stored: {storedCount}</span>
              <span className="text-gray-700 font-medium">GitHub: {githubCount}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="p-1 h-6 w-6 hover:bg-gray-200"
              >
                <RefreshCw className="h-3 w-3 text-gray-600" />
              </Button>
            </div>
          </div>

          {/* Repository Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Github className="h-4 w-4 text-green-600" />
              Repository
            </h3>
            <Card className="border-gray-200 bg-white">
              <CardContent className="p-3">
                <RepoSelector
                  onRepoSelect={(repo) => {
                    onRepoSelect(repo);
                    onSourceChange('github');
                  }}
                  selectedRepo={selectedRepo}
                  onFetchPRs={onFetchPRs}
                  isFetchingPRs={isFetchingPRs}
                  compact
                />
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-600" />
              Filters
            </h3>
            <div className="grid grid-cols-3 gap-1">
              {(['all', 'open', 'closed'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={prFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange(filter)}
                  className={`text-xs ${prFilter === filter ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Actions
            </h3>
            <div className="space-y-2">
              <Button
                onClick={onAnalyzeSelected}
                disabled={selectedPRs.size === 0 || analyzingPRs.size > 0 || source !== 'github'}
                className="w-full text-sm bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
                size="sm"
              >
                <Zap className="h-3 w-3 mr-2" />
                Analyze Selected ({selectedPRs.size})
              </Button>
              <Button
                variant="outline"
                onClick={onClearSelection}
                disabled={selectedPRs.size === 0}
                className="w-full text-sm border-gray-300 text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
            {analyzingPRs.size > 0 && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  <span className="text-xs text-purple-800 font-medium">
                    Analyzing {analyzingPRs.size} PR{analyzingPRs.size > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
