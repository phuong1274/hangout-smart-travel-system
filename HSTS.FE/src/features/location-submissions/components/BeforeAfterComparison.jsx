import React, { useEffect, useState } from 'react';
import { Descriptions, Tag, Divider } from 'antd';
import { SubmissionStatus } from '../types';
import { getAllTagsApi, getAllAmenitiesApi } from '../api';
import { getAllLocationTypesApi, getAllDistrictsApi } from '@/features/locations/api';
import { buildTagHierarchy } from '@/utils/locationCache';

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

  // Helper to convert array of IDs to names
  const getTagNames = (tagIds) => {
    if (!Array.isArray(tagIds)) return tagIds;
    return tagIds.map(id => {
      const tag = tags.find(t => t.id === id);
      return tag ? tag.name : `Tag #${id}`;
    });
  };

  const getAmenityNames = (amenityIds) => {
    if (!Array.isArray(amenityIds)) return amenityIds;
    return amenityIds.map(id => {
      const amenity = amenities.find(a => a.id === id);
      return amenity ? amenity.name : `Amenity #${id}`;
    });
  };

  const getLocationTypeName = (typeId) => {
    if (!typeId) return 'N/A';
    const type = locationTypes.find(t => t.id === typeId);
    return type ? type.name : `Type #${typeId}`;
  };

  const getDistrictName = (districtId) => {
    if (!districtId) return 'N/A';
    const district = districts.find(d => d.id === districtId);
    return district ? district.name : `District #${districtId}`;
  };
  
  // Helper to check if field changed and render with highlighting
  const renderField = (label, fieldName, oldValue, newValue, formatFn) => {
    const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

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
  
  // Format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
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
      name: 'Name',
      description: 'Description',
      latitude: 'Latitude',
      longitude: 'Longitude',
      address: 'Address',
      telephone: 'Telephone',
      email: 'Email',
      priceMinUsd: 'PriceMinUsd',
      priceMaxUsd: 'PriceMaxUsd',
      score: 'Score',
      destinationId: 'DestinationId',
      locationTypeId: 'LocationTypeId',
      amenityIds: 'AmenityIds',
      tagIds: 'TagIds',
      mediaLinks: 'MediaLinks',
      socialLinks: 'SocialLinks',
    };
    
    const backendFieldName = fieldMap[fieldName];
    return proposedChanges[backendFieldName] ?? submission[fieldName];
  };
  
  // Get old values from existing location
  const getOldValue = (fieldName) => {
    return existingLocation[fieldName];
  };
  
  return (
    <div>
      <Descriptions title={isEditExisting ? "Comparison View (Red = Old, Green = New)" : "New Location Details"} bordered column={isEditExisting ? 1 : 2}>
        {/* Basic Information */}
        {renderField('Name', 'name', getOldValue('name'), getNewValue('name'))}
        {renderField('Description', 'description', getOldValue('description'), getNewValue('description'))}
        
        {/* Location */}
        {renderField('Latitude', 'latitude', getOldValue('latitude'), getNewValue('latitude'))}
        {renderField('Longitude', 'longitude', getOldValue('longitude'), getNewValue('longitude'))}
        {renderField('Address', 'address', getOldValue('address'), getNewValue('address'))}
        
        {/* Contact */}
        {renderField('Telephone', 'telephone', getOldValue('telephone'), getNewValue('telephone'))}
        {renderField('Email', 'email', getOldValue('email'), getNewValue('email'))}
        
        {/* Pricing */}
        {renderField('Min Price', 'priceMinUsd', getOldValue('priceMinUsd'), getNewValue('priceMinUsd'))}
        {renderField('Max Price', 'priceMaxUsd', getOldValue('priceMaxUsd'), getNewValue('priceMaxUsd'))}
        {renderField('Score', 'score', getOldValue('score'), getNewValue('score'))}
        
        {/* Categories */}
        {renderField('Destination', 'destinationId', getOldValue('destinationId'), getNewValue('destinationId'), getDistrictName)}
        {renderField('Location Type', 'locationTypeId', getOldValue('locationTypeId'), getNewValue('locationTypeId'), getLocationTypeName)}

        {/* Tags & Amenities */}
        {renderField('Amenities', 'amenityIds', getOldValue('amenityIds'), getNewValue('amenityIds'), getAmenityNames)}
        {renderField('Tags', 'tagIds', getOldValue('tagIds'), getNewValue('tagIds'), getTagNames)}
        
        {/* Media & Social */}
        {renderField('Media Links', 'mediaLinks', getOldValue('mediaLinks'), getNewValue('mediaLinks'))}
        {renderField('Social Links', 'socialLinks', getOldValue('socialLinks'), getNewValue('socialLinks'))}
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
