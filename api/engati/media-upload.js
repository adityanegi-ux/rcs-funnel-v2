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

  if (primaryUrl.includes('://api.engati.ai/')) {
    candidates.push(primaryUrl.replace('://api.engati.ai/', '://devapi.engati.ai/'));
    candidates.push(primaryUrl.replace('://api.engati.ai/', '://agents.engati.ai/'));
  } else if (primaryUrl.includes('://devapi.engati.ai/')) {
    candidates.push(primaryUrl.replace('://devapi.engati.ai/', '://api.engati.ai/'));
    candidates.push(primaryUrl.replace('://devapi.engati.ai/', '://agents.engati.ai/'));
  } else if (primaryUrl.includes('://agents.engati.ai/')) {
    candidates.push(primaryUrl.replace('://agents.engati.ai/', '://api.engati.ai/'));
    candidates.push(primaryUrl.replace('://agents.engati.ai/', '://devapi.engati.ai/'));
  }

  return Array.from(new Set(candidates));
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

async function callUpload(url, body, apiKey) {
  const formData = new FormData();
  formData.append(body.fieldName, new Blob([body.bytes], { type: body.mimeType }), body.fileName);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
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

    for (const targetUrl of candidateUrls) {
      const attempt = await callUpload(targetUrl, uploadBody, apiKey);
      upstream = attempt;
      if (attempt.status >= 200 && attempt.status < 300) {
        break;
      }
    }

    const uploadedUrl = extractUploadedUrl(upstream?.body);
    if (uploadedUrl) {
      upstream.body = { ...upstream.body, url: uploadedUrl };
    }

    res.setHeader('x-engati-upload-url', upstream?.url || '');
    return res.status(upstream?.status || 500).json(upstream?.body || { error: 'upload_failed' });
  } catch (error) {
    return res.status(502).json({
      error: 'engati_upload_failed',
      message: error instanceof Error ? error.message : 'Unknown upload error',
    });
  }
}
