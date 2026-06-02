# Deploying Aggregate

Two deploy targets: the Next.js dashboard goes to **Vercel**, the scraper/scorer worker goes to **Render** (as a Cron Job, not a long-running Background Worker — see "Render" section below for why).

## Dashboard — Vercel

### One-time: install the Vercel GitHub App

1. Visit https://vercel.com/new and sign in with GitHub.
2. Click **Import Git Repository** → find `c-and-m-construction` → **Import**.
3. If the repo isn't listed, click **Adjust GitHub App Permissions** at the bottom and add `c-and-m-construction` to the install.

### Project settings

When the import wizard opens, override these (don't accept defaults — this is a monorepo).

| Field | Value |
|---|---|
| Framework Preset | Next.js (auto-detected) |
| **Root Directory** | `apps/dashboard` |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Build Command** | `cd ../.. && pnpm --filter @aggregate/dashboard build` |
| Output Directory | `.next` (default — don't change) |
| Node Version | 22.x (Settings → General → Node.js Version after first deploy) |

The `cd ../..` dance is required: pnpm workspaces need install to run at the monorepo root so `@aggregate/db` resolves.

### Environment variables

The current scaffold doesn't need any. As phases land, add these under **Settings → Environment Variables** for all three environments (Production, Preview, Development) unless they should differ per env.

| Variable | Phase | Notes |
|---|---|---|
| `DATABASE_URL` | P12 step 2 | Neon connection string, must end with `?sslmode=require` |
| `NEXTAUTH_SECRET` | P12 step 10 | Generate locally: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | P12 step 10 | Production URL, e.g. `https://aggregate.vercel.app` |

### Deploy

Click **Deploy**. First build takes ~2-3 min. Vercel issues a URL like `https://c-and-m-construction.vercel.app`.

### After first deploy

- **Custom domain (optional):** Settings → Domains → add a hostname; Vercel walks you through DNS.
- **Preview deploys:** automatic for every PR going forward. Each PR conversation gets a unique preview URL.
- **Production branch:** Settings → Git → Production Branch = `main` (default). Every merge to `main` auto-deploys to production.

### Troubleshooting

- `Cannot find module '@aggregate/db'` → install command is wrong; use the `cd ../.. && pnpm install` form above.
- `This project is not a Next.js project` → Root Directory is wrong; set it to `apps/dashboard`.
- Build pulls Playwright → some import accidentally crossed package boundaries. The dashboard should never depend on the worker. Open an issue and we'll trace it.

---

## Worker — Render Cron Job

The scraper runs once a night, not continuously. A Render **Cron Job** (not a Background Worker) is the right primitive: it spins up a container, runs the script, dies. Pays per second of actual run time instead of 24/7.

### One-time: connect Render to GitHub

1. Sign in at https://dashboard.render.com.
2. Settings → GitHub → Install Render's GitHub App on your `mattdixon` account and grant access to `c-and-m-construction`.

### Create the Cron Job

1. Dashboard → **New +** → **Cron Job**.
2. Connect repo `c-and-m-construction`.
3. Settings:

| Field | Value |
|---|---|
| Name | `aggregate-worker` |
| Region | `Ohio` (closest US-Central to Louisiana) |
| Branch | `main` |
| Root Directory | leave blank (monorepo built from root) |
| Runtime | `Node` |
| **Build Command** | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @aggregate/worker build && pnpm --filter @aggregate/worker exec playwright install --with-deps chromium` |
| **Start Command** | `pnpm --filter @aggregate/worker start` |
| **Schedule (UTC)** | `7 8 * * 0,1,2,3,4` (= 3:07 AM CT Sun + Mon-Thu, covering Sun-night and weeknights) |
| Plan | Starter ($7/mo) — free tier is too small for Chromium |

Note: Render Cron schedules are UTC. America/Chicago is UTC-6 (CST) or UTC-5 (CDT). The schedule above uses CST math (3:07 AM CST = 9:07 UTC, but spec calls for the worker to run when the *previous* day's bids have settled, so we trigger at 3:07 AM CT the *next* morning). Re-check this when DST kicks in.

### Environment variables

Add under the cron job's **Environment** tab:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `SCORING_MODEL` | `claude-haiku-4-5` |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `DIGEST_FROM` | e.g. `Aggregate <bids@yourdomain.com>` |
| `DIGEST_TO` | `trevor@example.com,carlos@example.com` |
| `CENTRAL_BIDDING_AUTH_STATE` | paste the JSON contents of `auth-state.json` from `pnpm capture-auth` |

### Triggering manually

Render Cron Jobs have a **"Trigger Run"** button on the job's dashboard page. Click to run on-demand. Logs appear in the **Events** tab.

### Re-arming Central Bidding auth

Sessions expire every 2-4 weeks. When the worker logs `auth expired`:

1. Locally: `pnpm capture-auth`
2. Copy contents of `auth-state.json`
3. Render → Environment → update `CENTRAL_BIDDING_AUTH_STATE` → Save
4. Optionally trigger a manual run to confirm

---

## Database — Neon

1. Sign in at https://console.neon.tech.
2. **Create Project** → name `aggregate`, region `US East (Ohio)` (matches Render Ohio).
3. Copy the **Pooled connection** string. That's `DATABASE_URL`.
4. Set it in:
   - Your local `.env`
   - Vercel project env vars
   - Render cron job env vars
5. From your laptop: `pnpm db:push` to create the schema.

Neon's free tier scales to zero — first request after idle has a ~1s cold start. Acceptable for the dashboard; the worker never notices.
