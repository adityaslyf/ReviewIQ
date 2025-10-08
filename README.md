# ReviewIQ

<div align="center">

**AI-Powered Code Review Platform for GitHub Pull Requests**

</div>

---

<div align="center">

![ReviewIQ Analysis Example](apps/web/src/assets/Result.png)

*AI-powered code analysis providing actionable suggestions with severity levels, categories, and detailed explanations*

</div>

---

<div align="center">

[Features](#features) • [How It Works](#how-it-works) • [Getting Started](#getting-started) • [Configuration](#configuration) • [API Documentation](#api-documentation)

</div>

---

## 📖 Overview

ReviewIQ is an intelligent code review platform that leverages **advanced AI technology** to provide comprehensive, automated pull request analysis for GitHub repositories. It acts as a virtual senior engineer, offering deep insights into code quality, security vulnerabilities, performance issues, and architectural concerns.

### What ReviewIQ Does

ReviewIQ automatically analyzes your pull requests and provides:

- **🔍 Deep Code Analysis** - Examines entire files, not just diffs, understanding full context
- **🛡️ Security & Performance Checks** - Identifies vulnerabilities, N+1 queries, memory leaks, and bottlenecks  
- **💡 Actionable Suggestions** - Provides specific code improvements with before/after examples
- **🏗️ Architecture Reviews** - Checks for SOLID principles, design patterns, and best practices
- **📊 Multi-Pass Analysis** - Performs thorough coverage with multiple analysis passes
- **⚡ Real-Time Feedback** - Automatic analysis via GitHub webhooks on PR creation/updates

### Key Capabilities

- 🤖 **AI-Powered Analysis**: Uses state-of-the-art language models for deep code understanding
- 🔍 **Static Code Analysis**: Integrates ESLint and TypeScript compiler for comprehensive linting
- 🎯 **Smart Suggestions**: Provides actionable code improvements with detailed explanations
- 🔐 **Security Scanning**: Detects SQL injection, XSS, authentication issues, and more
- 📊 **Context-Aware Reviews**: Analyzes full file context, dependencies, and project structure
- 🔄 **GitHub Integration**: Seamless webhook integration for automatic PR reviews
- 🎨 **Modern UI**: Beautiful, responsive dashboard built with React and TailwindCSS

---

## 🎯 How It Works

### Analysis Process

1. **Pull Request Detection** - GitHub webhook triggers when a PR is created or updated
2. **Context Gathering** - Fetches full file contents, dependencies, and project structure
3. **AI Analysis** - Advanced language model analyzes code for issues and improvements
4. **Static Analysis** - ESLint and TypeScript compiler validate code quality
5. **Suggestion Generation** - Creates actionable recommendations with code examples
6. **Results Display** - Beautiful dashboard shows all findings organized by severity

Each suggestion includes:
- 📍 **File and line location** - Exact location of the issue
- 🎯 **Severity level** - HIGH, MEDIUM, or LOW priority
- 🏷️ **Category** - Security, Performance, Logic, Architecture, or Style
- 📝 **Detailed explanation** - Why it matters and how to fix it
- 💻 **Code examples** - Before and after code snippets

---

## ✨ Features

### AI Analysis Capabilities

- **Multi-Pass Code Review**: Performs multiple analysis passes for thorough coverage
- **Deep Context Understanding**: Analyzes entire files, not just diffs
- **Cross-File Analysis**: Identifies consistency issues and dependency conflicts
- **Security Scanning**: Detects SQL injection, XSS, authentication issues, and more
- **Performance Analysis**: Identifies N+1 queries, memory leaks, and inefficient algorithms
- **Architecture Review**: Checks for SOLID principles, design patterns, and best practices

### Platform Features

- **GitHub OAuth Integration**: Secure authentication with GitHub
- **Real-Time Webhooks**: Automatic PR analysis on creation and updates
- **Vector Embeddings**: Advanced code similarity and pattern detection
- **Sandbox Validation**: Test patches in isolated environments
- **Pull Request Dashboard**: Browse, filter, and manage reviewed PRs
- **Detailed Analytics**: Comprehensive reports with actionable insights

---

## 🏗️ Architecture

ReviewIQ follows a modern monorepo architecture with clear separation of concerns:

```
ReviewIQ/
├── apps/
│   ├── web/              # Frontend (React + TanStack Router)
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── routes/        # File-based routing
│   │   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   │   └── lib/           # Utilities and API client
│   │   └── dist/              # Production build
│   │
│   └── server/           # Backend (Express + TypeScript)
│       ├── src/
│       │   ├── services/      # Core business logic
│       │   │   ├── gemini.ts           # AI analysis engine
│       │   │   ├── enhanced-gemini.ts  # Multi-model analysis
│       │   │   ├── github.ts           # GitHub API integration
│       │   │   ├── static-analysis.ts  # Linting & code analysis
│       │   │   ├── webhook.ts          # GitHub webhook handler
│       │   │   └── vector-embedding.ts # Code similarity
│       │   ├── db/            # Database schema & migrations
│       │   └── types/         # TypeScript type definitions
│       └── dist/              # Production build
│
├── package.json          # Workspace configuration
└── pnpm-workspace.yaml   # pnpm monorepo setup
```

### Technology Stack

#### Frontend
- **React 18** - Modern UI library with hooks and concurrent features
- **TanStack Router** - Type-safe file-based routing
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible, customizable component library
- **Vite** - Fast build tool and dev server

#### Backend
- **Express 5** - Fast, minimalist web framework
- **TypeScript** - Static type checking and enhanced DX
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Robust relational database
- **Advanced AI Models** - State-of-the-art language models for code analysis

#### DevOps & Tools
- **pnpm** - Fast, disk-efficient package manager
- **Octokit** - Official GitHub API client
- **ESLint** - Pluggable linting for code quality
- **tsx** - TypeScript execution engine

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **PostgreSQL** (v14 or higher)
- **GitHub Account** with OAuth App and GitHub App configured

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/ReviewIQ.git
cd ReviewIQ
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Create `.env` file in `apps/server/`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/reviewiq"

# GitHub OAuth App
GITHUB_OAUTH_CLIENT_ID="your_oauth_client_id"
GITHUB_OAUTH_CLIENT_SECRET="your_oauth_client_secret"

# GitHub App (for API access)
GITHUB_APP_ID="your_app_id"
GITHUB_PRIVATE_KEY="your_private_key"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"

# AI Services
GEMINI_API_KEY="your_ai_api_key"

# CORS Configuration
CORS_ORIGIN="http://localhost:3001"

# Server Configuration
PORT=3000
NODE_ENV=development
```

Create `.env` file in `apps/web/`:

```env
# Backend API URL
VITE_SERVER_URL="http://localhost:3000"
```

4. **Set up the database**

```bash
# Push schema to database
pnpm db:push

# (Optional) Open database studio to view data
pnpm db:studio
```

5. **Start the development servers**

```bash
# Start both frontend and backend
pnpm dev

# Or start individually:
pnpm dev:web      # Frontend only (http://localhost:3001)
pnpm dev:server   # Backend only (http://localhost:3000)
```

### Accessing the Application

- **Web Application**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

---

## ⚙️ Configuration

### GitHub Setup

#### 1. Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set **Homepage URL**: `http://localhost:3001` (or your domain)
4. Set **Authorization callback URL**: `http://localhost:3001/auth/callback`
5. Copy **Client ID** and **Client Secret** to `.env`

#### 2. Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Configure:
   - **Webhook URL**: `https://your-domain.com/webhook`
   - **Webhook Secret**: Generate a secure secret
   - **Permissions**: 
     - Pull requests: Read & Write
     - Contents: Read
     - Metadata: Read
4. Subscribe to events: `pull_request`
5. Install the app on your repositories
6. Copy **App ID** and **Private Key** to `.env`

### AI API Setup

1. Obtain an API key for the AI service
2. Add to `.env` as `GEMINI_API_KEY`
3. Ensure you have sufficient API quota for analysis workloads

---

## 📡 API Documentation

### Core Endpoints

#### Authentication

```
POST /auth/github
Body: { code: string }
Response: { access_token: string }
```

#### Pull Requests

```
GET /pull-requests
Response: Array of pull requests with AI analysis

GET /pull-requests/:id/ai-suggestions
Response: Detailed AI suggestions for a specific PR

GET /github/pull-requests?owner=<owner>&repo=<repo>
Headers: Authorization: Bearer <token>
Response: Open PRs from GitHub for a specific repository
```

#### Analysis

```
POST /analyze-pr
Body: { owner, repo, prNumber, options }
Response: Comprehensive AI analysis results
```

#### Webhooks

```
POST /webhook
Headers: X-Hub-Signature-256, X-GitHub-Event
Body: GitHub webhook payload
```

#### Health & Status

```
GET /health
Response: { status: "healthy", timestamp: string }

GET /
Response: { status: "OK", message: "ReviewIQ API is running" }
```

---

## 🔧 Available Scripts

### Root Commands

```bash
pnpm dev              # Start all applications in development
pnpm build            # Build all applications for production
pnpm check-types      # Type check all applications
```

### Server Commands

```bash
pnpm dev:server       # Start backend in development mode
pnpm build:server     # Build backend for production
pnpm start:server     # Run production build
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio (database GUI)
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run pending migrations
```

### Web Commands

```bash
pnpm dev:web          # Start frontend in development mode
pnpm build:web        # Build frontend for production
```

---

## 🚢 Deployment

### Production Build

```bash
# Build both applications
pnpm build

# Or use the deployment script
./deploy.sh
```

### Environment Variables (Production)

Update your production environment with:

- `NODE_ENV=production`
- `DATABASE_URL` - Production PostgreSQL connection string
- `VITE_SERVER_URL` - Production backend URL
- `CORS_ORIGIN` - Production frontend URL
- All GitHub and AI service credentials

### Deployment Platforms

ReviewIQ can be deployed to:

- **Render.com** (recommended for monorepo)
- **Vercel** (frontend) + **Railway** (backend)
- **AWS** / **Google Cloud** / **Azure**
- **Docker** containers (docker-compose.yml included)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)
- Powered by advanced AI language models
- Icons by [Lucide](https://lucide.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

## 📞 Support

For issues, questions, or contributions:

- 🐛 [Report a Bug](https://github.com/yourusername/ReviewIQ/issues)
- 💡 [Request a Feature](https://github.com/yourusername/ReviewIQ/issues)
- 📧 [Contact Us](mailto:support@reviewiq.com)

---

<div align="center">

**Made with ❤️ by the ReviewIQ Team**

[Website](https://reviewiq.xyz) • [Documentation](https://docs.reviewiq.xyz) • [Twitter](https://twitter.com/reviewiq)

</div>
