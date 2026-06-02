// Aggregate worker entry point.
// Invoked by Render Cron weeknights + Sunday at 3:07 AM CT.
// Pipeline: scrape → score → upsert → digest.

async function main() {
  console.log('[aggregate] worker run starting', new Date().toISOString());

  // TODO §12.4-6: site scrapers (nola, ladotd, central_bidding)
  // TODO §12.7:   Claude scoring
  // TODO §12.8:   dedup + upsert into Postgres
  // TODO §12.9:   Resend digest

  console.log('[aggregate] worker run complete');
}

main().catch((err) => {
  console.error('[aggregate] worker run failed', err);
  process.exit(1);
});
