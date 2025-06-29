# SiteProof v2

A professional construction site inspection and quality management system built with Next.js, Supabase, and TypeScript.

## Features

- **Multi-tenant Architecture**: Organization-based data isolation with Row Level Security
- **Comprehensive Inspection System**: ITP templates, offline-first inspections, NCR workflow
- **Smart Daily Diary**: Weather integration, workforce tracking, equipment management
- **Financial Tracking**: Role-based visibility for rates and costs
- **Asynchronous Reporting**: Background job processing for complex reports
- **Security First**: CSP headers, rate limiting, comprehensive authentication

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State Management**: Zustand with persistence
- **Background Jobs**: Trigger.dev
- **Testing**: Vitest, React Testing Library
- **Deployment**: Vercel, GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/siteproof-v2.git
   cd siteproof-v2
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials.

4. Set up the database:
   ```bash
   pnpm db:setup
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

## Project Structure

```
siteproof-v2/
   apps/
      web/                    # Next.js application
          src/
             app/           # App router pages
             features/      # Feature-based modules
             components/    # Shared components
             lib/          # Utilities and configs
             jobs/         # Background jobs
          public/           # Static assets
   packages/
      database/             # Database schemas and migrations
      shared/              # Shared types and utilities
      ui/                  # UI component library
   docs/                    # Documentation
```

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

```bash
# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Format code
pnpm format
```

### Database Management

```bash
# Run migrations
pnpm db:migrate

# Generate types from database
pnpm db:generate-types

# Reset database (caution!)
pnpm db:reset
```

## Security

SiteProof v2 implements comprehensive security measures:

- **Authentication**: Supabase Auth with secure session management
- **Authorization**: Row Level Security (RLS) for all database access
- **Rate Limiting**: Protection against brute force and DDoS
- **Input Validation**: Zod schemas for all user inputs
- **Security Headers**: CSP, HSTS, and other security headers
- **Vulnerability Scanning**: Automated security checks in CI/CD

See [Security Documentation](./docs/security.md) for details.

## Deployment

The application is configured for automatic deployment via GitHub Actions:

1. Push to `main` branch triggers deployment
2. Automated tests and security checks
3. Database migrations
4. Deployment to Vercel

See [Deployment Guide](./docs/deployment.md) for manual deployment instructions.

## CI/CD Pipeline

- **Quality Checks**: ESLint, TypeScript, Prettier
- **Security Scanning**: npm audit, Snyk, CodeQL
- **Testing**: Unit tests with coverage reporting
- **Performance**: Lighthouse CI for web vitals
- **Deployment**: Automated deployment to Vercel

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `test:` Test additions or modifications

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@siteproof.com or open an issue in the repository.