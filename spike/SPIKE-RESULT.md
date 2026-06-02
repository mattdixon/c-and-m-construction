# Spike: Headless Browser in Remote Runtime

**Verdict: FAIL**

The Claude Code remote execution environment, under its current network policy, cannot drive a headless browser to scrape external sites. Two independent blockers prevent it: the Playwright Chromium binary cannot be downloaded, and outbound HTTP to arbitrary hosts is blocked.

---

## Environment

| Item | Value |
|---|---|
| Node | v22.22.2 |
| npm | 10.9.7 |
| OS | Ubuntu 24.04 (Noble) |
| Container type | Ephemeral sandbox (Anthropic-managed) |
| Network policy | Restricted allowlist |

---

## What worked

- `npm init -y` — success (exit 0)
- `npm i -D playwright` — success (exit 0, 2 packages added)
- `spike/screenshot.mjs` was written and is syntactically valid
- Outbound TCP/TLS to Ubuntu apt mirrors (`archive.ubuntu.com`, `security.ubuntu.com`) is permitted
- The TLS inspection proxy is configured (Anthropic MITM CA signs certificates for inspected traffic)

---

## What failed

### 1. `npx playwright install --with-deps chromium` — exit 1

Two sub-failures:

**a) Playwright Chromium binary download blocked:**
```
Error: Failed to download Chrome for Testing 148.0.7778.96 (playwright chromium v1223), caused by
Error: Download failure, code=1
```
The download target (Google's Playwright CDN) is not in the network allowlist.

**b) System dependency install partially blocked:**
```
Err:2 https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu noble InRelease
  403  Forbidden
Err:4 https://ppa.launchpadcontent.net/ondrej/php/ubuntu noble InRelease
  403  Forbidden
...
E: Failed to fetch https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu/...  403 Forbidden
Failed to install browsers
Error: Installation process exited with code: 100
```
Pre-configured PPAs on the host are blocked by the network proxy.

### 2. `node spike/screenshot.mjs` — exit 1

```
browserType.launch: Executable doesn't exist at
/opt/pw-browsers/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell
```
Chromium binary was never installed (step 1 failed), so launch fails immediately.

### 3. Network egress to example.com — blocked

```
$ curl https://example.com
Host not in allowlist
```
The sandbox egress proxy intercepts all HTTPS (confirmed by TLS cert issuer `O=Anthropic; CN=sandbox-egress-production TLS Inspection CA`) and returns `403 Host not in allowlist` for any host not explicitly permitted. `example.com` is not permitted.

### 4. No system Chromium fallback

`chromium-browser` in apt is a snap-transition stub (`2:1snap1-0ubuntu2`). Snap daemons do not run inside this container, so there is no usable system browser.

---

## Summary of blockers

| Check | Result |
|---|---|
| `npm init` success | ✅ |
| `npm i -D playwright` success | ✅ |
| `npx playwright install` success | ❌ binary download blocked |
| Chromium binary present | ❌ |
| Network egress to example.com | ❌ "Host not in allowlist" |
| Full-page screenshot created | ❌ |

---

## Recommendation

**Do not use this remote runtime as the Aggregate bid scraper worker.** Use a **Render Background Worker** instead.

The Claude Code on the Web sandbox is designed for code editing and light tooling, not for outbound web automation. Its network policy enforces a strict allowlist that permits only trusted infrastructure (Ubuntu apt repos, Docker Hub, GitHub API) and blocks arbitrary external hosts. This is not configurable per-session for scraping workloads. A Render Background Worker runs on a standard Linux VM with unrestricted outbound internet access, can install Playwright browsers normally, and is purpose-built for long-running background jobs. The scraper should be implemented as a Render Background Worker (or equivalent, e.g. a Railway worker or a Fly.io Machine) with Playwright installed at build time via the official `mcr.microsoft.com/playwright` Docker image or a `playwright install` step in the build script. Claude Code sessions remain appropriate for writing, testing (against mocked responses), and deploying that worker — just not for running the live scraper itself.
