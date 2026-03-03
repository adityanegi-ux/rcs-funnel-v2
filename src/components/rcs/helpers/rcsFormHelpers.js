export const REQUIRED_FIELD_KEYS = [
  'businessName',
  'shortDescription',
  'phoneNumber',
  'websiteUrl',
  'emailAddress',
];

export const UPLOAD_SPECS = [
  {
    key: 'logoUrl',
    title: 'Logo',
    minWidth: 256,
    minHeight: 256,
    outputWidth: 256,
    outputHeight: 256,
  },
  {
    key: 'headerImageUrl',
    title: 'Header Image',
    minWidth: 1440,
    minHeight: 448,
    outputWidth: 1440,
    outputHeight: 448,
  },
];

export const OPTION_TOGGLE_FIELDS = [
  { key: 'notificationEnabled', label: 'Notification' },
  { key: 'blockReportSpamEnabled', label: 'Block & report spam' },
  { key: 'privacyPolicyEnabled', label: 'View Privacy Policy' },
  { key: 'termsOfServicesEnabled', label: 'View Terms of Services' },
];

export function sanitizeValue(value) {
  return (value || '').trim();
}

export function createInitialRcsForm(prefill = {}) {
  const businessName = sanitizeValue(prefill.brandName);
  const emailAddress = sanitizeValue(prefill.email);
  const phoneNumber = sanitizeValue(prefill.phone);

  return {
    businessName,
    shortDescription: '',
    logoUrl: '',
    headerImageUrl: '',
    phoneNumber,
    websiteUrl: '',
    emailAddress,
    infoSummary: '',
    supportStartTime: '09:00',
    supportEndTime: '18:00',
    supportAddress: '',
    notificationEnabled: false,
    blockReportSpamEnabled: false,
    privacyPolicyEnabled: false,
    termsOfServicesEnabled: false,
  };
}

export function getSubmissionReadiness(form) {
  const completed = REQUIRED_FIELD_KEYS.filter((key) => sanitizeValue(form[key]).length > 0).length;
  const total = REQUIRED_FIELD_KEYS.length;
  const percentage = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percentage,
  };
}

export function getActionLabel(value, fallbackLabel) {
  return sanitizeValue(value) || fallbackLabel;
}

export function getEnabledOptions(form) {
  return OPTION_TOGGLE_FIELDS.filter((option) => Boolean(form[option.key])).map((option) => option.label);
}

export function formatTimeWithAmPm(timeValue) {
  if (!timeValue) {
    return '--:--';
  }

  const normalized = String(timeValue).trim();

  if (/am|pm/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  const [hourPart, minutePart = '00'] = normalized.split(':');
  const hours24 = Number(hourPart);

  if (Number.isNaN(hours24)) {
    return normalized;
  }

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;

  return `${String(hours12).padStart(2, '0')}:${minutePart} ${period}`;
}
