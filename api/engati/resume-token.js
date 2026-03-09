import {
  createResumeToken,
  decodeResumeToken,
  toResumeTokenError,
} from '../../server/resumeToken.js';

function parseAllowedOrigins() {
  return String(process.env.ENGATI_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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

function pickFirst(input) {
  if (Array.isArray(input)) {
    return String(input[0] || '');
  }

  return String(input || '');
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    try {
      const payload = normalizeBody(req.body);
      const created = createResumeToken(payload);
      return res.status(200).json({
        token: created.token,
        nextPage: created.nextPage,
        issuedAtUtc: created.issuedAtUtc,
        expiresAtUtc: created.expiresAtUtc,
      });
    } catch (error) {
      const mapped = toResumeTokenError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  if (req.method === 'GET') {
    const token = pickFirst(req.query.token);
    if (!token) {
      return res.status(400).json({ error: 'missing_resume_token' });
    }

    try {
      const decoded = decodeResumeToken(token);
      return res.status(200).json(decoded);
    } catch (error) {
      const mapped = toResumeTokenError(error);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

