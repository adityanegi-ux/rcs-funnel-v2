import posthog from 'posthog-js';

export const GTM_ID = import.meta.env.VITE_GTM_ID || 'GTM-PNH9HK5';
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-VXQK579619';
export const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ||
  import.meta.env.VITE_POSTHOG_TOKEN ||
  import.meta.env.VITE_PUBLIC_POSTHOG_KEY ||
  import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN ||
  '';
export const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST ||
  import.meta.env.VITE_PUBLIC_POSTHOG_HOST ||
  'https://us.i.posthog.com';
export const BRAND_NAME_INPUT_ID = 'brand-name-input';

const DEFAULT_DATALAYER_NAME = 'dataLayer';
const GTM_SCRIPT_SOURCE = 'https://www.googletagmanager.com/gtm.js';
const GTAG_SCRIPT_SOURCE = 'https://www.googletagmanager.com/gtag/js';
const POSTHOG_DEFAULTS_DATE = '2026-01-30';

function isConfiguredContainerId(containerId) {
  const normalizedId = String(containerId || '').trim();
  return /^GTM-[A-Z0-9]+$/i.test(normalizedId);
}

function appendGtmScript({ containerId, dataLayerName }) {
  const scriptTag = document.createElement('script');
  const dataLayerSuffix =
    dataLayerName !== DEFAULT_DATALAYER_NAME ? `&l=${encodeURIComponent(dataLayerName)}` : '';

  scriptTag.async = true;
  scriptTag.src = `${GTM_SCRIPT_SOURCE}?id=${encodeURIComponent(containerId)}${dataLayerSuffix}`;
  scriptTag.dataset.engatiAnalytics = 'gtm';
  document.head.appendChild(scriptTag);
}

function isConfiguredMeasurementId(measurementId) {
  return /^G-[A-Z0-9]+$/i.test(String(measurementId || '').trim());
}

function appendGtagScript(measurementId) {
  const scriptTag = document.createElement('script');
  scriptTag.async = true;
  scriptTag.src = `${GTAG_SCRIPT_SOURCE}?id=${encodeURIComponent(measurementId)}`;
  scriptTag.dataset.engatiAnalytics = 'ga4';
  document.head.appendChild(scriptTag);
}

function isConfiguredPosthogKey(projectApiKey) {
  return Boolean(String(projectApiKey || '').trim());
}

function maskSessionRecordingInput(text, element) {
  if (element?.id === BRAND_NAME_INPUT_ID) {
    return String(text || '');
  }

  return '*'.repeat(String(text || '').length);
}

function ensureDataLayer() {
  window[DEFAULT_DATALAYER_NAME] = window[DEFAULT_DATALAYER_NAME] || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window[DEFAULT_DATALAYER_NAME].push(arguments);
    };
}

function normalizeEventName(eventName) {
  return String(eventName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sanitizeEventParams(params) {
  const source = params && typeof params === 'object' ? params : {};
  const normalizedEntries = Object.entries(source).flatMap(([key, value]) => {
    if (value === undefined || value === null) {
      return [];
    }

    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) {
      return [];
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return [];
      }
      return [[normalizedKey, value]];
    }

    if (typeof value === 'boolean') {
      return [[normalizedKey, value]];
    }

    const normalizedValue = String(value).trim().slice(0, 200);
    if (!normalizedValue) {
      return [];
    }

    return [[normalizedKey, normalizedValue]];
  });

  return Object.fromEntries(normalizedEntries);
}

function initGtm() {
  if (!isConfiguredContainerId(GTM_ID)) {
    console.warn(
      '[Analytics] GTM is disabled. Set VITE_GTM_ID to a real container ID (for example: GTM-ABC1234).'
    );
    return false;
  }

  if (window.__engatiGtmInitialized) {
    return true;
  }

  const dataLayerName = DEFAULT_DATALAYER_NAME;
  window[dataLayerName] = window[dataLayerName] || [];
  window[dataLayerName].push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });

  appendGtmScript({ containerId: GTM_ID, dataLayerName });
  window.__engatiGtmInitialized = true;
  return true;
}

