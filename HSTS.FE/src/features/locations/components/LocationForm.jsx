import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, Upload, message, Slider, Tag, Progress, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, PictureOutlined, EnvironmentOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { createLocationApi, updateLocationApi, getAllTagsApi, getAllDestinationsApi, getAllLocationTypesApi, getAllAmenitiesApi } from '../api';
import { uploadImageToCloudinary } from '@/services/cloudinary';
import GoogleMapPicker from '@/components/GoogleMapPicker';

const { TextArea } = Input;
const { Option } = Select;

// Platform options for social links
const SOCIAL_PLATFORMS = [
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Twitter', label: 'Twitter/X' },
  { value: 'Website', label: 'Official Website' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Other', label: 'Other' }
];

const LocationForm = ({ open, location, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [newMediaLink, setNewMediaLink] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [tagsWithScores, setTagsWithScores] = useState([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  const isEdit = !!location;

  // Calculate total score
  const totalScore = tagsWithScores.reduce((sum, tag) => sum + tag.score, 0);
  const scoreError = Math.abs(totalScore - 1) > 0.01 && tagsWithScores.length > 0;

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [tagsRes, destinationsRes, typesRes, amenitiesRes] = await Promise.all([
          getAllTagsApi(),
          getAllDestinationsApi(),
          getAllLocationTypesApi(),
          getAllAmenitiesApi()
        ]);
        setTags(tagsRes || []);
        setDestinations(destinationsRes || []);
        setLocationTypes(typesRes || []);
        setAmenities(amenitiesRes || []);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      }
    };
    fetchDropdownData();
  }, []);

  // Set form values when editing
  useEffect(() => {
    if (location) {
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
        priceRange: location.priceRange,
        priceMinUsd: location.priceMinUsd,
        priceMaxUsd: location.priceMaxUsd,
        recommendedDurationMinutes: location.recommendedDurationMinutes
      });
      setMediaLinks(location.mediaLinks || []);
      setSelectedAmenityIds(location.amenityIds || []);
      setSocialLinks(location.socialLinks || []);
      
      // Set tags with scores (default score if not provided)
      if (location.tagIds && location.tagIds.length > 0) {
        const defaultScore = location.tagIds.length > 0 ? 1 / location.tagIds.length : 1;
        setTagsWithScores(location.tagIds.map(tagId => ({
          tagId,
          score: defaultScore,
          name: tags.find(t => t.id === tagId)?.name || `Tag ${tagId}`
        })));
      } else {
        setTagsWithScores([]);
      }
    } else {
      form.resetFields();
      setMediaLinks([]);
      setTagsWithScores([]);
      setSelectedAmenityIds([]);
      setSocialLinks([]);
    }
  }, [location, form, tags]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate tag scores
      if (tagsWithScores.length > 0 && scoreError) {
        message.error('Tag scores must sum to 1.0 (100%)');
        setLoading(false);
        return;
      }

      const payload = {
        ...values,
        tagsWithScores: tagsWithScores.length > 0 ? tagsWithScores.map(({ tagId, score }) => ({ tagId, score })) : undefined,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : undefined,
        amenityIds: selectedAmenityIds.length > 0 ? selectedAmenityIds : undefined,
        socialLinks: socialLinks.length > 0 ? socialLinks : undefined
      };

      if (isEdit) {
        await updateLocationApi(location.id, payload);
      } else {
        await createLocationApi(payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      // Handled by global interceptor
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

  const handleAddTag = (tagId) => {
    if (!tagsWithScores.find(t => t.tagId === tagId)) {
      const tag = tags.find(t => t.id === tagId);
      const remainingScore = 1 - totalScore;
      setTagsWithScores([...tagsWithScores, {
        tagId,
        score: remainingScore > 0 ? remainingScore : 0.1,
        name: tag?.name || `Tag ${tagId}`
      }]);
    }
  };

  const handleRemoveTag = (tagId) => {
    setTagsWithScores(tagsWithScores.filter(t => t.tagId !== tagId));
  };

  const handleScoreChange = (tagId, newScore) => {
    setTagsWithScores(tagsWithScores.map(t => 
      t.tagId === tagId ? { ...t, score: newScore } : t
    ));
  };

  const handleAutoDistributeScores = () => {
    if (tagsWithScores.length > 0) {
      const equalScore = 1 / tagsWithScores.length;
      setTagsWithScores(tagsWithScores.map(t => ({ ...t, score: equalScore })));
    }
  };

  const handleMapConfirm = ({ lat, lng }) => {
    form.setFieldsValue({
      latitude: lat,
      longitude: lng,
    });
    message.success('Location coordinates updated!');
  };

  // Social Links handlers
  const handleAddSocialLink = (platform) => {
    if (!socialLinks.find(sl => sl.platform === platform)) {
      setSocialLinks([...socialLinks, { platform, url: '' }]);
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
          name="priceRange"
          label="Price Range (e.g., $, $$, $$$)"
          rules={[{ max: 50, message: 'Price range cannot exceed 50 characters' }]}
        >
          <Input placeholder="e.g., $, $$, $$$, $$$$" />
        </Form.Item>

        <Form.Item
          name="recommendedDurationMinutes"
          label="Recommended Duration (minutes)"
          rules={[{ min: 0, type: 'integer', message: 'Duration must be >= 0' }]}
        >
          <InputNumber style={{ width: '100%' }} step={15} min={0} placeholder="e.g., 60" />
        </Form.Item>

        <Space direction="horizontal" style={{ width: '100%' }} size="large">
          <Form.Item
            name="locationTypeId"
            label="Location Type"
            rules={[{ required: true, message: 'Please select location type' }]}
            style={{ width: '48%' }}
          >
            <Select placeholder="Select location type">
              {locationTypes.map(type => (
                <Option key={type.id} value={type.id}>{type.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="destinationId"
            label="Destination"
            rules={[{ required: true, message: 'Please select destination' }]}
            style={{ width: '48%' }}
          >
            <Select placeholder="Select destination">
              {destinations.map(dest => (
                <Option key={dest.id} value={dest.id}>{dest.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Space>

        <Form.Item
          name="tagIds"
          label="Tags"
          help={scoreError ? `Total score must be 1.0, current: ${totalScore.toFixed(2)}` : `Total score: ${totalScore.toFixed(2)} (should be 1.0)`}
          validateStatus={scoreError ? 'error' : ''}
        >
          <div>
            {/* Tag selector */}
            <Select
              placeholder="Select tags to add"
              onChange={handleAddTag}
              value={null}
              style={{ width: '100%', marginBottom: 12 }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {tagsWithScores.length > 0 && (
                    <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                      <Button size="small" type="link" onClick={handleAutoDistributeScores}>
                        Auto-distribute scores equally
                      </Button>
                    </div>
                  )}
                </>
              )}
            >
              {tags
                .filter(tag => !tagsWithScores.find(t => t.tagId === tag.id))
                .map(tag => (
                  <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                ))}
            </Select>

            {/* Tags with scores */}
            {tagsWithScores.length > 0 && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {tagsWithScores.map((tagScore) => (
                  <div key={tagScore.tagId} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '8px',
                    background: '#f5f5f5',
                    borderRadius: '6px'
                  }}>
                    <Tag color="purple" style={{ minWidth: '80px' }}>
                      {tagScore.name}
                    </Tag>
                    <Slider
                      value={tagScore.score}
                      onChange={(value) => handleScoreChange(tagScore.tagId, value)}
                      min={0}
                      max={1}
                      step={0.01}
                      style={{ flex: 1 }}
                      tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
                    />
                    <InputNumber
                      value={tagScore.score}
                      onChange={(value) => handleScoreChange(tagScore.tagId, value || 0)}
                      min={0}
                      max={1}
                      step={0.01}
                      formatter={(value) => `${(value * 100).toFixed(0)}%`}
                      style={{ width: 80 }}
                      size="small"
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<MinusCircleOutlined />}
                      onClick={() => handleRemoveTag(tagScore.tagId)}
                    />
                  </div>
                ))}

                {/* Score summary */}
                <div style={{ 
                  padding: '8px', 
                  background: scoreError ? '#fff2f0' : '#f6ffed',
                  border: `1px solid ${scoreError ? '#ffccc7' : '#b7eb8f'}`,
                  borderRadius: '4px',
                  marginTop: '8px'
                }}>
                  <Space>
                    <span>Total:</span>
                    <Progress
                      percent={(totalScore * 100).toFixed(1)}
                      strokeColor={scoreError ? '#ff4d4f' : '#52c41a'}
                      size="small"
                      format={() => `${(totalScore * 100).toFixed(1)}%`}
                      style={{ width: 150 }}
                    />
                    {scoreError && <span style={{ color: '#ff4d4f', fontSize: 12 }}>Must equal 100%</span>}
                  </Space>
                </div>
              </Space>
            )}
          </div>
        </Form.Item>

        {/* Amenities Selector */}
        <Form.Item
          name="amenityIds"
          label="Amenities"
        >
          <Select
            mode="multiple"
            placeholder="Select amenities"
            value={selectedAmenityIds}
            onChange={setSelectedAmenityIds}
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
                      {socialLink.platform}
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
