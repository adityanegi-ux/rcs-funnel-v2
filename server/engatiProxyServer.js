import { createServer } from 'node:http';

const FLOW_KEY_PATH_1_URL =
  'https://api.engati.ai/bot-api/v2.0/customer/28459/bot/8419bd588bec4048/flow/EBAE1F6090D54CC3B7689F02C04A004F';
const FLOW_KEY_PATH_2_URL =
  'https://api.engati.ai/bot-api/v2.0/customer/28459/bot/8419bd588bec4048/flow/B870866FE21F4CC08F60BAD184D26609';

const ROUTE_TO_FLOW = {
  '/api/engati/page-1': FLOW_KEY_PATH_1_URL,
  '/api/engati/page-2': FLOW_KEY_PATH_1_URL,
  '/api/engati/page-3': FLOW_KEY_PATH_2_URL,
};

const PORT = Number(process.env.ENGATI_PROXY_PORT || 8787);
const MAX_BODY_SIZE_BYTES = 1024 * 1024;

function parseAllowedOrigins() {
  return String(process.env.ENGATI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = parseAllowedOrigins();

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (ALLOWED_ORIGINS.length === 0) {
    return true;
  }

  return ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin);
}

function setCorsHeaders(req, res) {
  const requestOrigin = req.headers.origin;
  const allowed = isOriginAllowed(requestOrigin);

  if (!allowed) {
    return false;
  }

  if (ALLOWED_ORIGINS.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  return true;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let totalSize = 0;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_SIZE_BYTES) {
      throw new Error('request_body_too_large');
    }
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

async function proxyToEngati(flowUrl, payload) {
  const apiKey = process.env.ENGATI_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: {
        error: 'missing_engati_api_key',
        message: 'Set ENGATI_API_KEY on the proxy server environment.',
      },
    };
  }

  try {
    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let parsedBody;

    try {
      parsedBody = responseText ? JSON.parse(responseText) : {};
    } catch {
      parsedBody = { raw: responseText };
    }

    return {
      status: response.status,
      body: parsedBody,
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: 'engati_upstream_failed',
        message: error instanceof Error ? error.message : 'Unknown upstream error',
      },
    };
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/api/engati/health' && req.method === 'GET') {
    if (!setCorsHeaders(req, res)) {
      sendJson(res, 403, { error: 'origin_not_allowed' });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      configuredOrigins: ALLOWED_ORIGINS.length === 0 ? ['*'] : ALLOWED_ORIGINS,
      hasApiKey: Boolean(process.env.ENGATI_API_KEY),
    });
    return;
  }

  if (!ROUTE_TO_FLOW[pathname]) {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }

  if (!setCorsHeaders(req, res)) {
    sendJson(res, 403, { error: 'origin_not_allowed' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, {
      error: 'invalid_json_body',
      message: error instanceof Error ? error.message : 'Invalid request payload',
    });
    return;
  }

  const flowUrl = ROUTE_TO_FLOW[pathname];
  const upstream = await proxyToEngati(flowUrl, body);
  sendJson(res, upstream.status, upstream.body);
});

server.listen(PORT, () => {
  console.log(`[engati-proxy] listening on http://localhost:${PORT}`);
  console.log(
    `[engati-proxy] allowed origins: ${
      ALLOWED_ORIGINS.length === 0 ? '*' : ALLOWED_ORIGINS.join(', ')
    }`
  );
});
