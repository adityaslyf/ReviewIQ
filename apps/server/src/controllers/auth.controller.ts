import type { Request, Response } from "express";
import { eq } from "drizzle-orm";

/**
 * Get current authenticated user
 * GET /auth/user
 */
export async function getUser(req: Request, res: Response) {
  try {
    // User is already set by requireAuth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    res.json({
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user information" });
  }
}

/**
 * Handle GitHub OAuth callback
 * POST /auth/github
 */
export async function githubOAuth(req: Request, res: Response) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    // Check environment variables
    if (
      !process.env.GITHUB_OAUTH_CLIENT_ID ||
      !process.env.GITHUB_OAUTH_CLIENT_SECRET
    ) {
      console.error("Missing GitHub OAuth environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
          client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
          code: code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        "GitHub token exchange failed:",
        tokenResponse.status,
        errorText
      );
      throw new Error(
        `Failed to exchange code for token: ${tokenResponse.status}`
      );
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("OAuth error from GitHub:", tokenData);
      throw new Error(tokenData.error_description || "OAuth error");
    }

    if (!tokenData.access_token) {
      console.error("No access token received from GitHub");
      throw new Error("No access token received");
    }

    // Fetch user information from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user information from GitHub");
    }

    const userData = await userResponse.json();

    // Store or update user in database
    const { db, schema } = await import("../db");

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.githubId, userData.id.toString()),
    });

    let user;
    if (existingUser) {
      // Update existing user
      const updated = await db
        .update(schema.users)
        .set({
          username: userData.login,
          name: userData.name,
          email: userData.email,
          avatarUrl: userData.avatar_url,
          accessToken: tokenData.access_token,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.githubId, userData.id.toString()))
        .returning();
      user = updated[0];
    } else {
      // Create new user
      const inserted = await db
        .insert(schema.users)
        .values({
          githubId: userData.id.toString(),
          username: userData.login,
          name: userData.name,
          email: userData.email,
          avatarUrl: userData.avatar_url,
          accessToken: tokenData.access_token,
        })
        .returning();
      user = inserted[0];
    }

    res.json({
      access_token: tokenData.access_token,
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: unknown) {
    console.error("GitHub OAuth error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Authentication failed",
      details: errorMessage,
    });
  }
}

/**
 * Handle OPTIONS preflight for GitHub OAuth endpoint
 */
export function githubOAuthOptions(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
}

