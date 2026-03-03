export const REQUIRED_FIELD_KEYS = [
  'businessName',
  'shortDescription',
  'callValue',
  'websiteValue',
  'emailValue',
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
  const emailValue = sanitizeValue(prefill.email);
  const callValue = sanitizeValue(prefill.phone);

  return {
    businessName,
    shortDescription: '',
    logoUrl: '',
    headerImageUrl: '',
    callLabel: 'Call',
    callValue,
    websiteLabel: 'Website',
    websiteValue: '',
    emailLabel: 'Email',
    emailValue,
    infoSummary: '',
    supportHours: 'Mon-Fri, 9 AM - 6 PM',
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
