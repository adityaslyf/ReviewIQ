import type { Request, Response } from "express";
import { getGitHubService } from "../services";
import { verifyUserRepoAccess } from "../middleware";

/**
 * Get pull requests from GitHub
 * GET /github/pull-requests
 */
export async function getGitHubPullRequests(req: Request, res: Response) {
  try {
    const { owner, repo } = req.query;
    const userToken = req.headers.authorization?.replace("Bearer ", "");

    if (!owner || !repo) {
      return res
        .status(400)
        .json({ error: "Owner and repo parameters are required" });
    }

    if (!userToken) {
      return res.status(401).json({ error: "User token is required" });
    }

    // Verify user has access to this repository
    const hasAccess = await verifyUserRepoAccess(
      userToken,
      owner as string,
      repo as string
    );
    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Access denied to this repository" });
    }

    const githubService = getGitHubService();

    // Get installation ID for the repository
    const installationId = await githubService.getInstallationId(
      owner as string,
      repo as string
    );

    if (!installationId) {
      return res
        .status(404)
        .json({ error: "GitHub App not installed on this repository" });
    }

    // Use the GitHub service to fetch PRs with installation-scoped authentication
    const { Octokit } = await import("octokit");
    const { createAppAuth } = await import("@octokit/auth-app");
    const formattedPrivateKey = process.env.GITHUB_PRIVATE_KEY!.replace(
      /\\n/g,
      "\n"
    );

    // Create installation-scoped Octokit
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: formattedPrivateKey,
        installationId: installationId,
      },
    });

    // Fetch open pull requests
    const { data: prs } = await octokit.rest.pulls.list({
      owner: owner as string,
      repo: repo as string,
      state: "open",
      sort: "created",
      direction: "desc",
      per_page: 20,
    });

    // Transform the data to match our schema
    const transformedPRs = prs.map((pr) => ({
      id: pr.id,
      repo: `${owner}/${repo}`,
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || "unknown",
      summary: null,
      createdAt: pr.created_at,
      url: pr.html_url,
      state: pr.state,
      body: pr.body,
    }));

    res.json(transformedPRs);
  } catch (error: unknown) {
    console.error("Error fetching GitHub PRs:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to fetch GitHub pull requests",
      details: errorMessage,
    });
  }
}

