# Contributing to Antigravity Dashboard

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/antigravity-dashboard.git
   cd antigravity-dashboard
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Google OAuth credentials (see README for setup)

### Running in Development Mode

```bash
# Terminal 1: Backend with watch mode
cd apps/backend
npm run dev

# Terminal 2: Frontend with hot reload
cd apps/web
npm run dev

# Terminal 3: Start the backend server
npm start
```

The frontend dev server runs on port 5173 and proxies API requests to port 3456.

## Code Style

- TypeScript strict mode is enabled
- Use functional React components with hooks
- Follow existing patterns in the codebase
- Keep files focused and modular

## Submitting Changes

1. Ensure your code builds without errors:
   ```bash
   npm run build
   ```

2. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add new feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation only
   - `chore:` - Maintenance tasks
   - `refactor:` - Code refactoring

3. Push to your fork and create a Pull Request

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Ensure all checks pass
- Keep PRs focused on a single concern

## Reporting Issues

- Use the GitHub issue templates
- Include steps to reproduce for bugs
- Provide environment details (OS, Node.js version, browser)

## Questions?

Open an issue with the "question" label or start a discussion.
