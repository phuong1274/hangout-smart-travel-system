import React, { useEffect, useState } from 'react';
import { Descriptions, Tag, Divider } from 'antd';
import { SubmissionStatus } from '../types';
import { getAllTagsApi, getAllAmenitiesApi } from '../api';
import { getAllLocationTypesApi, getAllDistrictsApi } from '@/features/locations/api';
import { buildTagHierarchy } from '@/utils/locationCache';
import { DAYS_OF_WEEK } from '@/utils/locationConstants';

/**
 * Component to display before/after comparison with color highlighting
 * Red = old value that changed
 * Green = new value
 * No highlight = unchanged
 */
const BeforeAfterComparison = ({ submission }) => {
  const isEditExisting = submission.submissionType === 1;
  const proposedChanges = submission.proposedChanges || {};

  // Get existing location data (for edits) or empty object (for new)
  const existingLocation = submission.existingLocation || {};

  // Lookup data for converting IDs to names
  const [tags, setTags] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [tagsRes, amenitiesRes, typesRes, districtsRes] = await Promise.all([
          getAllTagsApi({ pageSize: 9999 }),
          getAllAmenitiesApi(),
          getAllLocationTypesApi(),
          getAllDistrictsApi()
        ]);

        const allTags = Array.isArray(tagsRes) ? tagsRes : (tagsRes?.items || []);
        const allAmenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);
        const allTypes = Array.isArray(typesRes) ? typesRes : (typesRes?.items || []);
        const allDistricts = Array.isArray(districtsRes) ? districtsRes : (districtsRes?.items || []);

        setTags(allTags);
        setAmenities(allAmenities);
        setLocationTypes(allTypes);
        setDistricts(allDistricts);
      } catch (error) {
        console.error('Failed to fetch lookup data:', error);
      }
    };
    fetchLookupData();
  }, []);

  // Helper to convert array of IDs or objects to names
  const getTagNames = (tagData) => {
    if (!tagData) return 'None';
    
    // If it's an array of objects with id and name
    if (Array.isArray(tagData) && tagData.length > 0 && typeof tagData[0] === 'object' && tagData[0].name) {
      return tagData.map(t => t.name);
    }
    
    // If it's an array of IDs, look up names
    if (Array.isArray(tagData) && tagData.length > 0) {
      return tagData.map(id => {
        const tag = tags.find(t => t.id === id);
        return tag ? tag.name : `Tag #${id}`;
      });
    }
    
    return 'None';
  };

  const getAmenityNames = (amenityData) => {
    if (!amenityData) return 'None';
    
    // If it's an array of objects with id and name
    if (Array.isArray(amenityData) && amenityData.length > 0 && typeof amenityData[0] === 'object' && amenityData[0].name) {
      return amenityData.map(a => a.name);
    }
    
    // If it's an array of IDs, look up names
    if (Array.isArray(amenityData) && amenityData.length > 0) {
      return amenityData.map(id => {
        const amenity = amenities.find(a => a.id === id);
        return amenity ? amenity.name : `Amenity #${id}`;
      });
    }
    
    return 'None';
  };

  const getLocationTypeName = (typeId) => {
    if (!typeId) return 'None';
    const type = locationTypes.find(t => t.id === typeId);
    return type ? type.name : `Type #${typeId}`;
  };

  const getDistrictName = (districtId) => {
    if (!districtId) return 'None';
    const district = districts.find(d => d.id === districtId);
    return district ? district.name : `District #${districtId}`;
  };

  // Helper to normalize opening hours - ensure both have dayName
  const normalizeOpeningHours = (hours) => {
    if (!hours || !Array.isArray(hours) || hours.length === 0) return [];
    
    return hours.map(oh => {
      // Get day name from dayOfWeek if dayName is missing
      const dayOfWeek = oh.dayOfWeek ?? oh.DayOfWeek;
      const dayName = oh.dayName || oh.DayName || 
        (DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || `Day ${dayOfWeek}`);
      
      return {
        dayOfWeek: dayOfWeek,
        dayName: dayName,
        openTime: oh.openTime || oh.OpenTime || '',
        closeTime: oh.closeTime || oh.CloseTime || '',
        note: oh.note || oh.Note || ''
      };
    }).sort((a, b) => a.dayOfWeek - b.dayOfWeek); // Sort by day of week for consistent comparison
  };

  const formatSocialLinks = (socialLinks) => {
    if (!socialLinks || !Array.isArray(socialLinks) || socialLinks.length === 0) return 'None';
    
    return socialLinks.map((link, i) => {
      // Platform could be enum number or we need to look it up
      const platformNames = {
        1: 'Facebook',
        2: 'Instagram',
        3: 'Twitter',
        4: 'YouTube',
        5: 'TikTok',
        12: 'Zalo',
        13: 'Website',
        14: 'Other'
      };
      const platformName = link.platformName || platformNames[link.platform] || `Platform ${link.platform}`;
      return `${platformName}: ${link.url}`;
    }).join(', ');
  };
  
  // Normalize values before comparison to avoid false diffs
  const normalizeValue = (value, fieldName) => {
    // Convert null/undefined/empty array to null for consistency
    if (value === null || value === undefined) {
      return null;
    }

    // Normalize arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return null; // Empty array → null

      // For opening hours, normalize day names and sort by dayOfWeek
      if (fieldName === 'openingHours' && typeof value[0] === 'object') {
        return value
          .map(oh => {
            const dayOfWeek = oh.dayOfWeek ?? oh.DayOfWeek;
            const dayName = oh.dayName || oh.DayName || 
              (DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || `Day ${dayOfWeek}`);
            return {
              dayOfWeek: dayOfWeek,
              dayName: dayName,
              openTime: (oh.openTime || oh.OpenTime || '').trim(),
              closeTime: (oh.closeTime || oh.CloseTime || '').trim(),
              note: (oh.note || oh.Note || '').trim()
            };
          })
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }

      // For social links, only compare platform and url (ignore id)
      if (fieldName === 'socialLinks' && typeof value[0] === 'object') {
        return value
          .map(item => ({
            platform: Number(item.platform || 0),
            url: (item.url || '').toLowerCase().trim()
          }))
          .sort((a, b) => a.platform - b.platform || a.url.localeCompare(b.url));
      }
      
      // For objects in arrays (like tags, amenities), normalize to a consistent format
      if (typeof value[0] === 'object' && value[0] !== null) {
        // Normalize and sort by ID if available
        return value
          .map(item => {
            const normalized = { ...item };
            // Normalize platform to number for social links
            if (normalized.platform !== undefined) {
              normalized.platform = Number(normalized.platform);
            }
            // Normalize URL to lowercase for comparison
            if (normalized.url && typeof normalized.url === 'string') {
              normalized.url = normalized.url.toLowerCase().trim();
            }
            return normalized;
          })
          .sort((a, b) => {
            if (a.id && b.id) return a.id - b.id;
            if (a.name && b.name) return a.name.localeCompare(b.name);
            if (a.platform && b.platform) return a.platform - b.platform;
            return 0;
          });
      }
      
      // For simple arrays (IDs, strings), sort them
      return [...value].sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      });
    }
    
    // Normalize empty strings to null
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }
    
    // For numbers, ensure consistent type
    if (typeof value === 'number') {
      return value;
    }
    
    return value;
  };

  // Helper to check if field changed and render with highlighting
  const renderField = (label, fieldName, oldValue, newValue, formatFn) => {
    // Normalize both values before comparison
    const normalizedOld = normalizeValue(oldValue, fieldName);
    const normalizedNew = normalizeValue(newValue, fieldName);
    
    // Compare normalized values
    const hasChanged = JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew);

    const oldDisplay = formatFn ? formatFn(oldValue) : oldValue;
    const newDisplay = formatFn ? formatFn(newValue) : newValue;

    return (
      <Descriptions.Item label={label} span={isEditExisting ? 1 : 2}>
        {isEditExisting ? (
          <div style={{ display: 'flex', gap: '16px' }}>
            {hasChanged ? (
              <>
                <div style={{ flex: 1, padding: '4px 8px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
                  <span style={{ color: '#cf1322', fontSize: '12px' }}>BEFORE:</span>
                  <div style={{ color: '#cf1322', fontWeight: 500 }}>
                    {formatValue(oldDisplay !== oldValue ? oldDisplay : oldValue)}
                  </div>
                </div>
                <div style={{ flex: 1, padding: '4px 8px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                  <span style={{ color: '#389e0d', fontSize: '12px' }}>AFTER:</span>
                  <div style={{ color: '#389e0d', fontWeight: 500 }}>
                    {formatValue(newDisplay !== newValue ? newDisplay : newValue)}
                  </div>
                </div>
              </>
            ) : (
              <div>{formatValue(oldDisplay !== oldValue ? oldDisplay : oldValue)}</div>
            )}
          </div>
        ) : (
          <div>{formatValue(newDisplay !== newValue ? newDisplay : newValue)}</div>
        )}
      </Descriptions.Item>
    );
  };
  
  // Format values for display - consistent empty value representation
  const formatValue = (value) => {
    // Use "None" consistently for empty values (not "N/A")
    if (value === null || value === undefined) return 'None';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      if (typeof value[0] === 'object') {
        return value.map((item, i) => (
          <Tag key={i} style={{ marginBottom: '4px' }}>
            {item.platform ? `${item.platform}: ${item.url}` : item.name || item}
          </Tag>
        ));
      }
      return value.map((v, i) => <Tag key={i}>{v}</Tag>);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };
  
  // Get new values from submission
  const getNewValue = (fieldName) => {
    // Map frontend field names to backend field names
    const fieldMap = {
      id: 'Id',
      name: 'Name',
      description: 'Description',
      latitude: 'Latitude',
      longitude: 'Longitude',
      address: 'Address',
      telephone: 'Telephone',
      email: 'Email',
      ticketPrice: 'TicketPrice',
      minimumAge: 'MinimumAge',
      recommendedDurationMinutes: 'RecommendedDurationMinutes',
      priceMinUsd: 'PriceMinUsd',
      priceMaxUsd: 'PriceMaxUsd',
      score: 'Score',
      destinationId: 'DestinationId',
      districtId: 'DistrictId',
      locationTypeId: 'LocationTypeId',
      amenityIds: 'AmenityIds',
      tags: 'Tags',
      tagIds: 'TagIds',
      mediaLinks: 'MediaLinks',
      socialLinks: 'SocialLinks',
      openingHours: 'OpeningHours',
      seasons: 'Seasons',
    };

    const backendFieldName = fieldMap[fieldName];
    return proposedChanges[backendFieldName] ?? submission[fieldName];
  };

  // Get old values from existing location
  const getOldValue = (fieldName) => {
    return existingLocation[fieldName];
  };

  // Get tags - prefer structured array over IDs
  const getTagsForComparison = () => {
    // Try structured array first
    const newTags = submission.tags || submission.TagIds;
    const oldTags = existingLocation.tags || existingLocation.TagIds;
    return { newTags, oldTags };
  };

  // Get amenities - prefer structured array over IDs
  const getAmenitiesForComparison = () => {
    // Try structured array first (existing location has it, submission might not)
    const newAmenities = submission.amenityIds;
    const oldAmenities = existingLocation.amenityIds || existingLocation.amenities;
    return { newAmenities, oldAmenities };
  };
  
  return (
    <div>
      <Descriptions title={isEditExisting ? "Comparison View (Red = Old, Green = New)" : "New Location Details"} bordered column={isEditExisting ? 1 : 2}>
        {/* Basic Information */}
        {renderField('ID', 'id', getOldValue('id'), getNewValue('id'))}
        {renderField('Name', 'name', getOldValue('name'), getNewValue('name'))}
        {renderField('Description', 'description', getOldValue('description'), getNewValue('description'))}

        {/* Location Type & District */}
        {renderField('Location Type', 'locationTypeId', getOldValue('locationTypeId'), getNewValue('locationTypeId'), getLocationTypeName)}
        {renderField('District', 'districtId', getOldValue('districtId'), getNewValue('districtId'), getDistrictName)}

        {/* Address & Coordinates */}
        {renderField('Address', 'address', getOldValue('address'), getNewValue('address'))}
        {renderField('Latitude', 'latitude', getOldValue('latitude'), getNewValue('latitude'))}
        {renderField('Longitude', 'longitude', getOldValue('longitude'), getNewValue('longitude'))}

        {/* Pricing */}
        {renderField('Ticket Price', 'ticketPrice', getOldValue('ticketPrice'), getNewValue('ticketPrice'), (val) => {
          if (val === null || val === undefined) return 'None';
          return val > 0 ? `$${Number(val).toFixed(2)}` : 'Free';
        })}
        {renderField('Min Price (USD)', 'priceMinUsd', getOldValue('priceMinUsd'), getNewValue('priceMinUsd'), (val) => {
          if (val === null || val === undefined) return 'None';
          return `$${Number(val).toFixed(2)}`;
        })}
        {renderField('Max Price (USD)', 'priceMaxUsd', getOldValue('priceMaxUsd'), getNewValue('priceMaxUsd'), (val) => {
          if (val === null || val === undefined) return 'None';
          return `$${Number(val).toFixed(2)}`;
        })}

        {/* Additional Info */}
        {renderField('Minimum Age', 'minimumAge', getOldValue('minimumAge'), getNewValue('minimumAge'), (val) => {
          if (val === null || val === undefined) return 'None';
          return `${val}+`;
        })}
        {renderField('Recommended Duration', 'recommendedDurationMinutes', getOldValue('recommendedDurationMinutes'), getNewValue('recommendedDurationMinutes'), (val) => {
          if (val === null || val === undefined) return 'None';
          return `${val} min`;
        })}
        {renderField('Score', 'score', getOldValue('score'), getNewValue('score'), (val) => {
          if (val === null || val === undefined) return 'None';
          return `${val} / 5`;
        })}

        {/* Contact Information */}
        {renderField('Telephone', 'telephone', getOldValue('telephone'), getNewValue('telephone'))}
        {renderField('Email', 'email', getOldValue('email'), getNewValue('email'))}

        {/* Tags & Amenities */}
        {(() => {
          const { newTags, oldTags } = getTagsForComparison();
          return renderField('Tags', 'tags', oldTags, newTags, getTagNames);
        })()}
        {(() => {
          const { newAmenities, oldAmenities } = getAmenitiesForComparison();
          return renderField('Amenities', 'amenities', oldAmenities, newAmenities, getAmenityNames);
        })()}

        {/* Media & Social */}
        {renderField('Media Links', 'mediaLinks', getOldValue('mediaLinks'), getNewValue('mediaLinks'))}
        {renderField('Social Links', 'socialLinks', getOldValue('socialLinks'), getNewValue('socialLinks'), formatSocialLinks)}

        {/* Opening Hours */}
        {(() => {
          const newHours = normalizeOpeningHours(submission.openingHours);
          const oldHours = normalizeOpeningHours(existingLocation.openingHours);
          return renderField('Opening Hours', 'openingHours', oldHours, newHours, (hours) => {
            if (!hours || !Array.isArray(hours) || hours.length === 0) return 'None';
            return hours.map(oh => `${oh.dayName}: ${oh.openTime} - ${oh.closeTime}`).join(', ');
          });
        })()}

        {/* Seasons */}
        {(() => {
          const newSeasons = submission.seasons || [];
          const oldSeasons = existingLocation.seasons || [];
          return renderField('Best Seasons', 'seasons', oldSeasons, newSeasons, (seasons) => {
            if (!seasons || !Array.isArray(seasons) || seasons.length === 0) return 'None';
            return seasons.map(s => s.description || s.Description).join(', ');
          });
        })()}
      </Descriptions>
      
      {/* Submission Info */}
      <Divider orientation="left">Submission Information</Divider>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Submitted By">User #{submission.userId}</Descriptions.Item>
        <Descriptions.Item label="Submitted At">
          {new Date(submission.createdAt).toLocaleString()}
        </Descriptions.Item>
        {submission.reviewedBy && (
          <>
            <Descriptions.Item label="Reviewed By">{submission.reviewedBy}</Descriptions.Item>
            <Descriptions.Item label="Reviewed At">
              {submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>
      
      {/* Rejection Reason */}
      {submission.rejectionReason && (
        <>
          <Divider orientation="left">Rejection Reason</Divider>
          <div style={{ padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', color: '#cf1322', borderRadius: '4px' }}>
            {submission.rejectionReason}
          </div>
        </>
      )}
      
      {/* Approval Info */}
      {submission.status === SubmissionStatus.Approved && (
        <>
          <Divider orientation="left">Approval Information</Divider>
          <div style={{ padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d', borderRadius: '4px' }}>
            <strong>✓ Location {submission.submissionType === 0 ? 'Created' : 'Updated'}</strong>
            {submission.createdLocationId && (
              <div style={{ marginTop: '8px' }}>Location ID: {submission.createdLocationId}</div>
            )}
            {submission.existingLocationId && submission.submissionType === 1 && (
              <div style={{ marginTop: '8px' }}>Updated Location ID: {submission.existingLocationId}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BeforeAfterComparison;
