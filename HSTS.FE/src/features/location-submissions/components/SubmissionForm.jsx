import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message, Button, Space, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  createLocationSubmissionApi,
  updateLocationSubmissionApi,
  getAllDestinationsApi,
  getAllLocationTypesApi,
  getAllAmenitiesApi
} from '../api';

const { TextArea } = Input;
const { Option } = Select;

const SubmissionForm = ({ open, submission, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [tags, setTags] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  const isEdit = !!submission;

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
        setDestinations(Array.isArray(destinationsRes) ? destinationsRes : []);
        setLocationTypes(Array.isArray(typesRes) ? typesRes : []);
        setAmenities(Array.isArray(amenitiesRes) ? amenitiesRes : []);
        setTags(Array.isArray(tagsRes) ? tagsRes : []);
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
    } else {
      form.resetFields();
      setMediaLinks([]);
      setSocialLinks([]);
    }
  }, [submission, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : null,
        socialLinks: socialLinks.length > 0 ? socialLinks : null,
        amenityIds: values.amenityIds?.length > 0 ? values.amenityIds : null,
        tagIds: values.tagIds?.length > 0 ? values.tagIds : null
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

  return (
    <Modal
      title={isEdit ? 'Edit Submission' : 'Submit Your Location'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={900}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
            >
              <TextArea rows={4} placeholder="Describe your location..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="latitude"
              label="Latitude"
              rules={[{ required: true, message: 'Please enter latitude' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 10.57"
                min={-90}
                max={90}
                step={0.000001}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="longitude"
              label="Longitude"
              rules={[{ required: true, message: 'Please enter longitude' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 105.17"
                min={-180}
                max={180}
                step={0.000001}
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
              <Input placeholder="Full address of your location" />
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

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="priceMinUsd"
              label="Min Price (USD)"
              rules={[{ min: 0, message: 'Price must be positive' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 10"
                min={0}
                step={0.01}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="priceMaxUsd"
              label="Max Price (USD)"
              rules={[{ min: 0, message: 'Price must be positive' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g., 100"
                min={0}
                step={0.01}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="destinationId"
              label="Destination"
            >
              <Select placeholder="Select destination" allowClear showSearch optionFilterProp="children">
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
            >
              <Select placeholder="Select type" allowClear showSearch optionFilterProp="children">
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
          <Col span={24}>
            <Form.Item
              name="amenityIds"
              label="Amenities"
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
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="tagIds"
              label="Tags"
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

        {/* Media Links Section */}
        <Row gutter={16}>
          <Col span={24}>
            <Card
              size="small"
              title="Media Links (Images/Videos)"
              extra={
                <Button type="dashed" size="small" onClick={addMediaLink} icon={<PlusOutlined />}>
                  Add Link
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
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
                <p style={{ color: '#999', textAlign: 'center' }}>No media links added yet</p>
              )}
            </Card>
          </Col>
        </Row>

        {/* Social Links Section */}
        <Row gutter={16}>
          <Col span={24}>
            <Card
              size="small"
              title="Social Media Links"
              extra={
                <Button type="dashed" size="small" onClick={addSocialLink} icon={<PlusOutlined />}>
                  Add Social Link
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
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
                          <Option value="twitter">Twitter</Option>
                          <Option value="youtube">YouTube</Option>
                          <Option value="tiktok">TikTok</Option>
                          <Option value="website">Website</Option>
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
                <p style={{ color: '#999', textAlign: 'center' }}>No social links added yet</p>
              )}
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default SubmissionForm;
