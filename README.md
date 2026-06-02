# Aggregate

Daily-scheduled bid discovery for **CSM Mechanical / C&M Construction**. Scrapes three public bid sites every weeknight + Sunday night, scores each new RFP/RFQ against CSM's scope of work, and surfaces relevant ones via a dashboard and a 6 AM CT email digest.

The name is the literal material in both concrete (cement + aggregate) and asphalt (bitumen + aggregate) — and also the verb for what the tool does.

## Architecture

```
Render Cron (3:07am CT weeknights + Sun)
   │
   ▼
Render Background Worker (Node + Playwright)
   ├─ scrape nola.gov          (public)
   ├─ scrape LADOTD            (public)
   ├─ scrape Central Bidding   (login via stored Playwright state)
   ├─ Claude API score each new bid
   └─ write to Neon Postgres
                                  │
                                  ▼
                      Next.js dashboard on Vercel (port 6184 dev)
                      Resend digest @ 6 AM CT
```

The §11 spike (see branch `spike/headless-browser`) confirmed Anthropic's hosted Claude Code routine sandbox blocks Playwright Chromium downloads and external network egress, so the scraper runs on Render rather than as a hosted Claude Code routine.

## Repo layout

```
apps/
  worker/        Render Background Worker — scraping + scoring + digest
  dashboard/     Next.js 14 App Router + Tailwind on Vercel
packages/
  db/            Shared Drizzle schema + queries
```

## Dev setup

```bash
nvm use            # Node 22
pnpm install
cp .env.example .env
# fill in DATABASE_URL, ANTHROPIC_API_KEY, etc.

pnpm db:push       # create tables on Neon
pnpm dev:dashboard # http://localhost:6184
pnpm dev:worker    # run worker once locally
```

## Dev ports

- Dashboard: **6184** (per Matt's global rule, no 3000/5000/5173/8080)

## Auth capture for Central Bidding

```bash
pnpm capture-auth
```

Opens Playwright in headed mode, lets you log in manually, then saves storage state to `auth-state.json`. Paste the file's contents into the Render secret `CENTRAL_BIDDING_AUTH_STATE`. Re-run when sessions expire (every 2-4 weeks).

## Deploy

- **Worker:** Render Background Worker, build `pnpm install && pnpm --filter @aggregate/worker build`, start `pnpm --filter @aggregate/worker start`.
- **Cron:** Render Cron Job at `7 8 * * 1-5` and `7 8 * * 0` UTC (= 3:07 AM CT weeknights + Sunday) that invokes the worker.
- **Dashboard:** Vercel, root `apps/dashboard`, install command `pnpm install`, build `pnpm --filter @aggregate/dashboard build`.
- **DB:** Neon free tier, separate `aggregate` database.

## Scope

CSM is a New Orleans paving + concrete contractor. In-scope bid items: asphalt paving, mill and overlay, full-depth patching, concrete roadway/sidewalk/driveway/curb, slip-form curb, limestone/aggregate subbase. Out-of-scope: drainage, landscaping, electrical, plumbing, vertical construction, bridge structural, traffic signals. Sweet spot: $250K-$5M projects in Louisiana, especially New Orleans and surrounding parishes.

## Status

- [x] §11 spike (headless browser feasibility): FAIL on Claude Code runtime, falling back to Render
- [x] §12 step 1: repo scaffolding
- [ ] §12 step 2: DB schema + migrations
- [ ] §12 step 3: `capture-auth` CLI
- [ ] §12 step 4: nola.gov scraper
- [ ] §12 step 5: LADOTD scraper
- [ ] §12 step 6: Central Bidding scraper
- [ ] §12 step 7: Claude scoring
- [ ] §12 step 8: dedup + write to Postgres
- [ ] §12 step 9: Resend email digest
- [ ] §12 step 10: dashboard skeleton + auth
- [ ] §12 step 11: pursuing/passing/won/lost workflow
- [ ] §12 step 12: deploy
