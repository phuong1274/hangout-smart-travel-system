import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message, Alert, Rate, Tag, Table, TimePicker, Card, Divider, Space, Button } from 'antd';
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined, CloudOutlined } from '@ant-design/icons';
import { createLocationSubmissionApi, getAllDestinationsApi, getAllLocationTypesApi, getAllAmenitiesApi, getAllTagsApi } from '../api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

/**
 * Modal for users to suggest edits to existing locations
 * Supports editing ALL fields including tags, amenities, type, destination, media, social links
 */
const SuggestEditModal = ({ location, open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [changedFields, setChangedFields] = useState([]);
  const [originalData, setOriginalData] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [tags, setTags] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [seasons, setSeasons] = useState([]);

  // Fetch dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [destinationsRes, typesRes, amenitiesRes, tagsRes] = await Promise.all([
          getAllDestinationsApi(),
          getAllLocationTypesApi(),
          getAllAmenitiesApi(),
          getAllTagsApi()
        ]);
        
        setDestinations(Array.isArray(destinationsRes) ? destinationsRes : (destinationsRes?.items || []));
        setLocationTypes(Array.isArray(typesRes) ? typesRes : (typesRes?.items || []));
        setAmenities(Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []));
        setTags(Array.isArray(tagsRes) ? tagsRes : (tagsRes?.items || []));
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      }
    };
    fetchData();
  }, []);

  // Pre-fill with existing location data and store original values
  useEffect(() => {
    if (location && open) {
      const originalValues = {
        name: location.name,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        telephone: location.telephone,
        email: location.email,
        priceMinUsd: location.priceMinUsd,
        priceMaxUsd: location.priceMaxUsd,
        score: location.score,
        destinationId: location.destinationId,
        locationTypeId: location.locationTypeId,
        amenityIds: location.amenityIds || [],
        tagIds: location.tagIds || [],
      };

      form.setFieldsValue(originalValues);
      setOriginalData(originalValues);

      if (location.mediaLinks) {
        setMediaLinks(location.mediaLinks);
      }
      if (location.socialLinks) {
        setSocialLinks(location.socialLinks);
      }
      if (location.openingHours) {
        setOpeningHours(location.openingHours);
      }
      if (location.seasons) {
        const parsedSeasons = location.seasons.map(s => ({
          id: s.id || 0,
          description: s.description,
          months: typeof s.months === 'string' ? s.months.split(',').filter(m => m) : (s.months || [])
        }));
        setSeasons(parsedSeasons);
      }
    }
  }, [location, open, form]);

  // Track which fields have changed
  const handleValuesChange = (changedValues, allValues) => {
    if (!originalData) return;

    const changed = Object.keys(changedValues).filter(key =>
      JSON.stringify(allValues[key]) !== JSON.stringify(originalData[key])
    );

    // Also check media and social links
    if (JSON.stringify(mediaLinks) !== JSON.stringify(location?.mediaLinks || [])) {
      if (!changed.includes('mediaLinks')) changed.push('mediaLinks');
    }
    if (JSON.stringify(socialLinks) !== JSON.stringify(location?.socialLinks || [])) {
      if (!changed.includes('socialLinks')) changed.push('socialLinks');
    }
    // Check opening hours
    if (JSON.stringify(openingHours) !== JSON.stringify(location?.openingHours || [])) {
      if (!changed.includes('openingHours')) changed.push('openingHours');
    }
    // Check seasons
    if (JSON.stringify(seasons) !== JSON.stringify(location?.seasons || [])) {
      if (!changed.includes('seasons')) changed.push('seasons');
    }

    setChangedFields(changed);
  };

  const handleAddMediaLink = () => {
    setMediaLinks([...mediaLinks, '']);
  };

  const handleUpdateMediaLink = (index, value) => {
    const updated = [...mediaLinks];
    updated[index] = value;
    setMediaLinks(updated);
  };

  const handleRemoveMediaLink = (index) => {
    setMediaLinks(mediaLinks.filter((_, i) => i !== index));
  };

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', url: '' }]);
  };

  const handleUpdateSocialLink = (index, field, value) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const handleRemoveSocialLink = (index) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  // Opening Hours handlers
  const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const handleAddOpeningHour = (dayOfWeek) => {
    if (!openingHours.find(oh => oh.dayOfWeek === dayOfWeek)) {
      setOpeningHours([...openingHours, {
        id: 0,
        dayOfWeek: parseInt(dayOfWeek, 10),
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
    updated[index] = { ...updated[index], [field]: field === 'dayOfWeek' ? parseInt(value, 10) : value };
    setOpeningHours(updated);
  };

  const handleRemoveOpeningHour = (index) => {
    setOpeningHours(openingHours.filter((_, i) => i !== index));
  };

  // Seasons handlers
  const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

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

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Build proposed changes object (only changed fields)
      const proposedChanges = {};
      changedFields.forEach(field => {
        if (field === 'mediaLinks') {
          proposedChanges.MediaLinks = mediaLinks.filter(link => link.trim() !== '');
        } else if (field === 'socialLinks') {
          proposedChanges.SocialLinks = socialLinks.filter(link => link.platform && link.url);
        } else if (field === 'openingHours') {
          proposedChanges.OpeningHours = openingHours.map(oh => ({
            id: oh.id,
            dayOfWeek: typeof oh.dayOfWeek === 'string' ? parseInt(oh.dayOfWeek, 10) : oh.dayOfWeek,
            openTime: oh.openTime,
            closeTime: oh.closeTime,
            note: oh.note
          }));
        } else if (field === 'seasons') {
          proposedChanges.Seasons = seasons.map(s => ({
            id: s.id,
            description: s.description,
            months: Array.isArray(s.months) ? s.months.join(',') : s.months
          }));
        } else {
          proposedChanges[field.charAt(0).toUpperCase() + field.slice(1)] = values[field];
        }
      });

      // Submit as EditExisting submission
      await createLocationSubmissionApi({
        submissionType: 1, // EditExisting
        existingLocationId: location.id,
        proposedChanges: proposedChanges,
        // Also send all fields for validation/display purposes
        ...values,
        mediaLinks: mediaLinks.filter(link => link.trim() !== ''),
        socialLinks: socialLinks.filter(link => link.platform && link.url),
      });

      message.success('Suggestion submitted successfully! It will be reviewed by our team.');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Suggest Edit"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={900}
      okText="Submit Suggestion"
    >
      <Alert
        type="info"
        message="Your suggestions will be reviewed by our team before being published."
        style={{ marginBottom: 16 }}
      />

      {changedFields.length > 0 && (
        <Alert
          type="success"
          message={`You are suggesting changes to: ${changedFields.join(', ')}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleValuesChange}
      >
        {/* Basic Information */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="Location Name"
              rules={[
                { required: true, message: 'Please enter location name' },
                { max: 200, message: 'Location name cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="e.g., Sunrise Hotel" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description"
              rules={[{ max: 2000, message: 'Description cannot exceed 2000 characters' }]}
              extra="Describe your location and list all services you offer"
            >
              <TextArea rows={4} placeholder="Describe the location..." />
            </Form.Item>
          </Col>
        </Row>

        {/* Location & Contact */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="latitude"
              label="Latitude"
              rules={[
                { required: true, message: 'Please enter latitude' },
                { type: 'number', min: -90, max: 90, message: 'Latitude must be between -90 and 90' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                step={0.000001}
                placeholder="e.g., 10.823099"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="longitude"
              label="Longitude"
              rules={[
                { required: true, message: 'Please enter longitude' },
                { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                step={0.000001}
                placeholder="e.g., 106.629664"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="address"
              label="Address"
              rules={[
                { required: true, message: 'Please enter address' },
                { max: 300, message: 'Address cannot exceed 300 characters' }
              ]}
            >
              <Input placeholder="Street number, ward, district, city" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="telephone"
              label="Telephone"
              rules={[{ max: 50, message: 'Telephone cannot exceed 50 characters' }]}
            >
              <Input placeholder="e.g., +84 123 456 789" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Please enter a valid email' },
                { max: 200, message: 'Email cannot exceed 200 characters' }
              ]}
            >
              <Input placeholder="e.g., contact@example.com" />
            </Form.Item>
          </Col>
        </Row>

        {/* Pricing & Score */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="priceMinUsd"
              label="Minimum Price (USD)"
              rules={[
                { type: 'number', min: 0, message: 'Price must be 0 or positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 10"
                min={0}
                step={0.01}
                prefix="$"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="priceMaxUsd"
              label="Maximum Price (USD)"
              rules={[
                { type: 'number', min: 0, message: 'Price must be 0 or positive' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 100"
                min={0}
                step={0.01}
                prefix="$"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="score"
              label="Score (0-5 stars)"
              tooltip="Rate this location from 0 to 5 stars"
            >
              <Rate allowHalf style={{ fontSize: 24 }} />
            </Form.Item>
          </Col>
        </Row>

        {/* Categories */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="destinationId"
              label="Destination"
            >
              <Select placeholder="Select destination" allowClear showSearch optionFilterProp="children">
                {destinations.map(dest => (
                  <Option key={dest.id} value={dest.id}>{dest.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="locationTypeId"
              label="Location Type"
            >
              <Select placeholder="Select type" allowClear showSearch optionFilterProp="children">
                {locationTypes.map(type => (
                  <Option key={type.id} value={type.id}>{type.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amenityIds"
              label="Amenities"
            >
              <Select mode="multiple" placeholder="Select amenities" showSearch optionFilterProp="children">
                {amenities.map(amenity => (
                  <Option key={amenity.id} value={amenity.id}>{amenity.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="tagIds"
              label="Tags"
            >
              <Select mode="multiple" placeholder="Select tags" showSearch optionFilterProp="children">
                {tags.map(tag => (
                  <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Media Links */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Media Links">
              <div style={{ marginBottom: 8 }}>
                <button type="button" onClick={handleAddMediaLink} style={{ marginRight: 8 }}>+ Add Media Link</button>
              </div>
              {mediaLinks.map((link, index) => (
                <Row key={index} gutter={8} style={{ marginBottom: 8 }}>
                  <Col flex="auto">
                    <Input
                      value={link}
                      onChange={(e) => handleUpdateMediaLink(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </Col>
                  <Col>
                    <button type="button" onClick={() => handleRemoveMediaLink(index)}>Remove</button>
                  </Col>
                </Row>
              ))}
            </Form.Item>
          </Col>
        </Row>

        {/* Social Links */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Social Media Links">
              <div style={{ marginBottom: 8 }}>
                <button type="button" onClick={handleAddSocialLink} style={{ marginRight: 8 }}>+ Add Social Link</button>
              </div>
              {socialLinks.map((link, index) => (
                <Row key={index} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Select
                      value={link.platform}
                      onChange={(value) => handleUpdateSocialLink(index, 'platform', value)}
                      placeholder="Platform"
                      style={{ width: '100%' }}
                    >
                      <Option value="facebook">Facebook</Option>
                      <Option value="instagram">Instagram</Option>
                      <Option value="twitter">Twitter</Option>
                      <Option value="youtube">YouTube</Option>
                      <Option value="tiktok">TikTok</Option>
                      <Option value="website">Website</Option>
                      <Option value="zalo">Zalo</Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <Input
                      value={link.url}
                      onChange={(e) => handleUpdateSocialLink(index, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                  </Col>
                  <Col span={2}>
                    <button type="button" onClick={() => handleRemoveSocialLink(index)}>×</button>
                  </Col>
                </Row>
              ))}
            </Form.Item>
          </Col>
        </Row>

        {/* Opening Hours */}
        <Row gutter={16}>
          <Col span={24}>
            <Divider orientation="left"><ClockCircleOutlined /> Opening Hours</Divider>
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
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveOpeningHour(index)}
                        />
                      )
                    }
                  ]}
                />
              )}
            </Space>
          </Col>
        </Row>

        {/* Seasons */}
        <Row gutter={16}>
          <Col span={24}>
            <Divider orientation="left"><CloudOutlined /> Best Seasons to Visit</Divider>
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
                          icon={<DeleteOutlined />}
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
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default SuggestEditModal;
