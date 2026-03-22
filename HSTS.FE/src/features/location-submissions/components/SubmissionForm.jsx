import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message, Button, Space, Card, Divider, Rate, Radio, Table, TimePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined, HomeOutlined, PhoneOutlined, MailOutlined, DollarOutlined, PictureOutlined, LinkOutlined, TagsOutlined, ClockCircleOutlined, CloudOutlined } from '@ant-design/icons';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import {
  createLocationSubmissionApi,
  updateLocationSubmissionApi,
  getAllDestinationsApi,
  getAllLocationTypesApi,
  getAllAmenitiesApi,
  getAllTagsApi
} from '../api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const SubmissionForm = ({ open, submission, existingLocation, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [tags, setTags] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [submissionType, setSubmissionType] = useState(0); // 0 = NewLocation, 1 = EditExisting

  const isEdit = !!submission;
  const isEditExisting = submissionType === 1;

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
        
        // Handle paginated responses (extract items array)
        const destinations = Array.isArray(destinationsRes) ? destinationsRes : (destinationsRes?.items || []);
        const types = Array.isArray(typesRes) ? typesRes : (typesRes?.items || []);
        const amenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);
        const tags = Array.isArray(tagsRes) ? tagsRes : (tagsRes?.items || []);
        
        setDestinations(destinations);
        setLocationTypes(types);
        setAmenities(amenities);
        setTags(tags);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      }
    };
    fetchData();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (submission) {
      form.setFieldsValue({
        name: submission.name,
        description: submission.description,
        latitude: submission.latitude,
        longitude: submission.longitude,
        address: submission.address,
        telephone: submission.telephone,
        email: submission.email,
        priceMinUsd: submission.priceMinUsd,
        priceMaxUsd: submission.priceMaxUsd,
        destinationId: submission.destinationId,
        locationTypeId: submission.locationTypeId,
        amenityIds: submission.amenityIds,
        tagIds: submission.tagIds
      });

      if (submission.mediaLinks) {
        setMediaLinks(submission.mediaLinks);
      }
      if (submission.socialLinks) {
        setSocialLinks(submission.socialLinks);
      }
      if (submission.openingHours) {
        setOpeningHours(submission.openingHours);
      }
      if (submission.seasons) {
        setSeasons(submission.seasons);
      }
    } else {
      form.resetFields();
      setMediaLinks([]);
      setSocialLinks([]);
      setOpeningHours([]);
      setSeasons([]);
    }
  }, [submission, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Transform seasons to convert months array to comma-separated string
      const formattedSeasons = seasons.length > 0
        ? seasons.map(season => ({
            id: season.id,
            description: season.description,
            months: Array.isArray(season.months) ? season.months.join(',') : season.months
          }))
        : null;

      // Transform opening hours to ensure dayOfWeek is a number
      const formattedOpeningHours = openingHours.length > 0
        ? openingHours.map(oh => ({
            ...oh,
            dayOfWeek: typeof oh.dayOfWeek === 'string' ? parseInt(oh.dayOfWeek, 10) : oh.dayOfWeek
          }))
        : null;

      const payload = {
        ...values,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : null,
        socialLinks: socialLinks.length > 0 ? socialLinks : null,
        amenityIds: values.amenityIds?.length > 0 ? values.amenityIds : null,
        tagIds: values.tagIds?.length > 0 ? values.tagIds : null,
        openingHours: formattedOpeningHours,
        seasons: formattedSeasons
      };

      if (isEdit) {
        await updateLocationSubmissionApi(submission.id, payload);
        message.success('Submission updated successfully. It will be reviewed by admin.');
      } else {
        await createLocationSubmissionApi(payload);
        message.success('Submission created successfully. Waiting for admin approval.');
      }
      onSuccess();
      onClose();
    } catch (error) {
      // Error handled by global interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleMapConfirm = (lat, lng) => {
    form.setFieldsValue({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    });
    setMapPickerOpen(false);
    message.success('Location picked successfully');
  };

  const addMediaLink = () => {
    setMediaLinks([...mediaLinks, '']);
  };

  const updateMediaLink = (index, value) => {
    const updated = [...mediaLinks];
    updated[index] = value;
    setMediaLinks(updated);
  };

  const removeMediaLink = (index) => {
    setMediaLinks(mediaLinks.filter((_, i) => i !== index));
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: '', url: '' }]);
  };

  const updateSocialLink = (index, field, value) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index) => {
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

  const addOpeningHour = (dayOfWeek) => {
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

  const addAllOpeningHours = () => {
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

  const updateOpeningHour = (index, field, value) => {
    const updated = [...openingHours];
    updated[index] = { ...updated[index], [field]: field === 'dayOfWeek' ? parseInt(value, 10) : value };
    setOpeningHours(updated);
  };

  const removeOpeningHour = (index) => {
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

  const addSeason = () => {
    setSeasons([...seasons, { id: 0, description: '', months: [] }]);
  };

  const updateSeason = (index, field, value) => {
    const updated = [...seasons];
    updated[index] = { ...updated[index], [field]: value };
    setSeasons(updated);
  };

  const removeSeason = (index) => {
    setSeasons(seasons.filter((_, i) => i !== index));
  };

  return (
    <>
      <Modal
        title={isEdit ? 'Edit Submission' : 'Submit Your Location'}
        open={open}
        onCancel={onClose}
        onOk={() => form.submit()}
        confirmLoading={loading}
        destroyOnClose
        width={1000}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          
          {/* Section 1: Basic Information */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <HomeOutlined style={{ fontSize: 20, color: '#1890ff', marginRight: 8 }} />
              <strong style={{ fontSize: 16 }}>Basic Information</strong>
            </div>
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
                  <Input placeholder="e.g., Sunrise Hotel, Blue Ocean Resort" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description (Include your services here)"
                  rules={[{ max: 2000, message: 'Description cannot exceed 2000 characters' }]}
                  extra="Describe your location and list all services you offer (e.g., room types, food services, activities with prices)"
                >
                  <TextArea rows={6} placeholder={`Example:
Accommodation:
- Standard Room: $50/night (Double bed, city view)
- Deluxe Room: $80/night (King bed, ocean view)

Food & Beverage:
- Breakfast Buffet: $10/person
- Room Service: Available 24/7

Transportation:
- Airport Shuttle: $25/trip`} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 2: Location & Contact */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <EnvironmentOutlined style={{ fontSize: 20, color: '#52c41a', marginRight: 8 }} />
              <strong style={{ fontSize: 16 }}>Location & Contact</strong>
            </div>
            <Row gutter={16}>
              <Col span={12}>
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
                >
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="e.g., 10.823099" />
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
                  <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="e.g., 106.629664" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="address"
                  label="Full Address"
                  rules={[
                    { required: true, message: 'Please enter address' },
                    { max: 300, message: 'Address cannot exceed 300 characters' }
                  ]}
                >
                  <Input placeholder="Street number, ward, district, city" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="telephone"
                  label={
                    <Space>
                      <PhoneOutlined />
                      <span>Telephone</span>
                    </Space>
                  }
                  rules={[{ max: 50, message: 'Telephone cannot exceed 50 characters' }]}
                >
                  <Input placeholder="e.g., +84 123 456 789" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label={
                    <Space>
                      <MailOutlined />
                      <span>Email</span>
                    </Space>
                  }
                  rules={[
                    { type: 'email', message: 'Please enter a valid email' },
                    { max: 200, message: 'Email cannot exceed 200 characters' }
                  ]}
                >
                  <Input placeholder="e.g., contact@example.com" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 3: Pricing */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <DollarOutlined style={{ fontSize: 20, color: '#faad14', marginRight: 8 }} />
              <strong style={{ fontSize: 16 }}>Price Range (USD)</strong>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priceMinUsd"
                  label="Minimum Price"
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
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="priceMaxUsd"
                  label="Maximum Price"
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
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 3.5: Score */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontSize: 16 }}>Location Score</strong>
            </div>
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
          </Card>

          {/* Section 4: Categories */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <TagsOutlined style={{ fontSize: 20, color: '#722ed1', marginRight: 8 }} />
              <strong style={{ fontSize: 16 }}>Categories</strong>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="destinationId"
                  label="Destination"
                  tooltip="Select the destination/area where your location is located"
                >
                  <Select placeholder="Select destination" allowClear showSearch optionFilterProp="children" size="large">
                    {destinations.map(dest => (
                      <Option key={dest.id} value={dest.id}>
                        {dest.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="locationTypeId"
                  label="Location Type"
                  tooltip="Select the type that best describes your location"
                >
                  <Select placeholder="Select type" allowClear showSearch optionFilterProp="children" size="large">
                    {locationTypes.map(type => (
                      <Option key={type.id} value={type.id}>
                        {type.name}
                      </Option>
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
                  tooltip="Select all amenities available at your location"
                >
                  <Select mode="multiple" placeholder="Select amenities" showSearch optionFilterProp="children">
                    {amenities.map(amenity => (
                      <Option key={amenity.id} value={amenity.id}>
                        {amenity.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="tagIds"
                  label="Tags"
                  tooltip="Select tags that describe your location"
                >
                  <Select mode="multiple" placeholder="Select tags" showSearch optionFilterProp="children">
                    {tags.map(tag => (
                      <Option key={tag.id} value={tag.id}>
                        {tag.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Section 5: Media Links */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <PictureOutlined style={{ fontSize: 20, color: '#13c2c2', marginRight: 8 }} />
              <strong style={{ fontSize: 16 }}>Media Links</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Button type="dashed" onClick={addMediaLink} icon={<PlusOutlined />}>
                  Add Image/Video Link
                </Button>
                <span style={{ color: '#999', fontSize: 12 }}>Add URLs to your photos or videos hosted online</span>
              </Space>
            </div>
            {mediaLinks.map((link, index) => (
              <Space.Compact key={index} style={{ width: '100%', marginBottom: 8 }}>
                <Input
                  value={link}
                  onChange={(e) => updateMediaLink(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeMediaLink(index)}
                />
              </Space.Compact>
            ))}
            {mediaLinks.length === 0 && (
              <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                No media links added yet
              </div>
            )}
          </Card>

          {/* Section 6: Social Media Links */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <LinkOutlined style={{ fontSize: 20, color: '#eb2f96', marginRight: 8 }} />
              <strong style={{ fontSize: 16 }}>Social Media Links</strong>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Button type="dashed" onClick={addSocialLink} icon={<PlusOutlined />}>
                  Add Social Link
                </Button>
                <span style={{ color: '#999', fontSize: 12 }}>Add your social media profiles</span>
              </Space>
            </div>
            {socialLinks.map((link, index) => (
              <Card
                key={index}
                size="small"
                type="inner"
                style={{ marginBottom: 8 }}
                title={`Social Link ${index + 1}`}
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeSocialLink(index)}
                  />
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Platform" required>
                      <Select
                        value={link.platform}
                        onChange={(value) => updateSocialLink(index, 'platform', value)}
                        placeholder="Select platform"
                      >
                        <Option value="facebook">Facebook</Option>
                        <Option value="instagram">Instagram</Option>
                        <Option value="twitter">Twitter / X</Option>
                        <Option value="youtube">YouTube</Option>
                        <Option value="tiktok">TikTok</Option>
                        <Option value="website">Official Website</Option>
                        <Option value="zalo">Zalo</Option>
                        <Option value="other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="URL" required>
                      <Input
                        value={link.url}
                        onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}
            {socialLinks.length === 0 && (
              <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                No social links added yet
              </div>
            )}
          </Card>

          {/* Section 7: Opening Hours */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <Divider orientation="left"><ClockCircleOutlined /> Opening Hours</Divider>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <Button type="dashed" onClick={addAllOpeningHours} icon={<PlusOutlined />}>
                  Add All Days
                </Button>
                <Select
                  placeholder="Add specific day"
                  onChange={addOpeningHour}
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
                          onChange={(time, timeString) => updateOpeningHour(index, 'openTime', timeString)}
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
                          onChange={(time, timeString) => updateOpeningHour(index, 'closeTime', timeString)}
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
                          onChange={(e) => updateOpeningHour(index, 'note', e.target.value)}
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
                          onClick={() => removeOpeningHour(index)}
                        />
                      )
                    }
                  ]}
                />
              )}
            </Space>
          </Card>

          {/* Section 8: Best Seasons to Visit */}
          <Card size="small" type="inner" style={{ marginBottom: 16 }}>
            <Divider orientation="left"><CloudOutlined /> Best Seasons to Visit</Divider>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button type="dashed" onClick={addSeason} icon={<PlusOutlined />}>
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
                          onClick={() => removeSeason(index)}
                        />
                      }
                      style={{ maxWidth: 800 }}
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Form.Item label="Description" required>
                          <Input
                            value={season.description}
                            onChange={(e) => updateSeason(index, 'description', e.target.value)}
                            placeholder="e.g., Dry Season, Best time for beach activities"
                          />
                        </Form.Item>
                        <Form.Item label="Months" required>
                          <Select
                            mode="multiple"
                            value={season.months}
                            onChange={(value) => updateSeason(index, 'months', value)}
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
          </Card>

        </Form>
      </Modal>

      {/* Google Map Picker Modal */}
      <GoogleMapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.getFieldValue('latitude')}
        initialLng={form.getFieldValue('longitude')}
      />
    </>
  );
};

export default SubmissionForm;
