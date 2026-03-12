export const GTM_ID = 'GTM-PNH9HK5';
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-VXQK579619';

const DEFAULT_DATALAYER_NAME = 'dataLayer';
const GTM_SCRIPT_SOURCE = 'https://www.googletagmanager.com/gtm.js';
const GTAG_SCRIPT_SOURCE = 'https://www.googletagmanager.com/gtag/js';

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

export function enableAnalytics() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const gtmInitialized = initGtm();
  const gaInitialized = initGa4();
  return gtmInitialized || gaInitialized;
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedEventName = normalizeEventName(eventName);
  if (!normalizedEventName) {
    return false;
  }

  const hasAnyAnalyticsId =
    isConfiguredContainerId(GTM_ID) || isConfiguredMeasurementId(GA_MEASUREMENT_ID);
  if (!hasAnyAnalyticsId) {
    return false;
  }

  const normalizedParams = sanitizeEventParams(params);
  ensureDataLayer();

  window[DEFAULT_DATALAYER_NAME].push({
    event: normalizedEventName,
    ...normalizedParams,
  });

  if (typeof window.gtag === 'function') {
    window.gtag('event', normalizedEventName, normalizedParams);
  }

  return true;
}
