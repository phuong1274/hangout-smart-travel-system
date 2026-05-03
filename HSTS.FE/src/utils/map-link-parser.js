/**
 * Map Link Parser Utility
 * Extracts location data from Google Maps and Apple Maps share URLs
 */

import apiClient from '@/lib/axios';

/**
 * Parse a map share URL and extract location data.
 * For short links (maps.app.goo.gl), returns needsServerResolution=true.
 * For direct URLs, parses client-side.
 *
 * @param {string} url - The map URL to parse
 * @returns {Object|null} - { lat, lng, address, name, needsServerResolution } or null
 */
export const parseMapLink = (url) => {
  if (!url || typeof url !== 'string') return null;

  const trimmedUrl = url.trim();

  // Apple Maps URL pattern
  if (trimmedUrl.includes('maps.apple.com')) {
    return parseAppleMapsUrl(trimmedUrl);
  }

  // Google Maps full URL patterns
  if (trimmedUrl.includes('google.com/maps')) {
    return parseGoogleMapsUrl(trimmedUrl);
  }

  // Google Maps search URL
  if (trimmedUrl.includes('maps.google.com')) {
    return parseGoogleMapsSearchUrl(trimmedUrl);
  }

  // Short links require server resolution
  if (isShortLink(trimmedUrl)) {
    return { needsServerResolution: true };
  }

  return null;
};

/**
 * Check if URL is a short link requiring server resolution
 *
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export const isShortLink = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps');
};

/**
 * Resolve a short link via backend endpoint.
 *
 * @param {string} url - The short URL to resolve
 * @returns {Promise<Object|null>} - { latitude, longitude, address, name } or null
 */
export const resolveShortLink = async (url) => {
  try {
    const res = await apiClient.post('/api/maps/resolve-link', { url });
    return res.data; // { latitude, longitude, address, name }
  } catch (error) {
    console.error('Failed to resolve short link:', error);
    return null;
  }
};

/**
 * Parse Apple Maps URL
 * Expected format: https://maps.apple.com/?address=...&coordinate=lat,lng&name=...
 *
 * @param {string} url - Apple Maps URL
 * @returns {Object|null} - { lat, lng, address, name } or null
 */
function parseAppleMapsUrl(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const result = {};

    // Parse coordinate (lat,lng format)
    const coordinate = params.get('coordinate');
    if (coordinate) {
      const [lat, lng] = coordinate.split(',').map(coord => parseFloat(coord.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        result.lat = lat;
        result.lng = lng;
      }
    }

    // Parse address
    const address = params.get('address');
    if (address) {
      result.address = decodeURIComponent(address);
    }

    // Parse name
    const name = params.get('name');
    if (name) {
      result.name = decodeURIComponent(name);
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error('Error parsing Apple Maps URL:', error);
    return null;
  }
}

/**
 * Parse Google Maps full URL
 * Expected formats:
 * - https://www.google.com/maps/place/.../@lat,lng,...
 * - https://www.google.com/maps/place/.../data=!4m13!4m12!1m3!1d...!2d...!3d...
 *
 * @param {string} url - Google Maps URL
 * @returns {Object|null} - { lat, lng, address, name } or null
 */
function parseGoogleMapsUrl(url) {
  try {
    const result = {};

    // Extract place name from /place/ segment
    const placeMatch = url.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      result.name = decodeGoogleMapsName(placeMatch[1]);
    }

    // Extract coordinates from @lat,lng pattern
    const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordsMatch) {
      result.lat = parseFloat(coordsMatch[1]);
      result.lng = parseFloat(coordsMatch[2]);
    }

    // Fallback: try to extract from data= segment (!3d{lat}!4d{lng})
    if (!result.lat || !result.lng) {
      const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dataMatch) {
        result.lat = parseFloat(dataMatch[1]);
        result.lng = parseFloat(dataMatch[2]);
      }
    }

    // Extract address from q parameter if present
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      const q = params.get('q');
      if (q) {
        result.address = decodeURIComponent(q);
      }
    } catch {
      // URL parsing failed, continue without address
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error);
    return null;
  }
}

/**
 * Parse Google Maps search URL
 * Expected format: https://maps.google.com/?q=address+or+name
 *
 * @param {string} url - Google Maps search URL
 * @returns {Object|null} - { lat, lng, address, name } or null
 */
function parseGoogleMapsSearchUrl(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    const result = {};

    // Get query parameter (usually contains address or place name)
    const q = params.get('q');
    if (q) {
      const decoded = decodeURIComponent(q);
      // For search URLs, treat q as address (it could be name or address)
      result.address = decoded;
    }

    // Check if URL contains coordinates in path
    const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordsMatch) {
      result.lat = parseFloat(coordsMatch[1]);
      result.lng = parseFloat(coordsMatch[2]);
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    console.error('Error parsing Google Maps search URL:', error);
    return null;
  }
}

/**
 * Decode Google Maps place name
 * Handles URL encoding and replaces + with space
 *
 * @param {string} name - Encoded name
 * @returns {string} - Decoded name
 */
function decodeGoogleMapsName(name) {
  if (!name) return '';
  return decodeURIComponent(name.replace(/\+/g, ' '));
}
