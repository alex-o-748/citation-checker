# Deploying Citation Checker to Cloudflare Pages

This guide walks you through deploying the Citation Checker app to Cloudflare Pages.

## Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Node.js 18+ installed locally
3. Your Neon database URL (the app already uses Neon PostgreSQL)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Cloudflare (First Time Only)

### Option A: Using Wrangler CLI (Recommended)

1. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```

2. Create your Pages project:
   ```bash
   npx wrangler pages project create citation-checker
   ```

### Option B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **Create application** > **Pages** > **Connect to Git**
4. Connect your GitHub/GitLab repository

## Step 3: Configure Environment Variables

In the Cloudflare Dashboard:

1. Go to **Workers & Pages** > **citation-checker** > **Settings** > **Environment variables**
2. Add the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string | Yes |
| `PUBLICAI_API_KEY` | Public.ai API key (for free AI verification) | Yes |
| `OLLAMA_API_KEY` | Ollama API key (optional) | No |

## Step 4: Deploy

### Manual Deployment

```bash
npm run deploy
```

### Automatic Deployments (Git Integration)

If you connected your repository to Cloudflare Pages:

1. Go to **Workers & Pages** > **citation-checker** > **Settings** > **Builds & deployments**
2. Configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist/public`
   - **Root directory:** `/` (or your monorepo path)

Now every push to your main branch will trigger a deployment.

## Step 5: Verify Deployment

Once deployed, your app will be available at:
- `https://citation-checker.pages.dev` (or your custom domain)

## Local Development

To run the app locally with Cloudflare Workers runtime:

```bash
npm run dev
```

This uses Wrangler to simulate the Cloudflare Pages environment locally.

## Project Structure

```
citation-checker/
├── client/              # React frontend (Vite)
├── functions/           # Cloudflare Pages Functions (API)
│   ├── api/
│   │   ├── list-references.ts
│   │   └── verify-citations.ts
│   └── lib/             # Shared utilities for functions
├── dist/public/         # Build output (deployed to Pages)
├── wrangler.toml        # Cloudflare configuration
└── package.json
```

## API Endpoints

The following API endpoints are available:

- `GET /api/list-references?url=<wikipedia-url>` - List all references in a Wikipedia article
- `POST /api/verify-citations` - Verify citations against sources

## Troubleshooting

### "Function invocation failed"
- Check your environment variables are set correctly
- Look at the function logs in Cloudflare Dashboard > Workers & Pages > your-project > Functions

### Database connection issues
- Ensure `DATABASE_URL` is set correctly
- Neon serverless works with Cloudflare Workers natively

### Build failures
- Run `npm run build` locally first to check for errors
- Ensure all dependencies are in `package.json`

## Differences from Replit

| Aspect | Replit | Cloudflare Pages |
|--------|--------|------------------|
| Backend | Express.js (Node.js) | Pages Functions (Workers) |
| Database | Same (Neon PostgreSQL) | Same (Neon PostgreSQL) |
| Frontend | Vite | Vite (unchanged) |
| Deployment | Automatic | Git-based or manual |
| Free Tier | Limited hours | 100k requests/day |

## Cost

Cloudflare Pages Free Tier includes:
- Unlimited sites
- Unlimited static requests
- 100,000 function invocations/day
- Automatic SSL
- Global CDN

This should be more than enough for most use cases!
