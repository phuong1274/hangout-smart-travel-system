import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, Upload, message } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { createLocationApi, updateLocationApi, getAllTagsApi, getAllDestinationsApi, getAllLocationTypesApi } from '../api';

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

  const isEdit = !!location;

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
        destinationId: location.destinationId,
        tagIds: location.tagIds || []
      });
      setMediaLinks(location.mediaLinks || []);
    } else {
      form.resetFields();
      setMediaLinks([]);
    }
  }, [location, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
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
            label="Latitude"
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
        >
          <Select mode="multiple" placeholder="Select tags (optional)" allowClear>
            {tags.map(tag => (
              <Option key={tag.id} value={tag.id}>{tag.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Media Links (Image URLs)">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Paste image URL here"
              value={newMediaLink}
              onChange={(e) => setNewMediaLink(e.target.value)}
              onPressEnter={handleAddMediaLink}
            />
            <Button type="primary" onClick={handleAddMediaLink} icon={<PlusOutlined />}>
              Add
            </Button>
          </Space.Compact>
          
          {mediaLinks.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
              {mediaLinks.map((link, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#f5f5f5', marginBottom: 4, borderRadius: 4 }}>
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{link}</span>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveMediaLink(index)} />
                </div>
              ))}
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LocationForm;
