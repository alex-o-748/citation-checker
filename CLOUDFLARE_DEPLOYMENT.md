# Deploying Citation Checker to Cloudflare Pages

The app is a static single-page site. There are no Pages Functions, no
database and no server-side secrets to configure — verification runs in the
visitor's browser through the shared package (see `README.md`), which talks to
the same Cloudflare Worker proxy the Wikipedia user script uses.

## Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Node.js 18+ installed locally

## Step 1: Install Dependencies

```bash
npm install
```

This pulls `citation-checker-script` straight from GitHub, so the build host
needs to be able to reach github.com. Cloudflare's build environment can.

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

## Step 3: Environment Variables

None. The app holds no server-side key.

Providers that need no key (HuggingFace, PublicAI, Lift Wing) are routed
through the shared Worker proxy, which injects its own upstream credential.
Providers that do need one (Claude, Gemini, OpenAI) take it from the user, in
their browser, for that tab only — it is never stored and never passes through
any server of ours.

If you previously set `DATABASE_URL`, `PUBLICAI_API_KEY` or `OLLAMA_API_KEY` on
this Pages project, they are no longer read and can be removed.

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
   - **Root directory:** `/`

Now every push to your main branch will trigger a deployment.

## Step 5: Verify Deployment

Once deployed, your app will be available at:
- `https://citation-checker.pages.dev` (or your custom domain)

Check one citation end to end. If verdicts come back but sources never do, the
Worker proxy is the thing to look at, not this app — see "The Worker proxy" in
`README.md`.

## Local Development

```bash
npm run dev
```

Plain Vite on port 5000. There is no Workers runtime to simulate any more;
`npm run preview` serves the built output through Wrangler if you want to check
the deployed artifact.

## Project Structure

```
citation-checker/
├── client/              # React frontend (Vite) — the whole app
│   └── src/
│       ├── lib/verification.ts   # the only seam onto the shared package
│       └── types/                # hand-written types for that package
├── dist/public/         # Build output (deployed to Pages)
├── wrangler.toml        # Cloudflare configuration
└── package.json
```

## Troubleshooting

### Build fails resolving `citation-checker-script`
The dependency is a GitHub URL, not an npm registry package. Check the branch
or tag named in `package.json` still exists and that the build host can reach
github.com.

### References load but sources never do
Source fetching goes through the Worker proxy
(`publicai-proxy.alaexis.workers.dev`), which must return
`Access-Control-Allow-Origin: *` for this site's origin. That Worker lives in
`alex-o-748/public-ai-proxy`.

### Build failures
- Run `npm run build` locally first to check for errors
- Ensure all dependencies are in `package.json`

## Cost

Cloudflare Pages Free Tier includes:
- Unlimited sites
- Unlimited static requests
- Automatic SSL
- Global CDN

With no Functions, the free tier's 100k function-invocations/day limit no
longer applies to this project at all.
