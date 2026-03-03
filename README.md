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
