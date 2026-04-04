import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message, Alert, Rate, Table, TimePicker, Card, Divider, Space, Button } from 'antd';
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined, CloudOutlined } from '@ant-design/icons';
import { createLocationSubmissionApi, getAllDestinationsApi, getAllLocationTypesApi, getAllAmenitiesApi } from '../api';
import { getRootTagsApi, getChildTagsApi } from '@/features/tags/api';
import dayjs from 'dayjs';
import styles from '../styles/SuggestEditModal.module.css';

const { TextArea } = Input;
const { Option } = Select;

const getPlatformName = (platform) => {
  const platformMap = {
    1: 'Facebook',
    2: 'Instagram',
    3: 'Twitter',
    4: 'YouTube',
    5: 'TikTok',
    13: 'Website',
    12: 'Zalo',
    14: 'Other'
  };
  return platformMap[platform] || 'Other';
};

const getPlatformEnumValue = (platformName) => {
  if (typeof platformName === 'number') return platformName;
  const platformMap = {
    'Facebook': 1,
    'Instagram': 2,
    'Twitter': 3,
    'YouTube': 4,
    'TikTok': 5,
    'Website': 13,
    'Zalo': 12,
    'Other': 14,
    'facebook': 1,
    'instagram': 2,
    'twitter': 3,
    'youtube': 4,
    'tiktok': 5,
    'website': 13,
    'zalo': 12
  };
  return platformMap[platformName] || 14;
};

