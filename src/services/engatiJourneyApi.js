import axios from 'axios';

const ENGATI_PROXY_BASE_URL = '/api/engati';
const ENGATI_JOURNEY_START_URL = `${ENGATI_PROXY_BASE_URL}/journey-start`;
const ENGATI_IDENTITY_CAPTURE_URL = `${ENGATI_PROXY_BASE_URL}/identity-capture`;
const ENGATI_RCS_PROFILE_SUBMIT_URL = `${ENGATI_PROXY_BASE_URL}/rcs-profile-submit`;
const ENGATI_RCS_FINAL_SUBMIT_URL = `${ENGATI_PROXY_BASE_URL}/rcs-final-submit`;
const ENGATI_RESUME_TOKEN_URL = `${ENGATI_PROXY_BASE_URL}/resume-token`;
const ENGATI_MEDIA_UPLOAD_URL = `${ENGATI_PROXY_BASE_URL}/media-upload`;
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

function buildCommonPayload({
  journeyStep,
  sessionId,
  email,
  phoneNumber,
  includeSessionId = true,
}) {
  const normalizedEmail = String(email || '').trim();
  const normalizedPhone = normalizeIndianMobileNo(phoneNumber);

  return {
    'user.channel': 'whatsapp',
    ...(includeSessionId ? { lead_session_id: sessionId } : {}),
    journey_step: journeyStep,
    ...(normalizedEmail ? { 'user.email': normalizedEmail } : {}),
    ...(normalizedPhone ? { 'user.phone_no': normalizedPhone } : {}),
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

function postEngatiFlowWithBeacon(flowUrl, payload) {
  if (typeof window === 'undefined') {
    return false;
  }

  const serializedPayload = JSON.stringify(payload || {});
  if (!serializedPayload) {
    return false;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const body = new Blob([serializedPayload], { type: 'application/json' });
      return navigator.sendBeacon(flowUrl, body);
    } catch {
      // Fall through to fetch keepalive.
    }
  }

  if (typeof fetch === 'function') {
    fetch(flowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: serializedPayload,
      keepalive: true,
    }).catch(() => {});
    return true;
  }

  return false;
}

function buildDropOffMetadata({ page, reason }) {
  return {
    drop_off: true,
    drop_off_page: page,
    drop_off_reason: String(reason || 'page_unload'),
    drop_off_timestamp_utc: getUtcIsoTimestamp(),
  };
}

