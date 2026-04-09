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
  const [availableChildTags, setAvailableChildTags] = useState([]);
  // Selected child tags only (parent tags are for filtering only, not submitted)
  const [selectedChildTagIds, setSelectedChildTagIds] = useState([]);
  // Selected parent tag IDs (for filtering child tags, not submitted)
  const [selectedParentTagIds, setSelectedParentTagIds] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [newMediaLink, setNewMediaLink] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [childTagsByParent, setChildTagsByParent] = useState({});

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
        const districts = Array.isArray(districtsRes) ? districtsRes : (districtsRes?.items || []);
        const locationTypes = Array.isArray(typesRes) ? typesRes : (typesRes?.items || []);
        const amenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);

        // Build tag hierarchy client-side
        const { rootTags, childTagsByParent } = buildTagHierarchy(allTags);

        setRootTags(rootTags);
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

  // Handle parent tag change - updates filter for child tag dropdown
  // Parent tags are NOT submitted, only used to filter child tags
  const handleParentTagChange = (selectedParentIds) => {
    setSelectedParentTagIds(selectedParentIds);

    // Get child tags for selected parent tags
    const filteredChildTags = [];
    selectedParentIds.forEach(parentId => {
      const children = childTagsByParent[parentId] || [];
      filteredChildTags.push(...children);
    });

    // Remove duplicates
    const uniqueChildTags = filteredChildTags.filter(
      (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
    );

    setAvailableChildTags(uniqueChildTags);

    // Remove selected child tags that are no longer in filtered list
    const availableChildIds = new Set(uniqueChildTags.map(t => t.id));
    const filteredChildTagIds = selectedChildTagIds.filter(id => availableChildIds.has(id));
    
    if (filteredChildTagIds.length !== selectedChildTagIds.length) {
      setSelectedChildTagIds(filteredChildTagIds);
      form.setFieldValue('tagIds', filteredChildTagIds);
    }
  };

  // Handle child tag selection - only child tags are saved
  const handleChildTagChange = (selectedChildIds) => {
    setSelectedChildTagIds(selectedChildIds);
    form.setFieldValue('tagIds', selectedChildIds);
  };

  // Set form values when editing - derive parent tags from child tags
  useEffect(() => {
    if (location && location.tagIds && location.tagIds.length > 0 && rootTags.length > 0) {
      // Separate child tags from the tagIds
      const childTagIds = location.tagIds.filter(id => childTagsByParent);
      
      // Derive parent tag IDs from child tags
      const parentIds = new Set();
      childTagIds.forEach(childId => {
        for (const parentId in childTagsByParent) {
          const children = childTagsByParent[parentId] || [];
          if (children.some(c => c.id === childId)) {
            parentIds.add(parseInt(parentId, 10));
          }
        }
      });

      setSelectedParentTagIds([...parentIds]);
      setSelectedChildTagIds(childTagIds);

      // Set available child tags based on derived parent tags
      const filteredChildTags = [];
      [...parentIds].forEach(parentId => {
        const children = childTagsByParent[parentId] || [];
        filteredChildTags.push(...children);
      });

      const uniqueChildTags = filteredChildTags.filter(
        (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
      );
      setAvailableChildTags(uniqueChildTags);

      // Set form field values
      form.setFieldValue('tagIds', childTagIds);
    }
  }, [location, rootTags, childTagsByParent]);

  // Set form field values when editing - ONLY runs when location changes AND all reference data is loaded
  useEffect(() => {
    if (location && amenities.length > 0 && locationTypes.length > 0 && districts.length > 0) {
      form.setFieldsValue({
        name: location.name,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        ticketPrice: location.ticketPrice,
        minimumAge: location.minimumAge,
        address: location.address,
        locationTypeId: location.locationTypeId,
        districtId: location.districtId,
        telephone: location.telephone,
        email: location.email,
        priceMinUsd: location.priceMinUsd,
        priceMaxUsd: location.priceMaxUsd,
        recommendedDurationMinutes: location.recommendedDurationMinutes,
        score: location.score,
        tagIds: location.tagIds || [],
        amenityIds: location.amenityIds || []
      });
      // CRITICAL: Sync React state with Form state for logic in handleParentTagChange
      setSelectedChildTagIds(location.tagIds || []);
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
  }, [location, amenities, locationTypes, districts, form]); // Removed availableChildTags to prevent resetting form state during user interaction

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

      // BUG FIX: Only send child tag IDs - parent tags are for filtering only
      const payload = {
        ...values,
        // Only child tags are submitted (not parent tags)
        tagIds: selectedChildTagIds,
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
            <Select 
              placeholder="Select location type" 
              showSearch 
              optionFilterProp="children"
              loading={locationTypes.length === 0}
            >
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

        {/* Tags Selector - Parent Tags (Filter Only) */}
        <Form.Item
          label="Parent Tags"
          tooltip="Select parent categories to filter child tags"
        >
          <Select
            mode="multiple"
            placeholder="Select parent tags to filter child tags"
            value={selectedParentTagIds}
            style={{ width: '100%', marginBottom: 16 }}
            onChange={handleParentTagChange}
            optionFilterProp="children"
            showSearch
          >
            {rootTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                {tag.name} <span style={{ color: '#52c41a' }}>(Parent)</span>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Tags Selector - Child Tags (Selected & Submitted) */}
        <Form.Item
          name="tagIds"
          label="Child Tags"
          tooltip="Select child tags to associate with this location"
          initialValue={[]}
          rules={[
            { required: true, message: 'Please select at least one child tag' },
            { type: 'array', min: 1, message: 'At least one child tag is required' }
          ]}
        >
          <Select
            mode="multiple"
            placeholder={selectedParentTagIds.length > 0 ? "Select child tags" : "Select parent tags first to see child tags"}
            style={{ width: '100%' }}
            maxTagCount="responsive"
            loading={tagsLoading}
            onChange={handleChildTagChange}
            optionFilterProp="children"
            showSearch
            disabled={selectedParentTagIds.length === 0}
          >
            {availableChildTags.map(tag => (
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
                        value={value ? dayjs(String(value).substring(0, 5), 'HH:mm') : null}
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
                        value={value ? dayjs(String(value).substring(0, 5), 'HH:mm') : null}
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
