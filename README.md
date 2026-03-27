# Engati RCS Landing

## Secure Engati Proxy Setup

This project now uses a backend proxy for Engati flow calls, so your Engati API key is not exposed in browser code.

### 1. Server-side environment variables

Set these where the proxy server runs:

- `ENGATI_API_KEY`: your real Engati API key (required)
- `ENGATI_ALLOWED_ORIGINS`: comma-separated allowlist for CORS (optional but recommended)
- `ENGATI_PROXY_PORT`: proxy server port (optional, default `8787`)

Example:

```bash
export ENGATI_API_KEY="YOUR_REAL_KEY"
export ENGATI_ALLOWED_ORIGINS="http://localhost:5173,https://your-webflow-site.webflow.io"
export ENGATI_PROXY_PORT="8787"
```

### 2. Frontend environment variables

Use this in `.env.local` for client routing:

```bash
VITE_ENGATI_PROXY_URL=/api/engati
```

For cross-domain proxy hosting, set absolute URL:

```bash
VITE_ENGATI_PROXY_URL=https://your-proxy-domain.com/api/engati
```

Optional analytics env vars:

```bash
VITE_GTM_ID=GTM-XXXXXXX
VITE_GA_MEASUREMENT_ID=G-XXXXXXX
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

Notes:

- `VITE_POSTHOG_HOST` should match your PostHog region or self-hosted endpoint. Common values are `https://us.i.posthog.com` and `https://eu.i.posthog.com`.
- The frontend also accepts PostHog-style env names `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_TOKEN`, and `VITE_PUBLIC_POSTHOG_HOST`.
- Once PostHog is configured, the existing `trackEvent(...)` calls in the app will automatically start sending custom funnel events there.

Do not use `VITE_ENGATI_API_KEY` anymore.

### 3. Run locally

Terminal 1 (proxy):

```bash
npm run proxy:server
```

Terminal 2 (frontend):

```bash
npm run dev
```

Vite is configured to proxy `/api/engati/*` to `http://localhost:8787` in local dev.

### 4. Health check

```bash
curl http://localhost:8787/api/engati/health
```

### 5. Resume-link support (page-3 deep link)

Additional server env vars:

- `ENGATI_RESUME_TOKEN_SECRET`: secret used to encrypt/decrypt resume tokens (recommended)
- `ENGATI_RESUME_TOKEN_TTL_SECONDS`: optional token expiry in seconds (default `604800` = 7 days, max 30 days)

Create a token:

```bash
curl -X POST http://localhost:8787/api/engati/resume-token \
  -H "Content-Type: application/json" \
  -d '{
    "brandName":"Engati",
    "leadSessionId":"123456789012",
    "leadDetails":{"fullName":"Test User","email":"test@engati.com","phone":"9876543210"},
    "nextPage":3
  }'
```

Validate a token:

```bash
curl "http://localhost:8787/api/engati/resume-token?token=PASTE_TOKEN_HERE"
```
