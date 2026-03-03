export const REQUIRED_FIELD_KEYS = [
  'businessName',
  'shortDescription',
  'callValue',
  'websiteValue',
  'emailValue',
  'privacyPolicyUrl',
  'termsOfServicesUrl',
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

const DEFAULT_OPTION_LABELS = ['Notification', 'Block & report spam'];

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
    notificationEnabled: true,
    blockReportSpamEnabled: true,
    privacyPolicyUrl: '',
    termsOfServicesUrl: '',
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
  const enabledOptions = [...DEFAULT_OPTION_LABELS];

  if (sanitizeValue(form.privacyPolicyUrl)) {
    enabledOptions.push('View Privacy Policy');
  }

  if (sanitizeValue(form.termsOfServicesUrl)) {
    enabledOptions.push('View Terms of Services');
  }

  return enabledOptions;
}
