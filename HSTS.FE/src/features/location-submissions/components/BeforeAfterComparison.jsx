import React, { useEffect, useState } from 'react';
import { Descriptions, Tag, Divider } from 'antd';
import { SubmissionStatus } from '../types';
import { getAllTagsApi, getAllAmenitiesApi } from '../api';
import { getAllLocationTypesApi, getAllDistrictsApi } from '@/features/locations/api';
import { DAYS_OF_WEEK, MONTH_NAMES } from '@/utils/locationConstants';
import styles from '../styles/BeforeAfterComparison.module.css';

const BeforeAfterComparison = ({ submission }) => {
  const isEditExisting = submission.submissionType === 1;
  const proposedChanges = submission.proposedChanges || {};
  const existingLocation = submission.existingLocation || {};

  const [tags, setTags] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const [tagsRes, amenitiesRes, typesRes, districtsRes] = await Promise.all([
          getAllTagsApi({ pageSize: 9999 }),
          getAllAmenitiesApi({ pageSize: 9999 }),
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

  const getTagNames = (tagData) => {
    if (!tagData) return 'None';
    
    if (Array.isArray(tagData) && tagData.length > 0 && typeof tagData[0] === 'object' && tagData[0].name) {
      return tagData.map(t => t.name);
    }
    
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
    
    if (Array.isArray(amenityData) && amenityData.length > 0 && typeof amenityData[0] === 'object' && amenityData[0].name) {
      return amenityData.map(a => a.name);
    }
    
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

  const normalizeOpeningHours = (hours) => {
    if (!hours || !Array.isArray(hours) || hours.length === 0) return [];
    
    return hours.map(oh => {
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
    }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  };

  const formatSocialLinks = (socialLinks) => {
    if (!socialLinks || !Array.isArray(socialLinks) || socialLinks.length === 0) return 'None';
    
    return socialLinks.map((link, i) => {
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
  
  const normalizeValue = (value, fieldName) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return null;

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

      if (fieldName === 'socialLinks' && typeof value[0] === 'object') {
        return value
          .map(item => ({
            platform: Number(item.platform || 0),
            url: (item.url || '').toLowerCase().trim()
          }))
          .sort((a, b) => a.platform - b.platform || a.url.localeCompare(b.url));
      }
      
      if (typeof value[0] === 'object' && value[0] !== null) {
        return value
          .map(item => {
            const normalized = { ...item };
            if (normalized.platform !== undefined) {
              normalized.platform = Number(normalized.platform);
            }
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
      
      return [...value].sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      });
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    return value;
  };

  const renderField = (label, fieldName, oldValue, newValue, formatFn) => {
    const normalizedOld = normalizeValue(oldValue, fieldName);
    const normalizedNew = normalizeValue(newValue, fieldName);
    
    const hasChanged = JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew);

    const oldDisplay = formatFn ? formatFn(oldValue) : oldValue;
    const newDisplay = formatFn ? formatFn(newValue) : newValue;

    return (
      <Descriptions.Item label={label} span={isEditExisting ? 1 : 2}>
        {isEditExisting ? (
          <div className={styles.compareWrapper}>
            {hasChanged ? (
              <>
                <div className={styles.oldValueBox}>
                  <span className={styles.compareLabelOld}>BEFORE:</span>
                  <div className={styles.oldValueText}>
                    {formatValue(oldDisplay !== oldValue ? oldDisplay : oldValue)}
                  </div>
                </div>
                <div className={styles.newValueBox}>
                  <span className={styles.compareLabelNew}>AFTER:</span>
                  <div className={styles.newValueText}>
                    {formatValue(newDisplay !== newValue ? newDisplay : newValue)}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.unchangedText}>{formatValue(oldDisplay !== oldValue ? oldDisplay : oldValue)}</div>
            )}
          </div>
        ) : (
          <div className={styles.unchangedText}>{formatValue(newDisplay !== newValue ? newDisplay : newValue)}</div>
        )}
      </Descriptions.Item>
    );
  };
  
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'None';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None';
      if (typeof value[0] === 'object') {
        return value.map((item, i) => (
          <Tag key={i} className={styles.bouncyTagSmall}>
            {item.platform ? `${item.platform}: ${item.url}` : item.name || item}
          </Tag>
        ));
      }
      return value.map((v, i) => <Tag key={i} className={styles.bouncyTagSmall}>{v}</Tag>);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };
  
  const getNewValue = (fieldName) => {
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

  const getOldValue = (fieldName) => {
    return existingLocation[fieldName];
  };

  const getTagsForComparison = () => {
    const newTags = submission.tags || submission.TagIds;
    const oldTags = existingLocation.tags || existingLocation.TagIds;
    return { newTags, oldTags };
  };

  const getAmenitiesForComparison = () => {
    const newAmenities = submission.amenityIds;
    const oldAmenities = existingLocation.amenityIds || existingLocation.amenities;
    return { newAmenities, oldAmenities };
  };
  
  return (
    <div className={styles.comparisonContainer}>
      <Descriptions 
        title={<span className={styles.comparisonTitle}>{isEditExisting ? "Comparison View" : "New Location Details"}</span>} 
        bordered 
        column={isEditExisting ? 1 : 2}
        className={styles.tropicalDescriptions}
      >
        {renderField('ID', 'id', getOldValue('id'), getNewValue('id'))}
        {renderField('Name', 'name', getOldValue('name'), getNewValue('name'))}
        {renderField('Description', 'description', getOldValue('description'), getNewValue('description'))}

        {renderField('Location Type', 'locationTypeId', getOldValue('locationTypeId'), getNewValue('locationTypeId'), getLocationTypeName)}
        {renderField('District', 'districtId', getOldValue('districtId'), getNewValue('districtId'), getDistrictName)}

        {renderField('Address', 'address', getOldValue('address'), getNewValue('address'))}
        {renderField('Latitude', 'latitude', getOldValue('latitude'), getNewValue('latitude'))}
        {renderField('Longitude', 'longitude', getOldValue('longitude'), getNewValue('longitude'))}

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

        {renderField('Telephone', 'telephone', getOldValue('telephone'), getNewValue('telephone'))}
        {renderField('Email', 'email', getOldValue('email'), getNewValue('email'))}

        {(() => {
          const { newTags, oldTags } = getTagsForComparison();
          return renderField('Tags', 'tags', oldTags, newTags, getTagNames);
        })()}
        {(() => {
          const { newAmenities, oldAmenities } = getAmenitiesForComparison();
          return renderField('Amenities', 'amenities', oldAmenities, newAmenities, getAmenityNames);
        })()}

        {renderField('Media Links', 'mediaLinks', getOldValue('mediaLinks'), getNewValue('mediaLinks'))}
        {renderField('Social Links', 'socialLinks', getOldValue('socialLinks'), getNewValue('socialLinks'), formatSocialLinks)}

        {(() => {
          const newHours = normalizeOpeningHours(submission.openingHours);
          const oldHours = normalizeOpeningHours(existingLocation.openingHours);
          return renderField('Opening Hours', 'openingHours', oldHours, newHours, (hours) => {
            if (!hours || !Array.isArray(hours) || hours.length === 0) return 'None';
            return hours.map(oh => `${oh.dayName}: ${oh.openTime} - ${oh.closeTime}`).join(', ');
          });
        })()}

        {(() => {
          const newSeasons = submission.seasons || [];
          const oldSeasons = existingLocation.seasons || [];
          return renderField('Best Seasons', 'seasons', oldSeasons, newSeasons, (seasons) => {
            if (!seasons || !Array.isArray(seasons) || seasons.length === 0) return 'None';
            return seasons.map(s => {
              const desc = s.description || s.Description || 'Season';
              const monthsStr = s.months || s.Months || '';
              const months = typeof monthsStr === 'string' ? monthsStr.split(',').filter(m => m) : [];
              const monthNames = months.map(m => MONTH_NAMES[m] || m).join(', ');
              return `${desc} (${monthNames || 'N/A'})`;
            }).join('; ');
          });
        })()}
      </Descriptions>
      
      <Divider orientation="left" className={styles.tropicalDivider}>Submission Information</Divider>
      <Descriptions bordered column={2} className={styles.tropicalDescriptions}>
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
      
      {submission.rejectionReason && (
        <>
          <Divider orientation="left" className={styles.tropicalDivider}>Rejection Reason</Divider>
          <div className={styles.rejectionBoxMain}>
            {submission.rejectionReason}
          </div>
        </>
      )}
      
      {submission.status === SubmissionStatus.Approved && (
        <>
          <Divider orientation="left" className={styles.tropicalDivider}>Approval Information</Divider>
          <div className={styles.approvalBox}>
            <strong>✓ Location {submission.submissionType === 0 ? 'Created' : 'Updated'}</strong>
            {submission.createdLocationId && (
              <div className={styles.approvalId}>Location ID: {submission.createdLocationId}</div>
            )}
            {submission.existingLocationId && submission.submissionType === 1 && (
              <div className={styles.approvalId}>Updated Location ID: {submission.existingLocationId}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BeforeAfterComparison;