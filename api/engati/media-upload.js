import { ENGATI_UPLOAD_ENDPOINT } from '../../server/engatiFlowEndpoints.js';

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
    candidates.push(primaryUrl.replace('://agents.engati.ai/', '://api.engati.ai/'));
    candidates.push(primaryUrl.replace('://agents.engati.ai/', '://devapi.engati.ai/'));
  } else if (primaryUrl.includes('://api.engati.ai/')) {
    candidates.push(primaryUrl.replace('://api.engati.ai/', '://agents.engati.ai/'));
    candidates.push(primaryUrl.replace('://api.engati.ai/', '://devapi.engati.ai/'));
  } else if (primaryUrl.includes('://devapi.engati.ai/')) {
    candidates.push(primaryUrl.replace('://devapi.engati.ai/', '://agents.engati.ai/'));
    candidates.push(primaryUrl.replace('://devapi.engati.ai/', '://api.engati.ai/'));
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

async function callUpload(url, body, authorizationHeader) {
  const formData = new FormData();
  formData.append(body.fieldName, new Blob([body.bytes], { type: body.mimeType }), body.fileName);

  const response = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Authorization: authorizationHeader,
    },
    body: formData,
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
    url,
    contentType: response.headers.get('content-type') || '',
    location: response.headers.get('location') || '',
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

  const apiKey = process.env.ENGATI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'missing_engati_api_key',
      message: 'Set ENGATI_API_KEY in Vercel project environment variables.',
    });
  }

  const payload = normalizeBody(req.body);
  const dataUrl = String(payload.dataUrl || '').trim();
  const fileName = String(payload.fileName || 'image.png').trim();
  const fieldName = String(payload.fieldName || 'file').trim();
  const authorizationHeader = buildBasicAuthorizationHeader(apiKey);

  if (!dataUrl) {
    return res.status(400).json({ error: 'missing_image_data' });
  }

  let parsedImage;
  try {
    parsedImage = parseDataUrl(dataUrl);
  } catch {
    return res.status(400).json({ error: 'invalid_image_data' });
  }

  const uploadBody = {
    bytes: parsedImage.bytes,
    mimeType: parsedImage.mimeType,
    fileName: fileName || 'image.png',
    fieldName: fieldName || 'file',
  };

  try {
    const candidateUrls = getCandidateUploadUrls(ENGATI_UPLOAD_ENDPOINT);
    let upstream = null;
    let uploadedUrl = '';
    const attempts = [];

    for (const targetUrl of candidateUrls) {
      const attempt = await callUpload(targetUrl, uploadBody, authorizationHeader);
      upstream = attempt;
      const attemptUploadedUrl = extractUploadedUrl(attempt.body);
      attempts.push({
        url: attempt.url,
        status: attempt.status,
        contentType: attempt.contentType,
        location: attempt.location,
        hasUploadedUrl: Boolean(attemptUploadedUrl),
      });

      if (attemptUploadedUrl) {
        uploadedUrl = attemptUploadedUrl;
        break;
      }
    }

    if (uploadedUrl) {
      upstream.body = { ...upstream.body, url: uploadedUrl };
      res.setHeader('x-engati-upload-url', upstream?.url || '');
      return res.status(upstream?.status || 200).json(upstream?.body || { url: uploadedUrl });
    }

    // Fail-soft: when upstream upload does not return a URL, return the source blob/data URL.
    res.setHeader('x-engati-upload-url', upstream?.url || '');
    res.setHeader('x-engati-upload-fallback', 'true');
    return res.status(200).json({
      url: dataUrl,
      isFallbackBlob: true,
      fallbackReason: 'upload_url_missing',
      message: 'Upload endpoint returned no media URL. Returning input blob as fallback.',
      attempts,
      upstreamBody: upstream?.body || {},
    });
  } catch (error) {
    // Fail-soft: on upload transport/runtime errors, return the source blob/data URL.
    res.setHeader('x-engati-upload-fallback', 'true');
    return res.status(200).json({
      url: dataUrl,
      isFallbackBlob: true,
      fallbackReason: 'engati_upload_failed',
      message: error instanceof Error ? error.message : 'Unknown upload error',
    });
  }
}
