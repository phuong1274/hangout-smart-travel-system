/**
 * Location Management - Mapping Utilities
 * Reusable functions to transform IDs to readable names for display
 */

import { SOCIAL_PLATFORMS } from './locationConstants';

/**
 * Map tag IDs to tag name objects
 * @param {number[]} tagIds - Array of tag IDs
 * @param {Array} allTags - Array of all tags with {id, name}
 * @returns {Array<{id: number, name: string}>} Array of tag objects
 */
export const mapTagIdsToObjects = (tagIds, allTags) => {
  if (!tagIds || !Array.isArray(tagIds)) return [];
  if (!allTags || !Array.isArray(allTags)) return tagIds.map(id => ({ id, name: String(id) }));

  return tagIds.map(id => {
    const tag = allTags.find(t => t.id === id);
    return tag ? { id: tag.id, name: tag.name } : { id, name: String(id) };
  });
};

/**
 * Map amenity IDs to amenity name objects
 * @param {number[]} amenityIds - Array of amenity IDs
 * @param {Array} amenities - Array of amenities with {id, name}
 * @returns {Array<{id: number, name: string}>} Array of amenity objects
 */
export const mapAmenityIdsToObjects = (amenityIds, amenities) => {
  if (!amenityIds || !Array.isArray(amenityIds)) return [];
  if (!amenities || !Array.isArray(amenities)) return amenityIds.map(id => ({ id, name: String(id) }));

  return amenityIds.map(id => {
    const amenity = amenities.find(a => a.id === id);
    return amenity ? { id: amenity.id, name: amenity.name } : { id, name: String(id) };
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

  // Handle both camelCase and PascalCase from backend
  const tagIds = data.tagIds || data.TagIds || [];
  const amenityIds = data.amenityIds || data.AmenityIds || [];
  const locationTypeId = data.locationTypeId ?? data.LocationTypeId;

  // Check if backend already returns structured tags/amenities
  const hasStructuredTags = data.tags && Array.isArray(data.tags) && data.tags.length > 0 && data.tags[0].id !== undefined;
  const hasStructuredAmenities = data.amenities && Array.isArray(data.amenities) && data.amenities.length > 0 && data.amenities[0].id !== undefined;

  return {
    ...data,
    // Use structured tags if available, otherwise fall back to mapping IDs
    tags: hasStructuredTags ? data.tags : mapTagIdsToObjects(tagIds, allTags),
    // Use structured amenities if available, otherwise fall back to mapping IDs
    amenities: hasStructuredAmenities ? data.amenities : mapAmenityIdsToObjects(amenityIds, amenities),
    // Map location type ID to name
    locationTypeName: mapLocationTypeIdToName(locationTypeId, locationTypes),
    // Map social link platforms to names
    socialLinks: (data.socialLinks || data.SocialLinks || []).map(sl => ({
      ...sl,
      platformName: mapPlatformEnumToName(sl.platform ?? sl.Platform)
    }))
  };
};
