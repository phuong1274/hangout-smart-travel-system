import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, Upload, message, Tag, Table, TimePicker, Card, Divider, Rate } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, PictureOutlined, EnvironmentOutlined, MinusCircleOutlined, ClockCircleOutlined, CloudOutlined } from '@ant-design/icons';
import { createLocationApi, updateLocationApi, getAllDistrictsApi, getAllLocationTypesApi, getAllAmenitiesApi, getAllTagsApi } from '../api';
import { uploadImageToCloudinary } from '@/services/cloudinary';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import { SOCIAL_PLATFORMS, DAYS_OF_WEEK, MONTH_NAMES, MONTHS } from '@/utils/locationConstants';
import { buildTagHierarchy } from '@/utils/locationCache';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

// Helper to convert platform enum value to string
const getPlatformName = (platform) => {
  if (typeof platform === 'string') return platform;
  const platformObj = SOCIAL_PLATFORMS.find(p => p.enumValue === platform);
  return platformObj ? platformObj.value : 'Other';
};

// Helper to convert platform string back to enum value
const getPlatformEnumValue = (platformName) => {
  if (typeof platformName === 'number') return platformName;
  const platformObj = SOCIAL_PLATFORMS.find(p => p.value === platformName);
  return platformObj ? platformObj.enumValue : 14;
};

