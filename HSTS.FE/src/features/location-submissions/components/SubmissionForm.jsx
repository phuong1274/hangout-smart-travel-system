import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, message, Button, Space, Card, Divider, Rate, Table, TimePicker, ConfigProvider } from 'antd';
import { PlusOutlined, DeleteOutlined, EnvironmentOutlined, HomeOutlined, PhoneOutlined, MailOutlined, DollarOutlined, PictureOutlined, LinkOutlined, TagsOutlined, ClockCircleOutlined, CloudOutlined } from '@ant-design/icons';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import {
  createLocationSubmissionApi,
  updateLocationSubmissionApi,
  getAllDistrictsApi,
  getAllLocationTypesApi,
  getAllAmenitiesApi,
  getAllTagsApi
} from '../api';
import { buildTagHierarchy } from '@/utils/locationCache';
import dayjs from 'dayjs';
import styles from '../styles/SubmissionForm.module.css';

const { TextArea } = Input;
const { Option } = Select;

const SOCIAL_PLATFORMS = [
  { value: 'Facebook', label: 'Facebook', enumValue: 1 },
  { value: 'Instagram', label: 'Instagram', enumValue: 2 },
  { value: 'TikTok', label: 'TikTok', enumValue: 5 },
  { value: 'Twitter', label: 'Twitter/X', enumValue: 3 },
  { value: 'Website', label: 'Official Website', enumValue: 13 },
  { value: 'YouTube', label: 'YouTube', enumValue: 4 },
  { value: 'Other', label: 'Other', enumValue: 14 }
];

const getPlatformEnumValue = (platformName) => {
  if (typeof platformName === 'number') return platformName;
  const platformObj = SOCIAL_PLATFORMS.find(p => p.value.toLowerCase() === platformName?.toLowerCase());
  return platformObj ? platformObj.enumValue : 14;
};

const getPlatformName = (platform) => {
  if (typeof platform === 'string') return platform;
  const platformObj = SOCIAL_PLATFORMS.find(p => p.enumValue === platform);
  return platformObj ? platformObj.value : 'Other';
};

const tropicalTheme = {
  token: {
    colorPrimary: '#FF6B6B',
    colorInfo: '#4ECDC4',
    colorTextBase: '#1A535C',
    colorBgBase: '#F7F9F9',
    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
    borderRadius: 16,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 44,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 20,
    },
    Input: {
      controlHeight: 44,
    },
    Select: {
      controlHeight: 44,
    }
  }
};