const SuggestEditModal = ({ location, open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [changedFields, setChangedFields] = useState([]);
  const [originalData, setOriginalData] = useState(null);
  const [rootTags, setRootTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedRootTagIds, setSelectedRootTagIds] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTagsLoading(true);
        const [rootTagsRes, districtsRes, typesRes, amenitiesRes] = await Promise.all([
          getRootTagsApi(),
          getAllDestinationsApi(),
          getAllLocationTypesApi(),
          getAllAmenitiesApi()
        ]);

        setRootTags(Array.isArray(rootTagsRes) ? rootTagsRes.map(t => ({ ...t, level: t.level || 1 })) : (rootTagsRes?.items || []).map(t => ({ ...t, level: t.level || 1 })));
        setAvailableTags(Array.isArray(rootTagsRes) ? rootTagsRes.map(t => ({ ...t, level: t.level || 1 })) : (rootTagsRes?.items || []).map(t => ({ ...t, level: t.level || 1 })));
        setLocationTypes(Array.isArray(typesRes) ? typesRes : (typesRes?.items || []));
        setAmenities(Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []));
        setDistricts(Array.isArray(districtsRes) ? districtsRes : (districtsRes?.items || []));
      } catch (error) {
      } finally {
        setTagsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRootTagChange = async (selectedRootIds) => {
    const rootTagsWithLevel = rootTags.map(t => ({ ...t, level: t.level || 1 }));
    
    const originalRootTagIds = (originalData?.tagIds || []).filter(id => {
      const tag = rootTagsWithLevel.find(t => t.id === id);
      return tag && tag.level === 1;
    });
    if (JSON.stringify([...selectedRootIds].sort()) !== JSON.stringify([...originalRootTagIds].sort())) {
      setChangedFields(prev => {
        if (!prev.includes('tagIds')) {
          return [...prev, 'tagIds'];
        }
        return prev;
      });
    }

    setSelectedRootTagIds(selectedRootIds);

    const currentChildTagIds = form.getFieldValue('tagIds') || [];
    const deselectedRootIds = selectedRootTagIds.filter(id => !selectedRootIds.includes(id));
    const childrenOfDeselectedRoots = new Set();
    for (const tagId of deselectedRootIds) {
      try {
        const childTagsRes = await getChildTagsApi(tagId);
        const childTags = Array.isArray(childTagsRes) ? childTagsRes : (childTagsRes?.items || []);
        childTags.forEach(ct => childrenOfDeselectedRoots.add(ct.id));
      } catch (error) {
      }
    }

    const filteredChildTagIds = currentChildTagIds.filter(id =>
      !childrenOfDeselectedRoots.has(id)
    );

    if (filteredChildTagIds.length !== currentChildTagIds.length) {
      form.setFieldValue('tagIds', filteredChildTagIds);
    }

    const allChildTagsFromSelectedRoots = [];
    for (const tagId of selectedRootIds) {
      try {
        const childTagsRes = await getChildTagsApi(tagId);
        const childTags = Array.isArray(childTagsRes) ? childTagsRes : (childTagsRes?.items || []);
        const childTagsWithLevel = childTags.map(t => ({ ...t, level: t.level || 2 }));
        allChildTagsFromSelectedRoots.push(...childTagsWithLevel);
      } catch (error) {
      }
    }

    const uniqueChildTags = allChildTagsFromSelectedRoots.filter(
      (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
    );

    setAvailableTags([...rootTags, ...uniqueChildTags]);
  };

  const handleChildTagChange = (selectedChildIds) => {
  };

  useEffect(() => {
    if (location && open && rootTags.length > 0) {
      const rootTagsWithLevel = rootTags.map(t => ({ ...t, level: t.level || 1 }));
      
      const rootTagIds = (location.tagIds || []).filter(id => {
        const tag = rootTagsWithLevel.find(t => t.id === id);
        return tag && tag.level === 1;
      });
      const childTagIds = (location.tagIds || []).filter(id => {
        const tag = rootTagsWithLevel.find(t => t.id === id);
        return tag && tag.level > 1;
      });

      setSelectedRootTagIds(rootTagIds);

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
        districtId: location.districtId,
        locationTypeId: location.locationTypeId,
        amenityIds: location.amenityIds || [],
        tagIds: childTagIds.map(id => Number(id)),
      };

      form.setFieldsValue(originalValues);
      setOriginalData({ ...originalValues, tagIds: location.tagIds || [] });

      if (location.mediaLinks) {
        setMediaLinks(location.mediaLinks);
      }
      if (location.socialLinks) {
        setSocialLinks(location.socialLinks.map(sl => ({
          id: sl.id,
          platform: typeof sl.platform === 'number' ? getPlatformName(sl.platform) : sl.platform,
          url: sl.url
        })));
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

      const loadChildTags = async () => {
        const allChildTagsFromSelectedRoots = [];
        for (const tagId of rootTagIds) {
          try {
            const childTagsRes = await getChildTagsApi(tagId);
            const childTags = Array.isArray(childTagsRes) ? childTagsRes : (childTagsRes?.items || []);
            const childTagsWithLevel = childTags.map(t => ({ ...t, level: t.level || 2 }));
            allChildTagsFromSelectedRoots.push(...childTagsWithLevel);
          } catch (error) {
          }
        }
        const uniqueChildTags = allChildTagsFromSelectedRoots.filter(
          (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
        );
        setAvailableTags([...rootTags, ...uniqueChildTags]);
      };

      loadChildTags();
    }
  }, [location, open, form, rootTags]);

  const handleValuesChange = (changedValues, allValues) => {
    if (!originalData) return;

    const changed = Object.keys(changedValues).filter(key =>
      JSON.stringify(allValues[key]) !== JSON.stringify(originalData[key])
    );

    if (JSON.stringify(mediaLinks) !== JSON.stringify(location?.mediaLinks || [])) {
      if (!changed.includes('mediaLinks')) changed.push('mediaLinks');
    }
    if (JSON.stringify(socialLinks) !== JSON.stringify(location?.socialLinks || [])) {
      if (!changed.includes('socialLinks')) changed.push('socialLinks');
    }
    if (JSON.stringify(openingHours) !== JSON.stringify(location?.openingHours || [])) {
      if (!changed.includes('openingHours')) changed.push('openingHours');
    }
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
      const childTagIds = (values.tagIds || []).map(t => {
        if (typeof t === 'object' && t !== null) {
          return Number(t.value);
        }
        return Number(t);
      }).filter(id => !isNaN(id));
      
      const rootTagIds = selectedRootTagIds.map(id => Number(id)).filter(id => !isNaN(id));
      
      const allTagIds = [
        ...rootTagIds,
        ...childTagIds
      ];

      const proposedChanges = {};
      changedFields.forEach(field => {
        if (field === 'mediaLinks') {
          proposedChanges.MediaLinks = mediaLinks.filter(link => link.trim() !== '');
        } else if (field === 'socialLinks') {
          proposedChanges.SocialLinks = socialLinks.filter(link => link.platform && link.url)
            .map(sl => ({
              platform: getPlatformEnumValue(sl.platform),
              url: sl.url
            }));
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
        } else if (field === 'tagIds') {
          proposedChanges.TagIds = allTagIds;
        } else {
          proposedChanges[field.charAt(0).toUpperCase() + field.slice(1)] = values[field];
        }
      });

      await createLocationSubmissionApi({
        submissionType: 1,
        existingLocationId: location.id,
        proposedChanges: proposedChanges,
        ...values,
        tagIds: allTagIds,
        mediaLinks: mediaLinks.filter(link => link.trim() !== ''),
        socialLinks: socialLinks
          .filter(link => link.platform && link.url && link.url.trim() !== '')
          .map(sl => ({
            platform: Number(sl.platform),
            url: sl.url.trim()
          })),
      });

      message.success('Suggestion submitted successfully! It will be reviewed by our team.');
      onSuccess();
      onClose();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Suggest Tropical Edit"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={900}
      okText="Submit Suggestion"
      wrapClassName={styles.modalWrapper}
      okButtonProps={{ style: { background: '#FFE66D', color: '#1A535C', borderRadius: '9999px', fontWeight: 700, border: 'none', height: '44px' } }}
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
              <TextArea rows={4} placeholder="Describe the location..." />
            </Form.Item>
          </Col>
        </Row>

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
            >
              <Rate allowHalf style={{ fontSize: 24, color: '#FF6B6B' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="districtId"
              label="District"
            >
              <Select placeholder="Select district" allowClear showSearch optionFilterProp="children">
                {districts.map(district => (
                  <Option key={district.id} value={district.id}>{district.name}</Option>
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
          <Col span={24}>
            <Form.Item
              label="Root Tags"
              style={{ marginBottom: 8 }}
            >
              <Select
                mode="multiple"
                placeholder="Select root tags"
                value={selectedRootTagIds}
                style={{ width: '100%' }}
                onChange={handleRootTagChange}
                showSearch
                optionFilterProp="children"
              >
                {rootTags.map(tag => (
                  <Option key={tag.id} value={tag.id}>
                    {tag.name} <span style={{ color: '#4ECDC4' }}>(Root)</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="tagIds"
              label="Child Tags"
            >
              <Select
                mode="multiple"
                placeholder={selectedRootTagIds.length > 0 ? "Select child tags" : "Select root tags first to see child tags"}
                showSearch
                optionFilterProp="children"
                loading={tagsLoading}
                onChange={handleChildTagChange}
                disabled={selectedRootTagIds.length === 0}
              >
                {availableTags.filter(t => t.level > 1).map(tag => (
                  <Option key={tag.id} value={tag.id}>
                    {tag.name} <span style={{ color: '#FF6B6B' }}>(Child)</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Media Links">
              <div style={{ marginBottom: 8 }}>
                <Button type="dashed" onClick={handleAddMediaLink} icon={<PlusOutlined />} style={{ borderRadius: '8px', color: '#4ECDC4', borderColor: '#4ECDC4' }}>Add Media Link</Button>
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
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveMediaLink(index)} />
                  </Col>
                </Row>
              ))}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Social Media Links">
              <div style={{ marginBottom: 8 }}>
                <Button type="dashed" onClick={handleAddSocialLink} icon={<PlusOutlined />} style={{ borderRadius: '8px', color: '#FF6B6B', borderColor: '#FF6B6B' }}>Add Social Link</Button>
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
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveSocialLink(index)} />
                  </Col>
                </Row>
              ))}
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Divider orientation="left"><ClockCircleOutlined /> Opening Hours</Divider>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <Button type="primary" onClick={handleAddAllOpeningHours} icon={<PlusOutlined />} style={{ background: '#4ECDC4', border: 'none', fontWeight: 600 }}>
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
                  scroll={{ x: 'max-content' }}
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

        <Row gutter={16}>
          <Col span={24}>
            <Divider orientation="left"><CloudOutlined /> Best Seasons to Visit</Divider>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button type="primary" onClick={handleAddSeason} icon={<PlusOutlined />} style={{ background: '#FF6B6B', border: 'none', fontWeight: 600 }}>
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
                        <Form.Item label="Description" required style={{ margin: 0 }}>
                          <Input
                            value={season.description}
                            onChange={(e) => handleUpdateSeason(index, 'description', e.target.value)}
                            placeholder="e.g., Dry Season, Best time for beach activities"
                          />
                        </Form.Item>
                        <Form.Item label="Months" required style={{ margin: 0 }}>
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