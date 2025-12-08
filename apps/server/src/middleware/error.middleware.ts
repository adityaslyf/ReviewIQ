import type { Request, Response, NextFunction } from "express";

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export function errorMiddleware(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error for debugging
  console.error("Error:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Handle AppError with custom status code
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS policy violation",
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON in request body",
    });
  }

  // Default error response
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV !== "production" && {
      message: err.message,
      stack: err.stack,
    }),
  });
}

/**
 * Not found middleware for unmatched routes
 */
export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
}

