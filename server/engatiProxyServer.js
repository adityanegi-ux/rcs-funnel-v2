import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ENGATI_FLOW_ENDPOINTS, ENGATI_UPLOAD_ENDPOINT } from './engatiFlowEndpoints.js';
import { createResumeToken, decodeResumeToken, toResumeTokenError } from './resumeToken.js';

const ROUTE_TO_FLOW = {
  '/api/engati/brandname-capture': ENGATI_FLOW_ENDPOINTS.brandNameCapture,
  '/api/engati/journey-start': ENGATI_FLOW_ENDPOINTS.journeyStart,
  '/api/engati/identity-capture': ENGATI_FLOW_ENDPOINTS.identityCapture,
  '/api/engati/rcs-profile-submit': ENGATI_FLOW_ENDPOINTS.rcsProfileSubmit,
  '/api/engati/rcs-final-submit': ENGATI_FLOW_ENDPOINTS.rcsFinalSubmit,
  // Backward compatible aliases
  '/api/engati/page-1': ENGATI_FLOW_ENDPOINTS.journeyStart,
  '/api/engati/page-2': ENGATI_FLOW_ENDPOINTS.identityCapture,
  '/api/engati/page-3': ENGATI_FLOW_ENDPOINTS.rcsProfileSubmit,
};

const PORT = Number(process.env.ENGATI_PROXY_PORT || 8787);
const MAX_BODY_SIZE_BYTES = 1024 * 1024;

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || key in process.env) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

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

