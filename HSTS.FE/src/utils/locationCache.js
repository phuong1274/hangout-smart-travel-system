/**
 * Location Reference Data Cache
 * Centralized cache for tags, location types, and amenities
 * Prevents duplicate API calls across components
 */

import { getRootTagsApi, getChildTagsApi } from '@/features/tags/api';
import { getAllLocationTypesApi, getAllAmenitiesApi } from '@/features/locations/api';

// Cache storage
const cache = {
  allTags: null,
  locationTypes: null,
  amenities: null,
  lastFetch: null,
  isLoading: false,
  isInitialized: false
};

// Cache validity: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Check if cache is valid (not expired)
 */
const isCacheValid = () => {
  if (!cache.lastFetch) return false;
  return Date.now() - cache.lastFetch < CACHE_TTL;
};

/**
 * Fetch all reference data (root tags + child tags + location types + amenities)
 * Called once and cached for reuse
 */
export const fetchReferenceData = async (forceRefresh = false) => {
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && cache.isInitialized && isCacheValid()) {
    return {
      allTags: cache.allTags,
      locationTypes: cache.locationTypes,
      amenities: cache.amenities
    };
  }

  // Prevent duplicate concurrent requests
  if (cache.isLoading && !forceRefresh) {
    // Wait for existing request to complete
    while (cache.isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return {
      allTags: cache.allTags,
      locationTypes: cache.locationTypes,
      amenities: cache.amenities
    };
  }

  cache.isLoading = true;

  try {
    // Fetch all data in parallel
    const [rootTagsRes, locationTypesRes, amenitiesRes] = await Promise.all([
      getRootTagsApi(),
      getAllLocationTypesApi(),
      getAllAmenitiesApi()
    ]);

    // Extract items from paginated responses
    const rootTags = Array.isArray(rootTagsRes) ? rootTagsRes : (rootTagsRes?.items || []);
    const locationTypes = Array.isArray(locationTypesRes) ? locationTypesRes : (locationTypesRes?.items || []);
    const amenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);

    // Fetch child tags for each root tag
    const childTagsPromises = rootTags.map(rootTag => getChildTagsApi(rootTag.id));
    const childTagsResults = await Promise.all(childTagsPromises);

    // Flatten and deduplicate child tags
    const childTags = childTagsResults.flatMap(res => {
      const tags = Array.isArray(res) ? res : (res?.items || []);
      return tags;
    });

    // Remove duplicate child tags (same ID might appear under multiple roots)
    const uniqueChildTags = childTags.filter(
      (tag, index, self) => index === self.findIndex(t => t.id === tag.id)
    );

    // Combine root and child tags
    const allTags = [...rootTags, ...uniqueChildTags];

    // Update cache
    cache.allTags = allTags;
    cache.locationTypes = locationTypes;
    cache.amenities = amenities;
    cache.lastFetch = Date.now();
    cache.isInitialized = true;

    return { allTags, locationTypes, amenities };
  } catch (error) {
    console.error('Failed to fetch reference data:', error);
    throw error;
  } finally {
    cache.isLoading = false;
  }
};

/**
 * Get cached data synchronously (returns null if not initialized)
 */
export const getCachedReferenceData = () => {
  if (!cache.isInitialized) return null;
  return {
    allTags: cache.allTags,
    locationTypes: cache.locationTypes,
    amenities: cache.amenities
  };
};

/**
 * Invalidate cache (force refresh on next fetch)
 */
export const invalidateReferenceDataCache = () => {
  cache.lastFetch = null;
  cache.isInitialized = false;
};

/**
 * Get cache status for debugging
 */
export const getCacheStatus = () => ({
  isInitialized: cache.isInitialized,
  isLoading: cache.isLoading,
  lastFetch: cache.lastFetch,
  isValid: isCacheValid()
});

export default {
  fetchReferenceData,
  getCachedReferenceData,
  invalidateReferenceDataCache,
  getCacheStatus
};
