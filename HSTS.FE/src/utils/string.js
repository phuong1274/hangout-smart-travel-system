/**
 * Capitalizes the first letter of a string.
 * @param {string} str 
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncates a string if it's longer than a certain length.
 * @param {string} str 
 * @param {number} length 
 * @param {string} suffix 
 * @returns {string}
 */
export const truncate = (str, length = 30, suffix = '...') => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};