function handleResumeTokenError(res, error) {
  const mapped = toResumeTokenError(error);
  sendJson(res, mapped.status, mapped.body);
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
    const callEngati = async (targetFlowUrl) => {
      const response = await fetch(targetFlowUrl, {
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
        flowUrl: targetFlowUrl,
      };
    };

    const getAlternativeFlowUrl = (targetFlowUrl) => {
      if (targetFlowUrl.includes('://api.engati.ai/')) {
        return targetFlowUrl.replace('://api.engati.ai/', '://devapi.engati.ai/');
      }

      if (targetFlowUrl.includes('://devapi.engati.ai/')) {
        return targetFlowUrl.replace('://devapi.engati.ai/', '://api.engati.ai/');
      }

      return null;
    };

    let upstream = await callEngati(flowUrl);

    if (upstream.status === 401 || upstream.status >= 500) {
      const alternativeFlowUrl = getAlternativeFlowUrl(flowUrl);
      if (alternativeFlowUrl) {
        const fallbackUpstream = await callEngati(alternativeFlowUrl);
        if (fallbackUpstream.status < upstream.status || fallbackUpstream.status < 500) {
          upstream = fallbackUpstream;
        }
      }
    }

    return {
      status: upstream.status,
      body: {
        ...upstream.body,
        _engati_upstream_url: upstream.flowUrl,
      },
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

function parseDataUrl(dataUrl) {
  const [metaPart, dataPart] = String(dataUrl || '').split(',');
  if (!metaPart || !dataPart) {
    throw new Error('invalid_image_data');
  }

  const mimeMatch = metaPart.match(/^data:(.*?);base64$/i);
  const mimeType = mimeMatch?.[1] || 'image/png';
  const bytes = Buffer.from(dataPart, 'base64');

  return { bytes, mimeType };
}

function getCandidateUploadUrls(primaryUrl) {
  const candidates = [primaryUrl];

  if (primaryUrl.includes('://agents.engati.ai/')) {
    candidates.push(primaryUrl.replace('://agents.engati.ai/', '://dev.engati.ai/'));
  } else if (primaryUrl.includes('://dev.engati.ai/')) {
    candidates.push(primaryUrl.replace('://dev.engati.ai/', '://agents.engati.ai/'));
  } else {
    candidates.push('https://agents.engati.ai/portal/upload');
    candidates.push('https://dev.engati.ai/portal/upload');
  }

  return Array.from(new Set(candidates));
}

function buildBasicAuthorizationHeader(apiKey) {
  const normalizedKey = String(apiKey || '').trim();

  if (!normalizedKey) {
    return '';
  }

  if (/^Basic\s+/i.test(normalizedKey)) {
    return normalizedKey;
  }

  return `Basic ${normalizedKey}`;
}

function extractUploadedUrl(responseBody) {
  const candidates = [
    responseBody?.url,
    responseBody?.image_url,
    responseBody?.responseObject?.url,
    responseBody?.responseObject?.image_url,
    responseBody?.data?.url,
    responseBody?.data?.image_url,
    responseBody?.result?.url,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
}

function toRawPreview(responseBody) {
  const raw = typeof responseBody?.raw === 'string' ? responseBody.raw : '';
  if (!raw) {
    return '';
  }

  return raw.replace(/\s+/g, ' ').slice(0, 220);
}

async function proxyUploadToEngati({ dataUrl, fileName = 'image.png', fieldName = 'file', workflow = '' }) {
  const apiKey = process.env.ENGATI_API_KEY;
  const authorizationHeader = buildBasicAuthorizationHeader(apiKey);

  if (!apiKey) {
    return {
      status: 500,
      body: {
        error: 'missing_engati_api_key',
        message: 'Set ENGATI_API_KEY on the proxy server environment.',
      },
    };
  }

  let parsedImage;
  try {
    parsedImage = parseDataUrl(dataUrl);
  } catch {
    return {
      status: 400,
      body: {
        error: 'invalid_image_data',
      },
    };
  }

  try {
    const candidateUrls = getCandidateUploadUrls(ENGATI_UPLOAD_ENDPOINT);
    let upstream = null;

    console.log('[engati-upload][proxy] upload start', {
      fileName,
      fieldName,
      workflow,
      candidateUrls,
    });

    for (const targetUrl of candidateUrls) {
      const formData = new FormData();
      formData.append(
        fieldName,
        new Blob([parsedImage.bytes], { type: parsedImage.mimeType }),
        fileName
      );
      if (workflow) {
        formData.append('workflow', workflow);
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Authorization: authorizationHeader,
        },
        body: formData,
      });

      const responseText = await response.text();
      let parsedBody;

      try {
        parsedBody = responseText ? JSON.parse(responseText) : {};
      } catch {
        parsedBody = { raw: responseText };
      }

      upstream = {
        status: response.status,
        body: parsedBody,
        url: targetUrl,
        contentType: response.headers.get('content-type') || '',
        location: response.headers.get('location') || '',
      };

      const extractedUrl = extractUploadedUrl(parsedBody);
      console.log('[engati-upload][proxy] upload attempt response', {
        url: upstream.url,
        status: upstream.status,
        contentType: upstream.contentType,
        location: upstream.location,
        hasUploadedUrl: Boolean(extractedUrl),
        bodyKeys: Object.keys(parsedBody || {}),
        rawPreview: toRawPreview(parsedBody),
      });

      if (extractedUrl) {
        upstream.body = {
          ...upstream.body,
          url: extractedUrl,
        };
        break;
      }
    }

    const uploadedUrl = extractUploadedUrl(upstream?.body);
    if (!uploadedUrl) {
      // Fail-soft: when upstream upload does not return a URL, return the source blob/data URL.
      console.warn('[engati-upload][proxy] upload fallback: url missing', {
        upstreamUrl: upstream?.url || '',
        status: upstream?.status || 0,
        bodyKeys: Object.keys(upstream?.body || {}),
        rawPreview: toRawPreview(upstream?.body),
      });
      return {
        status: 200,
        body: {
          url: dataUrl,
          isFallbackBlob: true,
          fallbackReason: 'upload_url_missing',
          message: 'Upload endpoint returned no media URL. Returning input blob as fallback.',
          _engati_upload_url: upstream?.url || '',
          _engati_upload_content_type: upstream?.contentType || '',
          _engati_upload_location: upstream?.location || '',
          upstreamBody: upstream?.body || {},
        },
      };
    }

    return {
      status: upstream?.status || 500,
      body: {
        ...(upstream?.body || {}),
        url: uploadedUrl,
        _engati_upload_url: upstream?.url || '',
      },
    };
  } catch (error) {
    // Fail-soft: on upload transport/runtime errors, return the source blob/data URL.
    console.error('[engati-upload][proxy] upload fallback: request failed', {
      message: error instanceof Error ? error.message : 'Unknown upload error',
    });
    return {
      status: 200,
      body: {
        url: dataUrl,
        isFallbackBlob: true,
        fallbackReason: 'engati_upload_failed',
        message: error instanceof Error ? error.message : 'Unknown upload error',
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

  if (pathname === '/api/engati/media-upload') {
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

    const uploadResult = await proxyUploadToEngati({
      dataUrl: body?.dataUrl,
      fileName: body?.fileName || 'image.png',
      fieldName: body?.fieldName || 'file',
      workflow: String(body?.workflow || '').trim(),
    });
    sendJson(res, uploadResult.status, uploadResult.body);
    return;
  }

  if (pathname === '/api/engati/resume-token') {
    if (!setCorsHeaders(req, res)) {
      sendJson(res, 403, { error: 'origin_not_allowed' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'POST') {
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

      try {
        const created = createResumeToken(body);
        sendJson(res, 200, {
          token: created.token,
          nextPage: created.nextPage,
          issuedAtUtc: created.issuedAtUtc,
          expiresAtUtc: created.expiresAtUtc,
        });
      } catch (error) {
        handleResumeTokenError(res, error);
      }
      return;
    }

    if (req.method === 'GET') {
      const token = String(url.searchParams.get('token') || '').trim();
      if (!token) {
        sendJson(res, 400, { error: 'missing_resume_token' });
        return;
      }

      try {
        const decoded = decodeResumeToken(token);
        sendJson(res, 200, decoded);
      } catch (error) {
        handleResumeTokenError(res, error);
      }
      return;
    }

    sendJson(res, 405, { error: 'method_not_allowed' });
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
