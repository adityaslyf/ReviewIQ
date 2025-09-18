import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Search, Github, Lock, Globe, GitPullRequest } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/auth-context';

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

interface RepoSelectorProps {
  onRepoSelect: (repo: Repository) => void;
  selectedRepo: Repository | null;
  onFetchPRs: (repo: Repository) => void;
  isFetchingPRs?: boolean;
  compact?: boolean;
}

export function RepoSelector({ onRepoSelect, selectedRepo, onFetchPRs, isFetchingPRs = false, compact = false }: RepoSelectorProps) {
  const { isAuthenticated, user } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrivate, setFilterPrivate] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserRepos();
    }
  }, [isAuthenticated, user]);

  const fetchUserRepos = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        console.warn('No GitHub token found when trying to fetch repositories');
        toast.error('Please sign in to view your repositories');
        setIsLoading(false);
        return;
      }

      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const reposData = await response.json();
      setRepos(reposData);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      toast.error(`Failed to fetch repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterPrivate === 'all' || 
                         (filterPrivate === 'public' && !repo.private) ||
                         (filterPrivate === 'private' && repo.private);
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className={compact ? "py-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Github className="h-4 w-4" />
          {compact ? 'Repository' : 'Select Repository to Analyze'}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : undefined}>
        <div className={compact ? "space-y-3" : "space-y-4"}>
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search repos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-white text-gray-900 placeholder-gray-500 ${compact ? 'pl-8 pr-2 py-1.5 text-sm' : 'pl-10 pr-3 py-2'} border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <select
              value={filterPrivate}
              onChange={(e) => setFilterPrivate(e.target.value as 'all' | 'public' | 'private')}
              className={`bg-white text-gray-900 ${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Repository List */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="ml-3 text-gray-700">Loading repositories...</p>
            </div>
          ) : (
            <div className={`space-y-2 ${compact ? 'max-h-72' : 'max-h-96'} overflow-y-auto`}>
              {filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No repositories match your search' : 'No repositories found'}
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => onRepoSelect(repo)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRepo?.id === repo.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
                          <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : ''}`}>{repo.name}</h3>
                          {repo.private ? (
                            <Lock className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <Globe className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                        <p className={`text-sm text-gray-600 ${compact ? 'mb-1' : 'mb-2'}`}>{repo.full_name}</p>
                        {!compact && repo.description && (
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {repo.language && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {repo.language}
                            </span>
                          )}
                          <span>⭐ {repo.stargazers_count}</span>
                          <span>{formatDate(repo.updated_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={repo.private ? "destructive" : "secondary"}>
                          {repo.private ? "Private" : "Public"}
                        </Badge>
                        {selectedRepo?.id === repo.id && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selected Repository Info */}
          {selectedRepo && (
            <div className={`mt-3 ${compact ? 'p-2' : 'p-3'} bg-blue-50 border border-blue-200 rounded-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <Github className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Repository</span>
              </div>
              <p className="text-sm text-blue-800">
                <strong>{selectedRepo.full_name}</strong>
                {!compact && selectedRepo.description && (
                  <span className="block mt-1 text-blue-700">{selectedRepo.description}</span>
                )}
              </p>
              <button
                onClick={() => onFetchPRs(selectedRepo)}
                disabled={isFetchingPRs}
                className={`mt-3 w-full ${compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isFetchingPRs ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Fetching PRs...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="h-4 w-4" />
                    Fetch Pull Requests
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
