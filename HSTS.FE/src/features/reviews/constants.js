export const REVIEW_REPORT_REASONS = [
  { value: 0, label: 'Spam' },
  { value: 1, label: 'Offensive language' },
  { value: 2, label: 'False information' },
  { value: 3, label: 'Irrelevant content' },
  { value: 4, label: 'Other' },
];

export const REVIEW_STATUS = {
  VISIBLE: 0,
  HIDDEN: 1,
  DELETED: 2,
};

export const REVIEW_STATUS_LABELS = {
  [REVIEW_STATUS.VISIBLE]: 'Visible',
  [REVIEW_STATUS.HIDDEN]: 'Hidden',
  [REVIEW_STATUS.DELETED]: 'Deleted',
  Visible: 'Visible',
  Hidden: 'Hidden',
  Deleted: 'Deleted',
};

export const REVIEW_STATUS_COLORS = {
  [REVIEW_STATUS.VISIBLE]: 'blue',
  [REVIEW_STATUS.HIDDEN]: 'orange',
  [REVIEW_STATUS.DELETED]: 'red',
  Visible: 'blue',
  Hidden: 'orange',
  Deleted: 'red',
};

export const REVIEW_REPORT_STATUS = {
  PENDING: 0,
  IGNORED: 1,
  RESOLVED: 2,
};

export const REVIEW_REPORT_STATUS_LABELS = {
  [REVIEW_REPORT_STATUS.PENDING]: 'Pending',
  [REVIEW_REPORT_STATUS.IGNORED]: 'Ignored',
  [REVIEW_REPORT_STATUS.RESOLVED]: 'Resolved',
  Pending: 'Pending',
  Ignored: 'Ignored',
  Resolved: 'Resolved',
};

export const REVIEW_REPORT_STATUS_COLORS = {
  [REVIEW_REPORT_STATUS.PENDING]: 'gold',
  [REVIEW_REPORT_STATUS.IGNORED]: 'default',
  [REVIEW_REPORT_STATUS.RESOLVED]: 'green',
  Pending: 'gold',
  Ignored: 'default',
  Resolved: 'green',
};

export const REVIEW_REPORT_REASON_LABELS = REVIEW_REPORT_REASONS.reduce(
  (labels, reason) => ({ ...labels, [reason.value]: reason.label }),
  {},
);

export const getReviewStatusLabel = (status) =>
  REVIEW_STATUS_LABELS[status] ?? `Unknown (${status})`;

export const getReviewStatusColor = (status) =>
  REVIEW_STATUS_COLORS[status] ?? 'default';

export const getReviewReportStatusLabel = (status) =>
  REVIEW_REPORT_STATUS_LABELS[status] ?? `Unknown (${status})`;

export const getReviewReportStatusColor = (status) =>
  REVIEW_REPORT_STATUS_COLORS[status] ?? 'default';

export const getReviewReportReasonLabel = (reason) =>
  REVIEW_REPORT_REASON_LABELS[reason] ?? reason;
