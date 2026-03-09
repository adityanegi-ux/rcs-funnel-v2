import axios from 'axios';

const ENGATI_PROXY_BASE_URL = '/api/engati';
const ENGATI_JOURNEY_START_URL = `${ENGATI_PROXY_BASE_URL}/journey-start`;
const ENGATI_IDENTITY_CAPTURE_URL = `${ENGATI_PROXY_BASE_URL}/identity-capture`;
const ENGATI_RCS_PROFILE_SUBMIT_URL = `${ENGATI_PROXY_BASE_URL}/rcs-profile-submit`;
const ENGATI_RESUME_TOKEN_URL = `${ENGATI_PROXY_BASE_URL}/resume-token`;
const STATIC_SUPPORT_HOURS = 'Mon-Fri, 9 AM - 6 PM';

const SESSION_ID_STORAGE_KEY = 'engati_rcs_lead_session_id';

function getUtcIsoTimestamp() {
  return new Date().toISOString();
}

function getLandingUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.href;
}

function getLandingOrigin() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin || '';
}

function normalizeWebsiteUrl(inputValue) {
  const rawValue = String(inputValue || '').trim();

  if (!rawValue) {
    return '';
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  return `https://${rawValue}`;
}

function generateNumericSessionId() {
  const epochPart = String(Date.now());
  const randomPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${epochPart}${randomPart}`;
}

export function getOrCreateLeadSessionId() {
  if (typeof window === 'undefined') {
    return generateNumericSessionId();
  }

  const existing = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
  if (existing && /^\d+$/.test(existing)) {
    return existing;
  }

  const created = generateNumericSessionId();
  window.localStorage.setItem(SESSION_ID_STORAGE_KEY, created);
  return created;
}

export function setLeadSessionId(value) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = String(value || '').replace(/\D/g, '');
  if (!normalized) {
    return;
  }

  window.localStorage.setItem(SESSION_ID_STORAGE_KEY, normalized);
}

function buildCommonPayload(journeyStep, sessionId) {
  return {
    'user.channel': 'web',
    'user.phone_no': sessionId,
    lead_session_id: sessionId,
    journey_step: journeyStep,
  };
}

function normalizeIndianMobileNo(inputValue) {
  const digits = String(inputValue || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  return digits;
}

async function postEngatiFlow(flowUrl, payload) {
  const response = await axios.post(flowUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

function sanitizeLeadDetailsForResume(inputValue) {
  const source = inputValue && typeof inputValue === 'object' ? inputValue : {};
  return {
    fullName: String(source.fullName || '').trim(),
    email: String(source.email || '').trim(),
    phone: String(source.phone || '').replace(/\D/g, '').slice(0, 15),
  };
}

export async function createResumeToken({
  brandName,
  leadDetails,
  leadSessionId,
  nextPage = 3,
  ttlSeconds,
}) {
  const payload = {
    brandName: String(brandName || '').trim(),
    leadDetails: sanitizeLeadDetailsForResume(leadDetails),
    leadSessionId: String(leadSessionId || getOrCreateLeadSessionId()),
    nextPage,
  };

  if (Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0) {
    payload.ttlSeconds = Number(ttlSeconds);
  }

  const response = await axios.post(ENGATI_RESUME_TOKEN_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

export async function decodeResumeToken(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('missing_resume_token');
  }

  const response = await axios.get(ENGATI_RESUME_TOKEN_URL, {
    params: {
      token: normalizedToken,
    },
  });

  return response.data;
}

export async function capturePage1Journey({ brandName }) {
  const sessionId = getOrCreateLeadSessionId();
  const payload = {
    ...buildCommonPayload('page_1', sessionId),
    p1_brand_name: brandName || '',
    p1_url: getLandingUrl(),
    p1_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(ENGATI_JOURNEY_START_URL, payload);
}

export async function capturePage2Journey({ fullName, email, phoneNumber, brandName }) {
  const sessionId = getOrCreateLeadSessionId();
  const payload = {
    ...buildCommonPayload('page_2', sessionId),
    'user.user_name': fullName,
    p1_brand_name: brandName,
    email: email,
    'user.email': email,
    'user.phone_no': normalizeIndianMobileNo(phoneNumber),
    call_value: normalizeIndianMobileNo(phoneNumber),
    email_value: email,
    p2_work_email: email,
    p2_mobile_e164_no_plus: normalizeIndianMobileNo(phoneNumber),
    'user.channel': 'web',
    p2_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(ENGATI_IDENTITY_CAPTURE_URL, payload);
}

export async function capturePage3Journey({ formValues }) {
  const sessionId = getOrCreateLeadSessionId();
  const normalizedCallValue = normalizeIndianMobileNo(formValues.callValue || formValues.phoneNumber);
  const normalizedWebsiteValue = normalizeWebsiteUrl(
    formValues.websiteValue || formValues.websiteUrl || getLandingOrigin()
  );
  const payload = {
    ...buildCommonPayload('page_3', sessionId),
    p3_timestamp_utc: getUtcIsoTimestamp(),
    business_name: formValues.businessName || formValues.brandName || '',
    short_description: formValues.shortDescription || '',
    logo_url_png: formValues.logoUrl || '',
    header_image_url_png: formValues.headerImageUrl || '',
    p3_work_email: formValues.emailValue || formValues.emailAddress || '',
    p3_mobile_e164_no_plus: normalizedCallValue,
    call_value: normalizedCallValue,
    website_value: normalizedWebsiteValue,
    email_value: formValues.emailValue || formValues.emailAddress || '',
    journey_completion: true,
    support_address: normalizeWebsiteUrl(formValues.supportAddress || normalizedWebsiteValue),
    opt_view_privacy_policy: Boolean(
      String(formValues.privacyPolicyUrl || '').trim() ||
        formValues.privacyPolicyEnabled ||
        formValues.opt_view_privacy_policy
    ),
    opt_view_terms_of_services: Boolean(
      String(formValues.termsOfServicesUrl || '').trim() ||
        formValues.termsOfServicesEnabled ||
        formValues.opt_view_terms_of_services
    ),
  };

  return postEngatiFlow(ENGATI_RCS_PROFILE_SUBMIT_URL, payload);
}