const SubmissionForm = ({ open, submission, existingLocation, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rootTags, setRootTags] = useState([]);
  const [availableChildTags, setAvailableChildTags] = useState([]);
  const [selectedParentTagIds, setSelectedParentTagIds] = useState([]);
  const [selectedChildTagIds, setSelectedChildTagIds] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [mediaLinks, setMediaLinks] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [openingHours, setOpeningHours] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [submissionType, setSubmissionType] = useState(0);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [childTagsByParent, setChildTagsByParent] = useState({});

  const isEdit = !!submission;
  const isEditExisting = submissionType === 1 || !!existingLocation;

  useEffect(() => {
    if (existingLocation) {
      setSubmissionType(1);
    } else if (!submission) {
      setSubmissionType(0);
    }
  }, [existingLocation, submission]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTagsLoading(true);
        const [allTagsRes, districtsRes, typesRes, amenitiesRes] = await Promise.all([
          getAllTagsApi({ pageSize: 9999 }),
          getAllDistrictsApi(),
          getAllLocationTypesApi(),
          getAllAmenitiesApi()
        ]);

        const allTags = Array.isArray(allTagsRes) ? allTagsRes : (allTagsRes?.items || []);
        const districts = Array.isArray(districtsRes) ? districtsRes : (districtsRes?.items || []);
        const types = Array.isArray(typesRes) ? typesRes : (typesRes?.items || []);
        const amenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);

        const { rootTags, childTagsByParent } = buildTagHierarchy(allTags);

        setRootTags(rootTags);
        setDistricts(districts);
        setLocationTypes(types);
        setAmenities(amenities);
        setChildTagsByParent(childTagsByParent);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
        message.error('Failed to load dropdown data');
      } finally {
        setTagsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleParentTagChange = (selectedParentIds) => {
    setSelectedParentTagIds(selectedParentIds);

    const filteredChildTags = [];
    selectedParentIds.forEach(parentId => {
      const children = childTagsByParent[parentId] || [];
      filteredChildTags.push(...children);
    });

    const uniqueChildTags = filteredChildTags.filter(
      (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
    );

    setAvailableChildTags(uniqueChildTags);

    const availableChildIds = new Set(uniqueChildTags.map(t => t.id));
    const filteredChildTagIds = selectedChildTagIds.filter(id => availableChildIds.has(id));

    if (filteredChildTagIds.length !== selectedChildTagIds.length) {
      setSelectedChildTagIds(filteredChildTagIds);
      form.setFieldValue('tagIds', filteredChildTagIds);
    }
  };

  const handleChildTagChange = (selectedChildIds) => {
    setSelectedChildTagIds(selectedChildIds);
    form.setFieldValue('tagIds', selectedChildIds);
  };

  useEffect(() => {
    const dataToPopulate = existingLocation || submission;

    if (dataToPopulate && rootTags.length > 0 && childTagsByParent && locationTypes.length > 0 && districts.length > 0) {
      const childTagIds = dataToPopulate.tagIds || dataToPopulate.tags?.map(t => t.id) || [];
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

      const filteredChildTags = [];
      [...parentIds].forEach(parentId => {
        const children = childTagsByParent[parentId] || [];
        filteredChildTags.push(...children);
      });

      const uniqueChildTags = filteredChildTags.filter(
        (ct, index, self) => index === self.findIndex(t => t.id === ct.id)
      );
      setAvailableChildTags(uniqueChildTags);

      form.setFieldsValue({
        name: dataToPopulate.name,
        description: dataToPopulate.description,
        latitude: dataToPopulate.latitude,
        longitude: dataToPopulate.longitude,
        address: dataToPopulate.address,
        telephone: dataToPopulate.telephone,
        email: dataToPopulate.email,
        ticketPrice: dataToPopulate.ticketPrice ?? 0,
        minimumAge: dataToPopulate.minimumAge ?? 0,
        priceMinUsd: dataToPopulate.priceMinUsd,
        priceMaxUsd: dataToPopulate.priceMaxUsd,
        score: dataToPopulate.score,
        recommendedDurationMinutes: dataToPopulate.recommendedDurationMinutes,
        districtId: dataToPopulate.districtId || dataToPopulate.district?.id,
        locationTypeId: dataToPopulate.locationTypeId,
        amenityIds: dataToPopulate.amenityIds || dataToPopulate.amenities?.map(a => a.id),
        tagIds: childTagIds
      });

      if (dataToPopulate.mediaLinks) {
        setMediaLinks(dataToPopulate.mediaLinks);
      }
      if (dataToPopulate.socialLinks) {
        const transformedSocialLinks = dataToPopulate.socialLinks.map(sl => ({
          platform: getPlatformName(sl.platform),
          url: sl.url
        }));
        setSocialLinks(transformedSocialLinks);
      }
      if (dataToPopulate.openingHours) {
        const normalizedOpeningHours = dataToPopulate.openingHours.map(oh => ({
          id: oh.id || 0,
          dayOfWeek: oh.dayOfWeek ?? oh.DayOfWeek,
          dayName: oh.dayName || oh.DayName || '',
          openTime: oh.openTime || oh.OpenTime || '',
          closeTime: oh.closeTime || oh.CloseTime || '',
          note: oh.note || oh.Note || ''
        }));
        setOpeningHours(normalizedOpeningHours);
      } else {
        setOpeningHours([]);
      }
      if (dataToPopulate.seasons !== undefined) {
        const normalizedSeasons = Array.isArray(dataToPopulate.seasons) 
          ? dataToPopulate.seasons.map(season => ({
              id: season.id || 0,
              description: season.description || '',
              months: typeof season.months === 'string'
                ? season.months.split(',').filter(m => m)
                : (season.months || [])
            }))
          : [];
        setSeasons(normalizedSeasons);
      } else {
        setSeasons([]);
      }
    } else if (!existingLocation && !submission) {
      form.resetFields();
      setMediaLinks([]);
      setSocialLinks([]);
      setOpeningHours([]);
      setSeasons([]);
    }
  }, [submission, existingLocation, form, rootTags, childTagsByParent, locationTypes, districts, amenities]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const formattedSeasons = seasons.length > 0
        ? seasons.map(season => ({
            id: season.id,
            description: season.description,
            months: Array.isArray(season.months) ? season.months.join(',') : season.months
          }))
        : null;

      const formattedOpeningHours = openingHours.length > 0
        ? openingHours.map(oh => ({
            ...oh,
            dayOfWeek: typeof oh.dayOfWeek === 'string' ? parseInt(oh.dayOfWeek, 10) : oh.dayOfWeek
          }))
        : null;

      const payload = {
        ...values,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : null,
        socialLinks: socialLinks.length > 0
          ? socialLinks.map(sl => ({
              platform: getPlatformEnumValue(sl.platform),
              url: sl.url
            }))
          : null,
        amenityIds: values.amenityIds?.length > 0 ? values.amenityIds : null,
        tagIds: selectedChildTagIds,
        openingHours: formattedOpeningHours,
        seasons: formattedSeasons,
        submissionType: isEditExisting ? 1 : 0,
        existingLocationId: isEditExisting ? (existingLocation?.id || submission?.existingLocationId) : undefined
      };

      if (isEdit && !isEditExisting) {
        await updateLocationSubmissionApi(submission.id, payload);
        message.success('Submission updated successfully. It will be reviewed by admin.');
      } else if (isEditExisting) {
        await createLocationSubmissionApi(payload);
        message.success('Edit suggestion submitted successfully. It will be reviewed by admin.');
      } else {
        await createLocationSubmissionApi(payload);
        message.success('Submission created successfully. Waiting for admin approval.');
      }
      onSuccess();
      onClose();
    } catch (error) {
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
    setSocialLinks([...socialLinks, { platform: undefined, url: '' }]);
  };

  const updateSocialLink = (index, field, value) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index) => {
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
    <ConfigProvider theme={tropicalTheme}>
      <Modal
        title={<span className={styles.modalTitle}>{isEditExisting ? 'Suggest Edit to Location' : (isEdit ? 'Edit Submission' : 'Submit Your Location')}</span>}
        open={open}
        onCancel={onClose}
        onOk={() => form.submit()}
        confirmLoading={loading}
        destroyOnClose
        width={1000}
        className={styles.tropicalFormModal}
        okButtonProps={{ className: styles.ctaButtonSubmit }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className={styles.tropicalForm}>
          
          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <HomeOutlined className={styles.cardIcon} style={{ color: '#4ECDC4' }} />
              <strong className={styles.cardTitle}>Basic Information</strong>
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="name"
                  label={<span className={styles.formLabel}>Location Name</span>}
                  rules={[
                    { required: true, message: 'Please enter location name' },
                    { max: 200, message: 'Location name cannot exceed 200 characters' }
                  ]}
                >
                  <Input placeholder="e.g., Sunrise Hotel, Blue Ocean Resort" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label={<span className={styles.formLabel}>Description</span>}
                  rules={[{ max: 2000, message: 'Description cannot exceed 2000 characters' }]}
                >
                  <TextArea rows={6} placeholder="Describe your location..." className={styles.customTextArea} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <EnvironmentOutlined className={styles.cardIcon} style={{ color: '#FF6B6B' }} />
              <strong className={styles.cardTitle}>Location & Contact</strong>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="latitude"
                  label={
                    <Space>
                      <span className={styles.formLabel}>Latitude</span>
                      <Button
                        type="link"
                        size="small"
                        icon={<EnvironmentOutlined />}
                        onClick={() => setMapPickerOpen(true)}
                        className={styles.mapBtn}
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
                  label={<span className={styles.formLabel}>Longitude</span>}
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
                  label={<span className={styles.formLabel}>Full Address</span>}
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
                  label={
                    <Space>
                      <PhoneOutlined />
                      <span className={styles.formLabel}>Telephone</span>
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
                      <span className={styles.formLabel}>Email</span>
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

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <DollarOutlined className={styles.cardIcon} style={{ color: '#FFE66D' }} />
              <strong className={styles.cardTitle}>Pricing</strong>
            </div>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="ticketPrice"
                  label={<span className={styles.formLabel}>Ticket Price</span>}
                  rules={[
                    { required: true, message: 'Please enter ticket price' },
                    { type: 'number', min: 0, message: 'Price must be 0 or positive' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="0"
                    min={0}
                    step={1}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="minimumAge"
                  label={<span className={styles.formLabel}>Minimum Age</span>}
                  rules={[
                    { required: true, message: 'Please enter minimum age' },
                    { type: 'number', min: 0, max: 120, message: 'Age must be between 0 and 120' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="e.g., 5"
                    min={0}
                    max={120}
                    addonAfter="+"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priceMinUsd"
                  label={<span className={styles.formLabel}>Min Price</span>}
                  rules={[
                    { type: 'number', min: 0, message: 'Price must be 0 or positive' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="e.g., 10"
                    min={0}
                    step={1}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="priceMaxUsd"
                  label={<span className={styles.formLabel}>Max Price</span>}
                  rules={[
                    { type: 'number', min: 0, message: 'Price must be 0 or positive' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="e.g., 100"
                    min={0}
                    step={1}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="recommendedDurationMinutes"
                  label={<span className={styles.formLabel}>Recommended Visit Duration</span>}
                  rules={[
                    { type: 'number', min: 0, message: 'Duration must be 0 or positive' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="e.g., 60"
                    min={0}
                    step={15}
                    addonAfter="minutes"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <strong className={styles.cardTitle}>Location Score</strong>
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="score"
                  label={<span className={styles.formLabel}>Score (0-5 stars)</span>}
                >
                  <Rate allowHalf className={styles.tropicalRate} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <TagsOutlined className={styles.cardIcon} style={{ color: '#4ECDC4' }} />
              <strong className={styles.cardTitle}>Categories</strong>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="districtId"
                  label={<span className={styles.formLabel}>District</span>}
                >
                  <Select placeholder="Select district" allowClear showSearch optionFilterProp="children">
                    {districts.map(district => (
                      <Option key={district.id} value={district.id}>
                        {district.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="locationTypeId"
                  label={<span className={styles.formLabel}>Location Type</span>}
                >
                  <Select 
                    placeholder="Select type" 
                    allowClear 
                    showSearch 
                    optionFilterProp="children" 
                    loading={locationTypes.length === 0}
                  >
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
                  label={<span className={styles.formLabel}>Amenities</span>}
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
              <Col span={24}>
                <Form.Item
                  label={<span className={styles.formLabel}>Parent Tags</span>}
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select parent tags to filter child tags"
                    value={selectedParentTagIds}
                    style={{ width: '100%' }}
                    onChange={handleParentTagChange}
                    showSearch
                    optionFilterProp="children"
                  >
                    {rootTags.map(tag => (
                      <Option key={tag.id} value={tag.id}>
                        {tag.name} <span style={{ color: '#4ECDC4' }}>(Parent)</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="tagIds"
                  label={<span className={styles.formLabel}>Child Tags</span>}
                  rules={[
                    { required: true, message: 'Please select at least one child tag' },
                    { type: 'array', min: 1, message: 'At least one child tag is required' }
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder={selectedParentTagIds.length > 0 ? "Select child tags" : "Select parent tags first to see child tags"}
                    showSearch
                    optionFilterProp="children"
                    loading={tagsLoading}
                    onChange={handleChildTagChange}
                    disabled={selectedParentTagIds.length === 0}
                  >
                    {availableChildTags.map(tag => (
                      <Option key={tag.id} value={tag.id}>
                        {tag.name} <span style={{ color: '#FF6B6B' }}>(Child)</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <PictureOutlined className={styles.cardIcon} style={{ color: '#1A535C' }} />
              <strong className={styles.cardTitle}>Media Links</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button className={styles.dashedBtn} onClick={addMediaLink} icon={<PlusOutlined />}>
                  Add Image/Video Link
                </Button>
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
                  className={styles.dangerIconBtn}
                  icon={<DeleteOutlined />}
                  onClick={() => removeMediaLink(index)}
                />
              </Space.Compact>
            ))}
            {mediaLinks.length === 0 && (
              <div className={styles.emptyStateText}>
                No media links added yet
              </div>
            )}
          </Card>

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <div className={styles.cardHeader}>
              <LinkOutlined className={styles.cardIcon} style={{ color: '#FF6B6B' }} />
              <strong className={styles.cardTitle}>Social Media Links</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button className={styles.dashedBtn} onClick={addSocialLink} icon={<PlusOutlined />}>
                  Add Social Link
                </Button>
              </Space>
            </div>
            {socialLinks.map((link, index) => (
              <Card
                key={index}
                size="small"
                type="inner"
                className={styles.innerSocialCard}
                title={`Social Link ${index + 1}`}
                extra={
                  <Button
                    type="text"
                    className={styles.dangerTextBtn}
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeSocialLink(index)}
                  />
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span className={styles.formLabel}>Platform</span>} required>
                      <Select
                        value={link.platform}
                        onChange={(value) => updateSocialLink(index, 'platform', value)}
                        placeholder="Select platform"
                      >
                        <Option value={1}>Facebook</Option>
                        <Option value={2}>Instagram</Option>
                        <Option value={3}>Twitter / X</Option>
                        <Option value={4}>YouTube</Option>
                        <Option value={5}>TikTok</Option>
                        <Option value={13}>Official Website</Option>
                        <Option value={12}>Zalo</Option>
                        <Option value={14}>Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span className={styles.formLabel}>URL</span>} required>
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
              <div className={styles.emptyStateText}>
                No social links added yet
              </div>
            )}
          </Card>

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <Divider orientation="left" className={styles.tropicalDivider}><ClockCircleOutlined /> Opening Hours</Divider>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <Button className={styles.dashedBtn} onClick={addAllOpeningHours} icon={<PlusOutlined />}>
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
                  className={styles.tropicalTable}
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
                          className={styles.dangerTextBtn}
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

          <Card size="small" type="inner" className={styles.tropicalFormCard}>
            <Divider orientation="left" className={styles.tropicalDivider}><CloudOutlined /> Best Seasons to Visit</Divider>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button className={styles.dashedBtn} onClick={addSeason} icon={<PlusOutlined />}>
                Add Season
              </Button>

              {seasons.length > 0 && (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {seasons.map((season, index) => (
                    <Card
                      key={index}
                      size="small"
                      type="inner"
                      className={styles.innerSocialCard}
                      title={`Season ${index + 1}`}
                      extra={
                        <Button
                          type="text"
                          className={styles.dangerTextBtn}
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeSeason(index)}
                        />
                      }
                      style={{ maxWidth: 800 }}
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Form.Item label={<span className={styles.formLabel}>Description</span>} required>
                          <Input
                            value={season.description}
                            onChange={(e) => updateSeason(index, 'description', e.target.value)}
                            placeholder="e.g., Dry Season"
                          />
                        </Form.Item>
                        <Form.Item label={<span className={styles.formLabel}>Months</span>} required>
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

      <GoogleMapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.getFieldValue('latitude')}
        initialLng={form.getFieldValue('longitude')}
      />
    </ConfigProvider>
  );
};

export default SubmissionForm;