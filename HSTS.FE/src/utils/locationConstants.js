/**
 * Location Management - Constants
 * Shared constants for location-related components
 */

// Platform options for social links (matching backend enum values)
export const SOCIAL_PLATFORMS = [
  { value: 'Facebook', label: 'Facebook', enumValue: 1 },
  { value: 'Instagram', label: 'Instagram', enumValue: 2 },
  { value: 'TikTok', label: 'TikTok', enumValue: 5 },
  { value: 'Twitter', label: 'Twitter/X', enumValue: 3 },
  { value: 'Website', label: 'Official Website', enumValue: 13 },
  { value: 'YouTube', label: 'YouTube', enumValue: 4 },
  { value: 'Zalo', label: 'Zalo', enumValue: 12 },
  { value: 'Other', label: 'Other', enumValue: 14 }
];

// Month mapping for seasons display (abbreviated)
export const MONTH_NAMES = {
  '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr',
  '5': 'May', '6': 'Jun', '7': 'Jul', '8': 'Aug',
  '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
};

// Month options for Select component (full names)
export const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

// Days of week mapping
export const DAYS_OF_WEEK = [
  { value: 7, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];
