/**
 * Location Management - Mapping Utilities
 * Reusable functions to transform IDs to readable names for display
 */

import { SOCIAL_PLATFORMS } from './locationConstants';

/**
 * Map tag IDs to tag names
 * @param {number[]} tagIds - Array of tag IDs
 * @param {Array} allTags - Array of all tags (root + child) with {id, name}
 * @returns {string[]} Array of tag names (or ID as fallback)
 */
export const mapTagIdsToNames = (tagIds, allTags) => {
  if (!tagIds || !Array.isArray(tagIds)) return [];
  if (!allTags || !Array.isArray(allTags)) return tagIds.map(String);
  
  return tagIds.map(id => {
    const tag = allTags.find(t => t.id === id);
    return tag ? tag.name : String(id);
  });
};

/**
 * Map amenity IDs to amenity names
 * @param {number[]} amenityIds - Array of amenity IDs
 * @param {Array} amenities - Array of amenities with {id, name}
 * @returns {string[]} Array of amenity names (or ID as fallback)
 */
export const mapAmenityIdsToNames = (amenityIds, amenities) => {
  if (!amenityIds || !Array.isArray(amenityIds)) return [];
  if (!amenities || !Array.isArray(amenities)) return amenityIds.map(String);
  
  return amenityIds.map(id => {
    const amenity = amenities.find(a => a.id === id);
    return amenity ? amenity.name : String(id);
  });
};

/**
 * Map location type ID to name
 * @param {number} id - Location type ID
 * @param {Array} locationTypes - Array of location types with {id, name}
 * @returns {string} Location type name (or ID as fallback)
 */
export const mapLocationTypeIdToName = (id, locationTypes) => {
  if (!id) return 'N/A';
  if (!locationTypes || !Array.isArray(locationTypes)) return String(id);
  
  const locationType = locationTypes.find(t => t.id === id);
  return locationType ? locationType.name : String(id);
};

/**
 * Map platform enum number to readable name
 * @param {number} platform - Platform enum value (e.g., 1, 2, 3)
 * @param {Array} socialPlatforms - SOCIAL_PLATFORMS array
 * @returns {string} Platform name (e.g., "Facebook", "Instagram")
 */
export const mapPlatformEnumToName = (platform, socialPlatforms = SOCIAL_PLATFORMS) => {
  if (!platform) return 'Unknown';
  
  const platformObj = socialPlatforms.find(p => p.enumValue === platform);
  return platformObj ? platformObj.label : String(platform);
};

/**
 * Transform location data for display in DetailModal
 * @param {Object} data - Raw location data from API
 * @param {Object} referenceData - { allTags, amenities, locationTypes }
 * @returns {Object} Transformed data with readable names
 */
export const transformLocationForDisplay = (data, referenceData) => {
  if (!data) return null;
  
  const { allTags = [], amenities = [], locationTypes = [] } = referenceData;
  
  return {
    ...data,
    // Map tag IDs to names
    tagNames: mapTagIdsToNames(data.tagIds, allTags),
    // Map amenity IDs to names
    amenityNames: mapAmenityIdsToNames(data.amenityIds, amenities),
    // Map location type ID to name
    locationTypeName: mapLocationTypeIdToName(data.locationTypeId, locationTypes),
    // Map social link platforms to names
    socialLinks: (data.socialLinks || []).map(sl => ({
      ...sl,
      platformName: mapPlatformEnumToName(sl.platform)
    }))
  };
};
