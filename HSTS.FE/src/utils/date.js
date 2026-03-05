/**
 * Formats a date string into a localized format.
 * @param {string|Date} date - The date to format.
 * @param {Object} options - Intl.DateTimeFormat options.
 * @returns {string} The formatted date or '-' if invalid.
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      ...options
    }).format(d);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};