function initGa4() {
  if (!isConfiguredMeasurementId(GA_MEASUREMENT_ID)) {
    console.warn(
      '[Analytics] GA4 is disabled. Set VITE_GA_MEASUREMENT_ID to a real Measurement ID (for example: G-ABC123XYZ).'
    );
    return false;
  }

  if (window.__engatiGaInitialized) {
    return true;
  }

  ensureDataLayer();
  appendGtagScript(GA_MEASUREMENT_ID);
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  window.__engatiGaInitialized = true;
  return true;
}

function initPosthog() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (!isConfiguredPosthogKey(POSTHOG_KEY)) {
    return false;
  }

  if (window.__engatiPosthogInitialized) {
    return true;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: POSTHOG_DEFAULTS_DATE,
    capture_pageview: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskInputFn: maskSessionRecordingInput,
      captureCanvas: {
        recordCanvas: false,
      },
    },
  });

  window.__engatiPosthogInitialized = true;
  return true;
}

export function enableAnalytics() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const gtmInitialized = initGtm();
  const gaInitialized = initGa4();
  const posthogInitialized = initPosthog();
  return gtmInitialized || gaInitialized || posthogInitialized;
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedEventName = normalizeEventName(eventName);
  if (!normalizedEventName) {
    return false;
  }

  const hasGtm = isConfiguredContainerId(GTM_ID);
  const hasGa = isConfiguredMeasurementId(GA_MEASUREMENT_ID);
  const hasPosthog = isConfiguredPosthogKey(POSTHOG_KEY);
  const hasAnyAnalyticsId = hasGtm || hasGa || hasPosthog;
  if (!hasAnyAnalyticsId) {
    return false;
  }

  const normalizedParams = sanitizeEventParams(params);

  if (hasGtm || hasGa) {
    ensureDataLayer();

    window[DEFAULT_DATALAYER_NAME].push({
      event: normalizedEventName,
      ...normalizedParams,
    });

    if (typeof window.gtag === 'function') {
      window.gtag('event', normalizedEventName, normalizedParams);
    }
  }

  if (hasPosthog) {
    initPosthog();
    posthog.capture(normalizedEventName, normalizedParams);
  }

  return true;
}

export function identifyAnalyticsUser(distinctId, properties = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedDistinctId = String(distinctId || '').trim();
  if (!normalizedDistinctId || !isConfiguredPosthogKey(POSTHOG_KEY)) {
    return false;
  }

  initPosthog();
  posthog.identify(normalizedDistinctId, sanitizeEventParams(properties));
  return true;
}

export function registerSessionAnalyticsProperties(properties = {}) {
  if (typeof window === 'undefined' || !isConfiguredPosthogKey(POSTHOG_KEY)) {
    return false;
  }

  const normalizedProperties = sanitizeEventParams(properties);
  if (!Object.keys(normalizedProperties).length) {
    return false;
  }

  initPosthog();
  posthog.register_for_session(normalizedProperties);
  return true;
}

export function unregisterSessionAnalyticsProperties(propertyNames = []) {
  if (typeof window === 'undefined' || !isConfiguredPosthogKey(POSTHOG_KEY)) {
    return false;
  }

  const names = Array.isArray(propertyNames) ? propertyNames : [propertyNames];
  const normalizedNames = names
    .map((propertyName) => String(propertyName || '').trim())
    .filter(Boolean);

  if (!normalizedNames.length) {
    return false;
  }

  initPosthog();
  normalizedNames.forEach((propertyName) => {
    posthog.unregister_for_session(propertyName);
  });
  return true;
}

export function resetAnalyticsUser() {
  if (typeof window === 'undefined' || !isConfiguredPosthogKey(POSTHOG_KEY)) {
    return false;
  }

  initPosthog();
  posthog.reset();
  return true;
}
