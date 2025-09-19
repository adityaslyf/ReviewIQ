import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Github, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { RepoSelector } from "./repo-selector";
import { useState } from "react";

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

export function RepositoriesPage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
  };

  const handleFetchPRs = (repo: Repository) => {
    console.log('Fetch PRs for:', repo.full_name);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Github className="h-8 w-8 text-blue-400" />
                  Repository Management
                </h1>
                <p className="mt-1 text-gray-300">
                  Connect and manage GitHub repositories for analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Repository Selector */}
          <div>
            <Card className="bg-black border border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Select Repository</CardTitle>
              </CardHeader>
              <CardContent>
                <RepoSelector
                  onRepoSelect={handleRepoSelect}
                  selectedRepo={selectedRepo}
                  onFetchPRs={handleFetchPRs}
                  isFetchingPRs={false}
                />
              </CardContent>
            </Card>
          </div>

          {/* Repository Details */}
          <div>
            <Card className="bg-black border border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Repository Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRepo ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-white">{selectedRepo.name}</h3>
                      <p className="text-gray-300">{selectedRepo.full_name}</p>
                    </div>
                    {selectedRepo.description && (
                      <p className="text-gray-300">{selectedRepo.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      {selectedRepo.language && (
                        <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-600">
                          {selectedRepo.language}
                        </span>
                      )}
                      <span>⭐ {selectedRepo.stargazers_count}</span>
                      <span>{selectedRepo.private ? 'Private' : 'Public'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">Select a repository to view details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
