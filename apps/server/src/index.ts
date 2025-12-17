import "dotenv/config";
import express from "express";
import type { Express } from "express";
import { corsMiddleware, errorMiddleware, notFoundMiddleware } from "./middleware";
import routes from "./routes/index";

const app: Express = express();

// Raw body parser for webhook signature verification (must be before json parser)
app.use("/webhook", express.raw({ type: "application/json" }));

// JSON body parser for all other routes
app.use(express.json());

// CORS middleware
app.use(corsMiddleware);

// API routes
app.use(routes);

// 404 handler for unmatched routes
app.use(notFoundMiddleware);

// Global error handler
app.use(errorMiddleware);

// Start server
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