const LocationForm = ({ open, location, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rootTags, setRootTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  // SINGLE SOURCE OF TRUTH: All selected tag IDs (both root and child tags)
  // This eliminates inconsistency between selectedRootTagIds and form field tagIds
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [tags, setTags] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [newMediaLink, setNewMediaLink] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [childTagsByParent, setChildTagsByParent] = useState({});

  // Derived state: selected root tag IDs (computed from selectedTagIds)
  // This avoids stale closure issues and keeps UI in sync with source of truth
  const selectedRootIds = rootTags.length > 0
    ? selectedTagIds.filter(id => rootTags.some(rt => rt.id === id))
    : [];

  const isEdit = !!location;

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setTagsLoading(true);
        // Single API call to get all tags - use large pageSize to get all
        const [allTagsRes, districtsRes, typesRes, amenitiesRes] = await Promise.all([
          getAllTagsApi({ pageSize: 9999 }),
          getAllDistrictsApi(),
          getAllLocationTypesApi(),
          getAllAmenitiesApi()
        ]);

        // Handle paginated responses (extract items array)
        const allTags = Array.isArray(allTagsRes) ? allTagsRes : (allTagsRes?.items || []);

        console.log('=== DEBUG: API Response ===');
        console.log('allTagsRes:', allTagsRes);
        console.log('allTags (extracted):', allTags);
        console.log('First tag structure:', allTags[0]);
        console.log('Total tags count:', allTags.length);
        console.log('Tags with parentTagId:', allTags.filter(t => t.parentTagId).length);
        console.log('Tags without parentTagId (roots):', allTags.filter(t => !t.parentTagId).length);
        const districts = Array.isArray(districtsRes) ? districtsRes : (districtsRes?.items || []);
        const locationTypes = Array.isArray(typesRes) ? typesRes : (typesRes?.items || []);
        const amenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);

        // Build tag hierarchy client-side
        const { rootTags, childTagsByParent } = buildTagHierarchy(allTags);

        console.log('Fetched all tags:', allTags);
        console.log('Built root tags:', rootTags);
        console.log('Built childTagsByParent:', childTagsByParent);

        setRootTags(rootTags);
        setAvailableTags(rootTags); // Initially show all root tags
        setDistricts(districts);
        setLocationTypes(locationTypes);
        setAmenities(amenities);
        setChildTagsByParent(childTagsByParent);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
        message.error('Failed to load dropdown data');
      } finally {
        setTagsLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Load child tags when a root tag is selected
  // Uses pre-fetched child tags from childTagsByParent map (no API calls)
  const handleRootTagChange = (selectedRootIds) => {
    console.log('handleRootTagChange called with:', selectedRootIds);
    console.log('childTagsByParent:', childTagsByParent);
    console.log('rootTags:', rootTags);
    
    // Separate root and child tags from current selection
    const rootTagSet = new Set(rootTags.map(t => t.id));
    const currentChildTagIds = selectedTagIds.filter(id => !rootTagSet.has(id));

    // Find which root tags were deselected by comparing new vs old root selections
    const previousRootIds = selectedTagIds.filter(id => rootTagSet.has(id));
    const deselectedRootIds = previousRootIds.filter(id => !selectedRootIds.includes(id));

    // Get child tags of deselected root tags from pre-fetched map
    const childrenOfDeselectedRoots = new Set();
    deselectedRootIds.forEach(tagId => {
      const children = childTagsByParent[tagId] || [];
      children.forEach(ct => childrenOfDeselectedRoots.add(ct.id));
    });

    // Remove only child tags whose own parent was deselected
    // This preserves child tags from still-selected root tags
    const filteredChildTagIds = currentChildTagIds.filter(id =>
      !childrenOfDeselectedRoots.has(id)
    );

    // Build new selection: new root IDs + remaining child IDs (deduplicated)
    const newSelectedTagIds = [...selectedRootIds, ...filteredChildTagIds];
    const uniqueSelectedTagIds = [...new Set(newSelectedTagIds)];
    setSelectedTagIds(uniqueSelectedTagIds);

    // Update form field to match (keeps form in sync with state)
    form.setFieldValue('tagIds', filteredChildTagIds);

    // Get children for ALL currently selected root tags from pre-fetched map
    const allChildTagsFromSelectedRoots = [];
    selectedRootIds.forEach(tagId => {
      const children = childTagsByParent[tagId] || [];
      allChildTagsFromSelectedRoots.push(...children);
    });

    console.log('allChildTagsFromSelectedRoots:', allChildTagsFromSelectedRoots);

    // Rebuild available tags from scratch: root tags + ALL children from selected roots
    // Remove duplicate child tags (same child might appear under multiple roots)
    const uniqueChildTags = allChildTagsFromSelectedRoots.filter(
      (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
    );

    console.log('uniqueChildTags:', uniqueChildTags);
    console.log('Setting availableTags to:', [...rootTags, ...uniqueChildTags]);

    setAvailableTags([...rootTags, ...uniqueChildTags]);
  };

  // Handle child tag selection (with labelInValue format)
  // BUG FIX: Previously only updated form field, not the source of truth state.
  // Now updates selectedTagIds to maintain consistency.
  const handleChildTagChange = (selectedChildTags) => {
    // selectedChildTags is array of {value, label} when labelInValue is enabled
    const selectedChildIds = selectedChildTags.map(tag => tag.value);

    // Get current root tag IDs from selectedTagIds
    const rootTagSet = new Set(rootTags.map(t => t.id));
    const currentRootIds = selectedTagIds.filter(id => rootTagSet.has(id));

    // Build new selection: root IDs + new child IDs (deduplicated)
    const newSelectedTagIds = [...currentRootIds, ...selectedChildIds];
    const uniqueSelectedTagIds = [...new Set(newSelectedTagIds)];
    setSelectedTagIds(uniqueSelectedTagIds);

    // Update form field to match (keeps form in sync with state)
    form.setFieldValue('tagIds', selectedChildIds);
  };

  // Set form values when editing
  // Uses pre-fetched child tags (no API calls)
  useEffect(() => {
    const setupEditForm = async () => {
      if (location && location.tagIds && location.tagIds.length > 0 && rootTags.length > 0) {
        // Set selected tag IDs (both root and child) from existing tags
        const rootIds = location.tagIds.filter(id => {
          const tag = rootTags.find(t => t.id === id);
          return tag && !tag.parentTagId;
        });
        setSelectedTagIds(location.tagIds);

        // Get child tags for the selected root tags from pre-fetched map
        const allChildTagsFromSelectedRoots = [];
        rootIds.forEach(tagId => {
          const children = childTagsByParent[tagId] || [];
          allChildTagsFromSelectedRoots.push(...children);
        });
        // Remove duplicates
        const uniqueChildTags = allChildTagsFromSelectedRoots.filter(
          (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
        );
        setAvailableTags([...rootTags, ...uniqueChildTags]);
      }
    };

    setupEditForm();
  }, [location, rootTags, childTagsByParent]);

  // Set form field values after tags are loaded
  // BUG FIX: Previously, this effect ran whenever availableTags changed (e.g., during tag selection),
  // causing form.resetFields() to be called in create mode, which cleared all form values.
  // Now we only reset when location changes ( Modal opens/closes), not when availableTags changes.
  useEffect(() => {
    if (location && availableTags.length > 0) {
      // Convert tagIds to labelInValue format for proper display
      const tagIdsWithValue = (location.tagIds || []).map(tagId => {
        const tag = availableTags.find(t => t.id === tagId);
        return {
          value: tagId,
          label: tag ? tag.name : String(tagId)
        };
      });

      // Convert amenityIds to labelInValue format for proper display
      const amenityIdsWithValue = (location.amenityIds || []).map(amenityId => {
        const amenity = amenities.find(a => a.id === amenityId);
        return {
          value: amenityId,
          label: amenity ? amenity.name : String(amenityId)
        };
      });

      form.setFieldsValue({
        name: location.name,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        ticketPrice: location.ticketPrice,
        minimumAge: location.minimumAge,
        address: location.address,
        locationTypeId: location.locationTypeId,
        destinationId: location.destinationId,
        telephone: location.telephone,
        email: location.email,
        priceMinUsd: location.priceMinUsd,
        priceMaxUsd: location.priceMaxUsd,
        recommendedDurationMinutes: location.recommendedDurationMinutes,
        tagIds: tagIdsWithValue,
        amenityIds: amenityIdsWithValue
      });
      setMediaLinks(location.mediaLinks || []);
      // Map social links from BE format (with id) to form state - convert platform enum to string
      setSocialLinks(location.socialLinks?.map(sl => ({
        id: sl.id,
        platform: getPlatformName(sl.platform),
        url: sl.url
      })) || []);
    }

    // Always set opening hours and seasons when location changes (independent of tags/amenities)
    if (location) {
      setOpeningHours(location.openingHours || []);
      // Set seasons - convert comma-separated months string to array
      setSeasons(location.seasons?.map(season => ({
        id: season.id,
        description: season.description,
        months: typeof season.months === 'string' ? season.months.split(',').filter(m => m) : (season.months || [])
      })) || []);
    } else if (!location) {
      // Only reset when location changes to null (Modal opened for create), not when availableTags changes
      form.resetFields();
      setMediaLinks([]);
      setSocialLinks([]);
      setOpeningHours([]);
      setSeasons([]);
    }
  }, [location, amenities]); // REMOVED availableTags from dependencies to prevent form reset during tag selection

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Transform social links to match backend format (send platform as enum number)
      // Filter out links with empty platform or URL
      // BUG FIX: Previously used Number(sl.platform) which returned NaN for strings like "Facebook".
      // Now uses getPlatformEnumValue() to properly map platform name to enum number.
      const formattedSocialLinks = socialLinks.length > 0
        ? socialLinks
            .filter(sl => sl.platform && sl.url && sl.url.trim() !== '')
            .map(sl => ({
                platform: getPlatformEnumValue(sl.platform),
                url: sl.url.trim()
              }))
        : [];

      // Transform seasons to convert months array to comma-separated string
      const formattedSeasons = seasons.length > 0
        ? seasons.map(season => ({
            id: season.id,
            description: season.description,
            months: Array.isArray(season.months) ? season.months.join(',') : season.months
          }))
        : [];

      // BUG FIX: Previously combined selectedRootTagIds (stale) with values.tagIds.map(t => t.value).
      // But values.tagIds is already an array of IDs (not labelInValue objects) because handleChildTagChange
      // and handleRootTagChange both call form.setFieldValue('tagIds', arrayOfIds).
      // Now we simply use selectedTagIds which is the single source of truth.
      const payload = {
        ...values,
        // Use selectedTagIds directly - it contains both root and child tag IDs (deduplicated)
        tagIds: selectedTagIds,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : [],
        // Extract IDs from labelInValue format
        amenityIds: values.amenityIds?.length > 0 ? values.amenityIds.map(a => a.value) : [],
        socialLinks: formattedSocialLinks,
        openingHours: openingHours.length > 0 ? openingHours : [],
        seasons: formattedSeasons
      };

      if (isEdit) {
        await updateLocationApi(location.id, payload);
      } else {
        await createLocationApi(payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      // Handle duplicate name error specifically
      if (error?.response?.status === 409) {
        const errorMessage = error.response.data?.description || error.response.data?.message || 'Duplicate name detected';
        message.error(errorMessage);
      } else if (error?.response?.status === 400) {
        // Handle validation errors
        const errors = error.response.data;
        if (Array.isArray(errors)) {
          errors.forEach(err => {
            message.error(err.description || err.message);
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMediaLink = () => {
    if (newMediaLink && newMediaLink.trim()) {
      setMediaLinks([...mediaLinks, newMediaLink.trim()]);
      setNewMediaLink('');
    }
  };

  const handleRemoveMediaLink = (index) => {
    setMediaLinks(mediaLinks.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (file) => {
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setMediaLinks([...mediaLinks, imageUrl]);
      message.success('Image uploaded successfully');
    } catch (error) {
      message.error(error.message || 'Upload failed');
    }
    return Upload.LIST_IGNORE; // Prevent default upload behavior
  };

  const handleMapConfirm = (lat, lng) => {
    form.setFieldsValue({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    });
    message.success('Location coordinates updated!');
  };

  // Social Links handlers
  const handleAddSocialLink = (platform) => {
    if (!socialLinks.find(sl => sl.platform === platform)) {
      setSocialLinks([...socialLinks, { id: 0, platform, url: '' }]);
    }
  };

  const handleUpdateSocialLink = (index, url) => {
    const updated = [...socialLinks];
    updated[index].url = url;
    setSocialLinks(updated);
  };

  const handleRemoveSocialLink = (index) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const getUsedPlatforms = () => {
    return socialLinks.map(sl => sl.platform);
  };

  // Opening Hours handlers
  const handleAddOpeningHour = (dayOfWeek) => {
    if (!openingHours.find(oh => oh.dayOfWeek === dayOfWeek)) {
      setOpeningHours([...openingHours, {
        id: 0,
        dayOfWeek,
        dayName: DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label,
        openTime: '08:00',
        closeTime: '17:00',
        note: ''
      }]);
    }
  };

  const handleAddAllOpeningHours = () => {
    const allDays = DAYS_OF_WEEK.map(day => ({
      id: 0,
      dayOfWeek: day.value,
      dayName: day.label,
      openTime: '08:00',
      closeTime: '17:00',
      note: ''
    }));
    setOpeningHours(allDays);
  };

  const handleUpdateOpeningHour = (index, field, value) => {
    const updated = [...openingHours];
    updated[index] = { ...updated[index], [field]: value };
    setOpeningHours(updated);
  };

  const handleRemoveOpeningHour = (index) => {
    setOpeningHours(openingHours.filter((_, i) => i !== index));
  };

  // Seasons handlers
  const handleAddSeason = () => {
    setSeasons([...seasons, { id: 0, description: '', months: [] }]);
  };

  const handleUpdateSeason = (index, field, value) => {
    const updated = [...seasons];
    updated[index] = { ...updated[index], [field]: value };
    setSeasons(updated);
  };

  const handleRemoveSeason = (index) => {
    setSeasons(seasons.filter((_, i) => i !== index));
  };

  return (
    <Modal
      title={isEdit ? 'Edit Location' : 'Create Location'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={900}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Location Name"
          rules={[
            { required: true, message: 'Please enter location name' },
            { max: 200, message: 'Location name cannot exceed 200 characters' }
          ]}
        >
          <Input placeholder="Enter location name" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ max: 2000, message: 'Description cannot exceed 2000 characters' }]}
        >
          <TextArea rows={3} placeholder="Enter description" />
        </Form.Item>

        <Space direction="horizontal" style={{ width: '100%' }} size="large">
          <Form.Item
            name="latitude"
            label={
              <Space>
                <span>Latitude</span>
                <Button
                  type="link"
                  size="small"
                  icon={<EnvironmentOutlined />}
                  onClick={() => setMapPickerOpen(true)}
                >
                  Pick on Map
                </Button>
              </Space>
            }
            rules={[
              { required: true, message: 'Please enter latitude' },
              { type: 'number', min: -90, max: 90, message: 'Latitude must be between -90 and 90' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="e.g., 10.823099" />
          </Form.Item>

          <Form.Item
            name="longitude"
            label="Longitude"
            rules={[
              { required: true, message: 'Please enter longitude' },
              { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="e.g., 106.629664" />
          </Form.Item>
        </Space>

        <Space direction="horizontal" style={{ width: '100%' }} size="large">
          <Form.Item
            name="ticketPrice"
            label="Ticket Price"
            rules={[
              { required: true, message: 'Please enter ticket price' },
              { type: 'number', min: 0, message: 'Price must be >= 0' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={0.01} prefix="$" placeholder="0.00" />
          </Form.Item>

          <Form.Item
            name="minimumAge"
            label="Minimum Age"
            rules={[
              { required: true, message: 'Please enter minimum age' },
              { type: 'number', min: 0, max: 120, message: 'Age must be between 0 and 120' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} placeholder="e.g., 5" />
          </Form.Item>
        </Space>

        {/* Price Range */}
        <Space direction="horizontal" style={{ width: '100%' }} size="large">
          <Form.Item
            name="priceMinUsd"
            label="Min Price (USD)"
            rules={[{ min: 0, type: 'number', message: 'Min price must be >= 0' }]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={0.01} min={0} prefix="$" placeholder="0.00" />
          </Form.Item>

          <Form.Item
            name="priceMaxUsd"
            label="Max Price (USD)"
            rules={[{ min: 0, type: 'number', message: 'Max price must be >= 0' }]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={0.01} min={0} prefix="$" placeholder="0.00" />
          </Form.Item>
        </Space>

        <Form.Item
          name="address"
          label="Address"
          rules={[
            { required: true, message: 'Please enter address' },
            { max: 300, message: 'Address cannot exceed 300 characters' }
          ]}
        >
          <Input placeholder="Enter address" />
        </Form.Item>

        {/* Contact Information */}
        <Space direction="horizontal" style={{ width: '100%' }} size="large">
          <Form.Item
            name="telephone"
            label="Telephone"
            rules={[{ max: 50, message: 'Telephone cannot exceed 50 characters' }]}
            style={{ width: '48%' }}
          >
            <Input placeholder="Enter telephone" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Please enter a valid email' },
              { max: 200, message: 'Email cannot exceed 200 characters' }
            ]}
            style={{ width: '48%' }}
          >
            <Input placeholder="Enter email" />
          </Form.Item>
        </Space>

        <Form.Item
          name="recommendedDurationMinutes"
          label="Recommended Duration (minutes)"
          rules={[{ min: 0, type: 'integer', message: 'Duration must be >= 0' }]}
        >
          <InputNumber style={{ width: '100%' }} step={15} min={0} placeholder="e.g., 60" />
        </Form.Item>

        <Form.Item
          name="score"
          label="Score (0-5 stars)"
          tooltip="Rate this location from 0 to 5 stars"
        >
          <Rate allowHalf style={{ fontSize: 24 }} />
        </Form.Item>

        <Space direction="horizontal" style={{ width: '100%' }} size="large">
          <Form.Item
            name="locationTypeId"
            label="Location Type"
            rules={[{ required: true, message: 'Please select location type' }]}
            style={{ width: '50%', minWidth: '200px' }}
          >
            <Select placeholder="Select location type" showSearch optionFilterProp="children">
              {Array.isArray(locationTypes) && locationTypes.map(type => (
                <Option key={type.id} value={type.id}>{type.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="districtId"
            label="District"
            rules={[{ required: true, message: 'Please select district' }]}
            style={{ width: '50%', minWidth: '200px' }}
          >
            <Select placeholder="Select district" showSearch optionFilterProp="children">
              {Array.isArray(districts) && districts.map(district => (
                <Option key={district.id} value={district.id}>{district.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Space>

        {/* Tags Selector - Root Tags Section */}
        <Form.Item
          label="Root Tags"
          tooltip="Select root categories. Child tags will load automatically."
        >
          <Select
            mode="multiple"
            placeholder="Select root tags"
            value={selectedRootIds}
            style={{ width: '100%', marginBottom: 16 }}
            onChange={handleRootTagChange}
            optionFilterProp="children"
            showSearch
          >
            {rootTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                {tag.name} <span style={{ color: '#52c41a' }}>(Root)</span>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Tags Selector - Child Tags Section */}
        <Form.Item
          name="tagIds"
          label="Child Tags"
          tooltip="Select child tags from chosen root categories"
          initialValue={[]}
        >
          <Select
            mode="multiple"
            labelInValue
            placeholder={selectedRootIds.length > 0 ? "Select child tags" : "Select root tags first to see child tags"}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            loading={tagsLoading}
            onChange={handleChildTagChange}
            optionFilterProp="children"
            showSearch
            disabled={selectedRootIds.length === 0}
          >
            {availableTags.filter(t => t.parentTagId).map(tag => (
              <Option key={tag.id} value={tag.id}>
                {tag.name} <span style={{ color: '#1677ff' }}>(Child)</span>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Amenities Selector */}
        <Form.Item
          name="amenityIds"
          label="Amenities"
          initialValue={[]}
        >
          <Select
            mode="multiple"
            labelInValue
            placeholder="Select amenities"
            style={{ width: '100%' }}
            maxTagCount="responsive"
          >
            {amenities.map(amenity => (
              <Option key={amenity.id} value={amenity.id}>{amenity.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Media (Images)">
          {/* File Upload */}
          <Upload
            accept="image/*"
            beforeUpload={handleImageUpload}
            showUploadList={false}
            multiple={false}
          >
            <Button icon={<UploadOutlined />}>Upload Image to Cloudinary</Button>
          </Upload>

          {/* Or paste URL */}
          <div style={{ marginTop: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Or paste image URL here"
                value={newMediaLink}
                onChange={(e) => setNewMediaLink(e.target.value)}
                onPressEnter={handleAddMediaLink}
              />
              <Button type="primary" onClick={handleAddMediaLink} icon={<PlusOutlined />}>
                Add URL
              </Button>
            </Space.Compact>
          </div>
          
          {/* Display uploaded links */}
          {mediaLinks.length > 0 && (
            <div style={{ marginTop: 12, maxHeight: 200, overflowY: 'auto' }}>
              {mediaLinks.map((link, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f5f5f5', marginBottom: 8, borderRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <PictureOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                    <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{link}</span>
                  </div>
                  <Space>
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>View</a>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveMediaLink(index)} />
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Form.Item>

        {/* Social Links */}
        <Form.Item label="Social Links">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* Add platform selector */}
            <Select
              placeholder="Add social platform"
              onChange={handleAddSocialLink}
              value={null}
              style={{ width: '100%' }}
            >
              {SOCIAL_PLATFORMS
                .filter(platform => !getUsedPlatforms().includes(platform.value))
                .map(platform => (
                  <Option key={platform.value} value={platform.value}>{platform.label}</Option>
                ))}
            </Select>

            {/* Display added social links */}
            {socialLinks.length > 0 && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {socialLinks.map((socialLink, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: '#f5f5f5',
                    borderRadius: '6px'
                  }}>
                    <Tag color="blue" style={{ minWidth: '100px' }}>
                      {SOCIAL_PLATFORMS.find(p => p.value === socialLink.platform)?.label || socialLink.platform}
                    </Tag>
                    <Input
                      placeholder="Enter URL"
                      value={socialLink.url}
                      onChange={(e) => handleUpdateSocialLink(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<MinusCircleOutlined />}
                      onClick={() => handleRemoveSocialLink(index)}
                    />
                  </div>
                ))}
              </Space>
            )}
          </Space>
        </Form.Item>

        {/* Opening Hours Section */}
        <Divider orientation="left"><ClockCircleOutlined /> Opening Hours</Divider>
        <Form.Item label=" ">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <Button type="dashed" onClick={handleAddAllOpeningHours} icon={<PlusOutlined />}>
                Add All Days
              </Button>
              <Select
                placeholder="Add specific day"
                onChange={handleAddOpeningHour}
                value={null}
                style={{ width: 200 }}
              >
                {DAYS_OF_WEEK
                  .filter(day => !openingHours.find(oh => oh.dayOfWeek === day.value))
                  .map(day => (
                    <Option key={day.value} value={day.value}>{day.label}</Option>
                  ))}
              </Select>
            </Space>

            {openingHours.length > 0 && (
              <Table
                dataSource={openingHours}
                pagination={false}
                size="small"
                rowKey={(record, index) => index}
                columns={[
                  {
                    title: 'Day',
                    dataIndex: 'dayName',
                    key: 'dayName',
                    width: 120
                  },
                  {
                    title: 'Open Time',
                    dataIndex: 'openTime',
                    key: 'openTime',
                    width: 130,
                    render: (value, record, index) => (
                      <TimePicker
                        value={value ? dayjs(value, 'HH:mm') : null}
                        onChange={(time, timeString) => handleUpdateOpeningHour(index, 'openTime', timeString)}
                        format="HH:mm"
                      />
                    )
                  },
                  {
                    title: 'Close Time',
                    dataIndex: 'closeTime',
                    key: 'closeTime',
                    width: 130,
                    render: (value, record, index) => (
                      <TimePicker
                        value={value ? dayjs(value, 'HH:mm') : null}
                        onChange={(time, timeString) => handleUpdateOpeningHour(index, 'closeTime', timeString)}
                        format="HH:mm"
                      />
                    )
                  },
                  {
                    title: 'Note',
                    dataIndex: 'note',
                    key: 'note',
                    render: (value, record, index) => (
                      <Input
                        value={value}
                        onChange={(e) => handleUpdateOpeningHour(index, 'note', e.target.value)}
                        placeholder="e.g., Lunch break"
                      />
                    )
                  },
                  {
                    title: 'Action',
                    key: 'action',
                    width: 80,
                    render: (_, record, index) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<MinusCircleOutlined />}
                        onClick={() => handleRemoveOpeningHour(index)}
                      />
                    )
                  }
                ]}
              />
            )}
          </Space>
        </Form.Item>

        {/* Seasonal Weather Section */}
        <Divider orientation="left"><CloudOutlined /> Best Seasons to Visit</Divider>
        <Form.Item label=" ">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button type="dashed" onClick={handleAddSeason} icon={<PlusOutlined />}>
              Add Season
            </Button>

            {seasons.length > 0 && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {seasons.map((season, index) => (
                  <Card
                    key={index}
                    size="small"
                    type="inner"
                    title={`Season ${index + 1}`}
                    extra={
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<MinusCircleOutlined />}
                        onClick={() => handleRemoveSeason(index)}
                      />
                    }
                    style={{ maxWidth: 800 }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Form.Item label="Description" required>
                        <Input
                          value={season.description}
                          onChange={(e) => handleUpdateSeason(index, 'description', e.target.value)}
                          placeholder="e.g., Dry Season, Best time for beach activities"
                        />
                      </Form.Item>
                      <Form.Item label="Months" required>
                        <Select
                          mode="multiple"
                          value={season.months}
                          onChange={(value) => handleUpdateSeason(index, 'months', value)}
                          placeholder="Select months"
                          style={{ width: '100%' }}
                        >
                          {MONTHS.map(month => (
                            <Option key={month.value} value={month.value}>{month.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </Space>
        </Form.Item>
      </Form>

      {/* Google Map Picker Modal */}
      <GoogleMapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.getFieldValue('latitude')}
        initialLng={form.getFieldValue('longitude')}
      />
    </Modal>
  );
};

export default LocationForm;
