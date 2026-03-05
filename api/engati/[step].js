import { ENGATI_FLOW_ENDPOINTS } from '../../server/engatiFlowEndpoints.js';

const STEP_TO_FLOW = {
  'journey-start': ENGATI_FLOW_ENDPOINTS.journeyStart,
  'identity-capture': ENGATI_FLOW_ENDPOINTS.identityCapture,
  'rcs-profile-submit': ENGATI_FLOW_ENDPOINTS.rcsProfileSubmit,
  // Backward compatible aliases
  'page-1': ENGATI_FLOW_ENDPOINTS.journeyStart,
  'page-2': ENGATI_FLOW_ENDPOINTS.identityCapture,
  'page-3': ENGATI_FLOW_ENDPOINTS.rcsProfileSubmit,
};

function parseAllowedOrigins() {
  return String(process.env.ENGATI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function pickStep(stepParam) {
  if (Array.isArray(stepParam)) {
    return String(stepParam[0] || '');
  }

  return String(stepParam || '');
}

function setCorsHeaders(req, res) {
  const allowedOrigins = parseAllowedOrigins();
  const requestOrigin = req.headers.origin;

  if (!requestOrigin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  } else {
    return false;
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

function normalizeBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  if (typeof body === 'object') {
    return body;
  }

  return {};
}

function getAlternativeFlowUrl(flowUrl) {
  if (flowUrl.includes('://api.engati.ai/')) {
    return flowUrl.replace('://api.engati.ai/', '://devapi.engati.ai/');
  }

  if (flowUrl.includes('://devapi.engati.ai/')) {
    return flowUrl.replace('://devapi.engati.ai/', '://api.engati.ai/');
  }

  return null;
}

async function callEngati(flowUrl, payload, apiKey) {
  const response = await fetch(flowUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawResponse = await response.text();
  let parsedResponse;

  try {
    parsedResponse = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    parsedResponse = { raw: rawResponse };
  }

  return {
    status: response.status,
    body: parsedResponse,
    flowUrl,
  };
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const step = pickStep(req.query.step);
  const flowUrl = STEP_TO_FLOW[step];

  if (!flowUrl) {
    return res.status(404).json({ error: 'invalid_step' });
  }

  const apiKey = process.env.ENGATI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'missing_engati_api_key',
      message: 'Set ENGATI_API_KEY in Vercel project environment variables.',
    });
  }

  const payload = normalizeBody(req.body);

  try {
    let upstream = await callEngati(flowUrl, payload, apiKey);

    if (upstream.status === 401 || upstream.status >= 500) {
      const alternativeFlowUrl = getAlternativeFlowUrl(flowUrl);
      if (alternativeFlowUrl) {
        const fallbackUpstream = await callEngati(alternativeFlowUrl, payload, apiKey);
        if (fallbackUpstream.status < upstream.status || fallbackUpstream.status < 500) {
          upstream = fallbackUpstream;
        }
      }
    }

    res.setHeader('x-engati-upstream-url', upstream.flowUrl);
    return res.status(upstream.status).json(upstream.body);
  } catch (error) {
    return res.status(502).json({
      error: 'engati_upstream_failed',
      message: error instanceof Error ? error.message : 'Unknown upstream error',
    });
  }
}
