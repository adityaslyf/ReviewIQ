// Deployment configuration for ReviewIQ API
// This file helps configure the backend for deployment at https://reviewiq.xyz/api

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    // Base path for API when deployed under /api route
    basePath: process.env.API_BASE_PATH || '',
  },

  // CORS configuration for production
  cors: {
    origin: [
      'https://reviewiq.xyz',
      'https://www.reviewiq.xyz',
      'http://localhost:3001', // Keep for development
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  },

  // Environment-specific settings
  environment: {
    production: {
      // Production-specific settings
      logLevel: 'info',
      enableDebugLogs: false,
    },
    development: {
      // Development-specific settings
      logLevel: 'debug',
      enableDebugLogs: true,
    },
  },

  // API path configuration
  apiPaths: {
    // Health checks
    health: '/api/health',
    status: '/api',
    
    // Authentication
    githubAuth: '/api/auth/github',
    
    // Pull requests
    pullRequests: '/api/pull-requests',
    pullRequestsWithAI: '/api/pull-requests-with-ai',
    githubPullRequests: '/api/github/pull-requests',
    
    // Analysis
    analyzePR: '/api/analyze-pr',
    reanalyzePR: '/api/reanalyze-pr/:prId',
    
    // Webhooks
    webhook: '/webhook',
    
    // Testing
    testSandbox: '/api/test-sandbox',
    vectorStatus: '/api/vector-status',
    vectorReset: '/api/vector-reset',
  },
};

module.exports = config;
