import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, Upload, message, Slider, Tag, Progress } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, PictureOutlined, EnvironmentOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { createLocationApi, updateLocationApi, getAllTagsApi, getAllDestinationsApi, getAllLocationTypesApi } from '../api';
import { uploadImageToCloudinary } from '@/services/cloudinary';
import GoogleMapPicker from '@/components/GoogleMapPicker';

const { TextArea } = Input;
const { Option } = Select;

const LocationForm = ({ open, location, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [newMediaLink, setNewMediaLink] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [tagsWithScores, setTagsWithScores] = useState([]);

  const isEdit = !!location;

  // Calculate total score
  const totalScore = tagsWithScores.reduce((sum, tag) => sum + tag.score, 0);
  const scoreError = Math.abs(totalScore - 1) > 0.01 && tagsWithScores.length > 0;

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [tagsRes, destinationsRes, typesRes] = await Promise.all([
          getAllTagsApi(),
          getAllDestinationsApi(),
          getAllLocationTypesApi()
        ]);
        setTags(tagsRes || []);
        setDestinations(destinationsRes || []);
        setLocationTypes(typesRes || []);
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
        socialLink: location.socialLink,
        locationTypeId: location.locationTypeId,
        destinationId: location.destinationId
      });
      setMediaLinks(location.mediaLinks || []);
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
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : undefined
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

  return (
    <Modal
      title={isEdit ? 'Edit Location' : 'Create Location'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={800}
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

        <Form.Item
          name="socialLink"
          label="Social Link"
          rules={[
            { type: 'url', message: 'Please enter a valid URL' },
            { max: 500, message: 'URL cannot exceed 500 characters' }
          ]}
        >
          <Input placeholder="https://..." />
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