export async function uploadImageDataUrl({
  dataUrl,
  fileName = 'image.png',
  fieldName = 'file',
  workflow,
}) {
  const normalizedDataUrl = String(dataUrl || '').trim();
  if (!normalizedDataUrl) {
    throw new Error('No image selected for upload.');
  }

  try {
    const response = await axios.post(
      ENGATI_MEDIA_UPLOAD_URL,
      {
        dataUrl: normalizedDataUrl,
        fileName: String(fileName || 'image.png'),
        fieldName: String(fieldName || 'file'),
        workflow: String(workflow || '').trim(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const uploadedUrl = String(response?.data?.url || '').trim();
    if (!uploadedUrl) {
      return normalizedDataUrl;
    }

    return uploadedUrl;
  } catch (error) {
    const fallbackUrl = String(error?.response?.data?.url || normalizedDataUrl).trim();
    if (fallbackUrl) {
      return fallbackUrl;
    }

    return normalizedDataUrl;
  }
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
    ...buildCommonPayload({ journeyStep: 'page_2', sessionId }),
    p1_brand_name: brandName || '',
    p1_url: getLandingUrl(),
    p1_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(ENGATI_JOURNEY_START_URL, payload);
}

export async function capturePage2Journey({ fullName, email, phoneNumber, brandName }) {
  const normalizedEmail = String(email || '').trim();
  const normalizedPhone = normalizeIndianMobileNo(phoneNumber);
  const payload = {
    ...buildCommonPayload({
      journeyStep: 'page_3',
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      includeSessionId: false,
    }),
    'user.user_name': fullName,
    p1_brand_name: brandName,
    email: normalizedEmail,
    call_value: normalizedPhone,
    email_value: normalizedEmail,
    p2_work_email: normalizedEmail,
    p2_mobile_e164_no_plus: normalizedPhone,
    p2_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(ENGATI_IDENTITY_CAPTURE_URL, payload);
}

export async function capturePage3Journey({ formValues }) {
  const normalizedCallValue = normalizeIndianMobileNo(formValues.callValue || formValues.phoneNumber);
  const normalizedEmailValue = String(formValues.emailValue || formValues.emailAddress || '').trim();
  const normalizedWebsiteValue = normalizeWebsiteUrl(
    formValues.websiteValue || formValues.websiteUrl || getLandingOrigin()
  );
  const payload = {
    ...buildCommonPayload({
      journeyStep: 'completed',
      email: normalizedEmailValue,
      phoneNumber: normalizedCallValue,
      includeSessionId: false,
    }),
    p3_timestamp_utc: getUtcIsoTimestamp(),
    business_name: formValues.businessName || formValues.brandName || '',
    short_description: formValues.shortDescription || '',
    logo_url_png: formValues.logoUrl || '',
    header_image_url_png: formValues.headerImageUrl || '',
    p3_work_email: normalizedEmailValue,
    p3_mobile_e164_no_plus: normalizedCallValue,
    call_value: normalizedCallValue,
    website_value: normalizedWebsiteValue,
    email_value: normalizedEmailValue,
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

export async function journeyEnd({ phoneNumber } = {}) {
  const sessionId = getOrCreateLeadSessionId();
  const normalizedPhone = normalizeIndianMobileNo(phoneNumber);
  const payload = {
    ...buildCommonPayload({
      journeyStep: 'submit',
      sessionId,
      phoneNumber: normalizedPhone,
    }),
    call_value: normalizedPhone,
    p3_mobile_e164_no_plus: normalizedPhone,
    submit_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(ENGATI_RCS_FINAL_SUBMIT_URL, payload);
}

export function sendPageDropOffBeacon({
  page,
  brandName,
  leadDetails,
  formValues,
  reason = 'page_unload',
}) {
  const pageNumber = Number(page);
  const normalizedBrandName = String(brandName || '').trim();
  const normalizedLeadDetails = sanitizeLeadDetailsForResume(leadDetails);
  const sessionId = getOrCreateLeadSessionId();

  if (pageNumber === 1) {
    if (!normalizedBrandName) {
      return false;
    }

    const payload = {
      ...buildCommonPayload({ journeyStep: 'drop_off', sessionId }),
      ...buildDropOffMetadata({ page: 'page_1', reason }),
      p1_brand_name: normalizedBrandName,
      p1_url: getLandingUrl(),
      p1_timestamp_utc: getUtcIsoTimestamp(),
    };

    return postEngatiFlowWithBeacon(ENGATI_JOURNEY_START_URL, payload);
  }

  if (pageNumber === 2) {
    const normalizedEmail = normalizedLeadDetails.email;
    const normalizedPhone = normalizeIndianMobileNo(normalizedLeadDetails.phone);
    const normalizedFullName = String(normalizedLeadDetails.fullName || '').trim();
    const hasPage2Data = Boolean(
      normalizedBrandName || normalizedEmail || normalizedPhone || normalizedFullName
    );

    if (!hasPage2Data) {
      return false;
    }

    const payload = {
      ...buildCommonPayload({
        journeyStep: 'drop_off',
        sessionId,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
      }),
      ...buildDropOffMetadata({ page: 'page_2', reason }),
      'user.user_name': normalizedFullName,
      p1_brand_name: normalizedBrandName,
      email: normalizedEmail,
      call_value: normalizedPhone,
      email_value: normalizedEmail,
      p2_work_email: normalizedEmail,
      p2_mobile_e164_no_plus: normalizedPhone,
      p2_timestamp_utc: getUtcIsoTimestamp(),
    };

    return postEngatiFlowWithBeacon(ENGATI_IDENTITY_CAPTURE_URL, payload);
  }

  if (pageNumber === 3) {
    const source = formValues && typeof formValues === 'object' ? formValues : {};
    const businessName = String(source.businessName || source.brandName || normalizedBrandName).trim();
    const shortDescription = String(source.shortDescription || '').trim();
    const logoUrl = String(source.logoUrl || '').trim();
    const headerImageUrl = String(source.headerImageUrl || '').trim();
    const normalizedCallValue = normalizeIndianMobileNo(
      source.callValue || source.phoneNumber || normalizedLeadDetails.phone
    );
    const normalizedEmailValue = String(
      source.emailValue || source.emailAddress || normalizedLeadDetails.email
    ).trim();
    const rawWebsiteValue = String(source.websiteValue || source.websiteUrl || '').trim();
    const normalizedWebsiteValue = normalizeWebsiteUrl(rawWebsiteValue || getLandingOrigin());
    const privacyPolicyUrl = String(source.privacyPolicyUrl || '').trim();
    const termsOfServicesUrl = String(source.termsOfServicesUrl || '').trim();

    const hasPage3Data = Boolean(
      businessName ||
        shortDescription ||
        logoUrl ||
        headerImageUrl ||
        normalizedCallValue ||
        normalizedEmailValue ||
        rawWebsiteValue ||
        privacyPolicyUrl ||
        termsOfServicesUrl
    );

    if (!hasPage3Data) {
      return false;
    }

    const payload = {
      ...buildCommonPayload({
        journeyStep: 'drop_off',
        sessionId,
        email: normalizedEmailValue,
        phoneNumber: normalizedCallValue,
      }),
      ...buildDropOffMetadata({ page: 'page_3', reason }),
      p3_timestamp_utc: getUtcIsoTimestamp(),
      business_name: businessName,
      short_description: shortDescription,
      logo_url_png: logoUrl,
      header_image_url_png: headerImageUrl,
      p3_work_email: normalizedEmailValue,
      p3_mobile_e164_no_plus: normalizedCallValue,
      call_value: normalizedCallValue,
      website_value: normalizedWebsiteValue,
      email_value: normalizedEmailValue,
      support_address: normalizeWebsiteUrl(source.supportAddress || normalizedWebsiteValue),
      opt_view_privacy_policy: Boolean(
        privacyPolicyUrl || source.privacyPolicyEnabled || source.opt_view_privacy_policy
      ),
      opt_view_terms_of_services: Boolean(
        termsOfServicesUrl || source.termsOfServicesEnabled || source.opt_view_terms_of_services
      ),
    };

    return postEngatiFlowWithBeacon(ENGATI_RCS_PROFILE_SUBMIT_URL, payload);
  }

  return false;
}
