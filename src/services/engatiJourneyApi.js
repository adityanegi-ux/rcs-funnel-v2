import axios from 'axios';

const ENGATI_PROXY_BASE_URL = String(import.meta.env.VITE_ENGATI_PROXY_URL || '/api/engati').replace(
  /\/$/,
  ''
);

const ENGATI_PAGE_ONE_URL = 'https://api.engati.ai/bot-api/v2.0/customer/28459/bot/8419bd588bec4048/flow/EBAE1F6090D54CC3B7689F02C04A004F';
const ENGATI_PAGE_TWO_URL = 'https://api.engati.ai/bot-api/v2.0/customer/28459/bot/8419bd588bec4048/flow/EBAE1F6090D54CC3B7689F02C04A004F';
const ENGATI_PAGE_THREE_URL ='https://api.engati.ai/bot-api/v2.0/customer/28459/bot/8419bd588bec4048/flow/B870866FE21F4CC08F60BAD184D26609';

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

function resolveSupportHours(formValues = {}) {
  const directSupportHours = String(formValues.supportHours || '').trim();
  if (directSupportHours) {
    return directSupportHours;
  }

  const supportStartTime = String(formValues.supportStartTime || '').trim();
  const supportEndTime = String(formValues.supportEndTime || '').trim();

  if (supportStartTime && supportEndTime) {
    return `${supportStartTime} - ${supportEndTime}`;
  }

  return supportStartTime || supportEndTime || '';
}

async function postEngatiFlow(flowUrl, payload) {
  const response = await axios.post(flowUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
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

  return postEngatiFlow(ENGATI_PAGE_ONE_URL, payload);
}

export async function capturePage2Journey({ fullName, email, phoneNumber }) {
  const sessionId = getOrCreateLeadSessionId();
  const payload = {
    ...buildCommonPayload('page_2', sessionId),
    p2_full_name: fullName || '',
    p2_work_email: email || '',
    p2_mobile_e164_no_plus: normalizeIndianMobileNo(phoneNumber),
    p2_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(ENGATI_PAGE_TWO_URL, payload);
}

export async function capturePage3Journey({ formValues }) {
  const sessionId = getOrCreateLeadSessionId();
  const normalizedCallValue = normalizeIndianMobileNo(formValues.callValue || formValues.phoneNumber);
  const payload = {
    ...buildCommonPayload('page_3', sessionId),
    p3_timestamp_utc: getUtcIsoTimestamp(),
    brand_name: formValues.brand_name || formValues.businessName || '',
    short_description: formValues.shortDescription || '',
    logo_url_png: formValues.logoUrl || '',
    header_image_url_png: formValues.headerImageUrl || '',
    call_label: formValues.callLabel || 'Call',
    call_value: normalizedCallValue,
    website_label: formValues.websiteLabel || 'Website',
    website_value: formValues.websiteValue || formValues.websiteUrl || '',
    email_label: formValues.emailLabel || 'Email',
    email_value: formValues.emailValue || formValues.emailAddress || '',
    info_summary: formValues.infoSummary || '',
    support_hours: resolveSupportHours(formValues),
    support_address: formValues.supportAddress || '',
    opt_notification: Boolean(formValues.notificationEnabled ?? formValues.opt_notification ?? true),
    opt_block_report_spam: Boolean(
      formValues.blockReportSpamEnabled ?? formValues.opt_block_report_spam ?? true
    ),
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

  return postEngatiFlow(ENGATI_PAGE_THREE_URL, payload);
}
