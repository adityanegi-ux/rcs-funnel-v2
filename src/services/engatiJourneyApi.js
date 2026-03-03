import axios from 'axios';
import { formatTimeWithAmPm } from '../components/rcs/helpers/rcsFormHelpers';

const ENGATI_PAGE_ONE_BASE_URL = import.meta.env.VITE_ENGATI_PROXY_URL_1
const ENGATI_PAGE_TWO_BASE_URL = import.meta.env.VITE_ENGATI_PROXY_URL_2
const ENGATI_PAGE_THREE_BASE_URL = import.meta.env.VITE_ENGATI_PROXY_URL_3

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

  return postEngatiFlow(`${ENGATI_PAGE_ONE_BASE_URL}/`, payload);
}

export async function capturePage2Journey({ fullName, email, phoneNumber }) {
  const sessionId = getOrCreateLeadSessionId();
  const payload = {
    ...buildCommonPayload('page_2', sessionId),
    p2_name: fullName || '',
    p2_email: email || '',
    p2_phone: phoneNumber || '',
    p2_timestamp_utc: getUtcIsoTimestamp(),
  };

  return postEngatiFlow(`${ENGATI_PAGE_TWO_BASE_URL}/`, payload);
}

export async function capturePage3Journey({ formValues }) {
  const sessionId = getOrCreateLeadSessionId();
  const payload = {
    ...buildCommonPayload('page_3', sessionId),
    p3_timestamp_utc: getUtcIsoTimestamp(),
    p3_business_name: formValues.businessName || '',
    p3_short_description: formValues.shortDescription || '',
    p3_logo_url: formValues.logoUrl || '',
    p3_header_image_url: formValues.headerImageUrl || '',
    p3_phone_number: formValues.phoneNumber || '',
    p3_website_url: formValues.websiteUrl || '',
    p3_email_address: formValues.emailAddress || '',
    p3_info_summary: formValues.infoSummary || '',
    p3_support_start_time: formatTimeWithAmPm(formValues.supportStartTime),
    p3_support_end_time: formatTimeWithAmPm(formValues.supportEndTime),
    p3_support_address: formValues.supportAddress || '',
    p3_notification_enabled: Boolean(formValues.notificationEnabled),
    p3_block_report_spam_enabled: Boolean(formValues.blockReportSpamEnabled),
    p3_privacy_policy_enabled: Boolean(formValues.privacyPolicyEnabled),
    p3_terms_of_services_enabled: Boolean(formValues.termsOfServicesEnabled),
  };

  return postEngatiFlow(`${ENGATI_PAGE_THREE_BASE_URL}/`, payload);
}
