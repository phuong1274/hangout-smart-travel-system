import { TOKEN_KEY } from '@/config/constants';

/**
 * Stores the authentication token in local storage.
 * @param {string} token 
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Retrieves the authentication token from local storage.
 * @returns {string|null}
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Removes the authentication token from local storage.
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};
