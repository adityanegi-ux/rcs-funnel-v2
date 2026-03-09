import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_TOKEN_LENGTH = 4096;

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function normalizeString(value, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeLeadSessionId(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.slice(0, 40);
}

function normalizePhone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 15);
}

function normalizeLeadDetails(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    fullName: normalizeString(source.fullName ?? source.full_name, 120),
    email: normalizeString(source.email, 160),
    phone: normalizePhone(source.phone),
  };
}

function getSecretKey(secret) {
  const rawSecret = normalizeString(
    secret || process.env.ENGATI_RESUME_TOKEN_SECRET || process.env.ENGATI_API_KEY,
    2000
  );
  if (!rawSecret) {
    throw new Error('missing_resume_token_secret');
  }

  return createHash('sha256').update(rawSecret).digest();
}

function getNowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

function clampTtlSeconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    const envDefault = Number(process.env.ENGATI_RESUME_TOKEN_TTL_SECONDS);
    if (!Number.isFinite(envDefault) || envDefault <= 0) {
      return DEFAULT_TTL_SECONDS;
    }
    return Math.min(Math.floor(envDefault), MAX_TTL_SECONDS);
  }

  return Math.min(Math.floor(value), MAX_TTL_SECONDS);
}

function createPublicPayload(claims) {
  return {
    leadSessionId: claims.lead_session_id,
    brandName: claims.brand_name,
    leadDetails: {
      fullName: claims.lead?.full_name || '',
      email: claims.lead?.email || '',
      phone: claims.lead?.phone || '',
    },
    nextPage: Number(claims.next_page) || 3,
    issuedAtUtc: new Date(Number(claims.iat || 0) * 1000).toISOString(),
    expiresAtUtc: new Date(Number(claims.exp || 0) * 1000).toISOString(),
  };
}

export function createResumeToken(payloadInput, options = {}) {
  const source = payloadInput && typeof payloadInput === 'object' ? payloadInput : {};
  const leadSessionId = normalizeLeadSessionId(
    source.leadSessionId ?? source.lead_session_id
  );
  const brandName = normalizeString(source.brandName ?? source.brand_name, 160);
  const leadDetails = normalizeLeadDetails(source.leadDetails ?? source.lead);

  if (!leadSessionId) {
    throw new Error('invalid_lead_session_id');
  }

  if (!brandName) {
    throw new Error('invalid_brand_name');
  }

  const requestedNextPage = Number(source.nextPage ?? source.next_page ?? 3);
  const nextPage = requestedNextPage === 2 ? 2 : 3;
  const ttlSeconds = clampTtlSeconds(
    Number(options.ttlSeconds ?? source.ttlSeconds ?? source.ttl_seconds)
  );

  const issuedAt = getNowInSeconds();
  const expiresAt = issuedAt + ttlSeconds;
  const claims = {
    v: TOKEN_VERSION,
    iat: issuedAt,
    exp: expiresAt,
    next_page: nextPage,
    lead_session_id: leadSessionId,
    brand_name: brandName,
    lead: {
      full_name: leadDetails.fullName,
      email: leadDetails.email,
      phone: leadDetails.phone,
    },
  };

  const key = getSecretKey(options.secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(claims), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const token = [toBase64Url(iv), toBase64Url(encrypted), toBase64Url(authTag)].join('.');

  return {
    token,
    ...createPublicPayload(claims),
  };
}

export function decodeResumeToken(tokenInput, options = {}) {
  const token = String(tokenInput || '').trim();
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new Error('invalid_resume_token');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('invalid_resume_token');
  }

  let claims;
  try {
    const [ivPart, encryptedPart, authTagPart] = parts;
    const iv = fromBase64Url(ivPart);
    const encrypted = fromBase64Url(encryptedPart);
    const authTag = fromBase64Url(authTagPart);
    const decipher = createDecipheriv('aes-256-gcm', getSecretKey(options.secret), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    claims = JSON.parse(decrypted);
  } catch {
    throw new Error('invalid_resume_token');
  }

  if (Number(claims?.v) !== TOKEN_VERSION) {
    throw new Error('unsupported_resume_token_version');
  }

  const now = getNowInSeconds();
  const exp = Number(claims?.exp || 0);
  if (!Number.isFinite(exp) || exp <= now) {
    throw new Error('expired_resume_token');
  }

  const leadSessionId = normalizeLeadSessionId(claims.lead_session_id);
  const brandName = normalizeString(claims.brand_name, 160);
  const leadDetails = normalizeLeadDetails({
    full_name: claims.lead?.full_name,
    email: claims.lead?.email,
    phone: claims.lead?.phone,
  });

  if (!leadSessionId || !brandName) {
    throw new Error('invalid_resume_token');
  }

  const normalizedClaims = {
    ...claims,
    lead_session_id: leadSessionId,
    brand_name: brandName,
    lead: {
      full_name: leadDetails.fullName,
      email: leadDetails.email,
      phone: leadDetails.phone,
    },
  };

  return createPublicPayload(normalizedClaims);
}

export function toResumeTokenError(error) {
  const code = error instanceof Error ? error.message : 'resume_token_error';

  switch (code) {
    case 'missing_resume_token_secret':
      return {
        status: 500,
        body: {
          error: code,
          message:
            'Set ENGATI_RESUME_TOKEN_SECRET (or fallback ENGATI_API_KEY) in server environment.',
        },
      };
    case 'invalid_lead_session_id':
    case 'invalid_brand_name':
      return {
        status: 400,
        body: {
          error: code,
        },
      };
    case 'expired_resume_token':
      return {
        status: 410,
        body: {
          error: code,
          message: 'Resume link has expired. Generate a new link.',
        },
      };
    case 'unsupported_resume_token_version':
    case 'invalid_resume_token':
      return {
        status: 400,
        body: {
          error: code,
        },
      };
    default:
      return {
        status: 500,
        body: {
          error: 'resume_token_error',
          message: error instanceof Error ? error.message : 'Resume token error',
        },
      };
  }
}
