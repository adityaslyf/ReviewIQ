import type { Request, Response, NextFunction } from "express";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        githubId: string;
        username: string | null;
        name: string | null;
        email: string | null;
        avatarUrl: string | null;
        accessToken: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
      };
    }
  }
}

/**
 * Get user from access token
 */
export async function getUserFromToken(token: string) {
  const { db, schema } = await import("../db");
  const { eq } = await import("drizzle-orm");

  const user = await db.query.users.findFirst({
    where: eq(schema.users.accessToken, token),
  });

  return user;
}

/**
 * Verify user has access to a repository
 */
export async function verifyUserRepoAccess(
  userToken: string,
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error verifying user repo access:", error);
    return false;
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Optional auth middleware - sets user if token is valid, continues otherwise
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const user = await getUserFromToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without user on error
    next();
  }
}

