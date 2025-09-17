// GitHub webhook payload types
export interface GitHubWebhookPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    user: {
      login: string;
    };
  };
  repository: {
    owner: {
      login: string;
    };
    name: string;
  };
  installation?: {
    id: number;
  };
}

export interface PullRequestData {
  pr: {
    number: number;
    title: string;
    user: {
      login: string;
    };
  };
  diff: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}
