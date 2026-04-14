import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Space, Button, Upload, message, Tag, Table, TimePicker, Card, Divider, Rate } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, PictureOutlined, EnvironmentOutlined, MinusCircleOutlined, ClockCircleOutlined, CloudOutlined } from '@ant-design/icons';
import { createLocationApi, updateLocationApi, getAllDistrictsApi, getAllLocationTypesApi, getAllAmenitiesApi, getAllTagsApi } from '../api';
import { uploadImageToCloudinary } from '@/services/cloudinary';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import { SOCIAL_PLATFORMS, DAYS_OF_WEEK, MONTHS } from '@/utils/locationConstants';
import { buildTagHierarchy } from '@/utils/locationCache';
import dayjs from 'dayjs';
import styles from '../styles/LocationForm.module.css';

const { TextArea } = Input;
const { Option } = Select;

const getPlatformName = (platform) => {
  if (typeof platform === 'string') return platform;
  const platformObj = SOCIAL_PLATFORMS.find(p => p.enumValue === platform);
  return platformObj ? platformObj.value : 'Other';
};

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
  const [selectedChildTagIds, setSelectedChildTagIds] = useState([]);
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

  useEffect(() => {
    const fetchDropdownData = async () => {
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
        const locationTypes = Array.isArray(typesRes) ? typesRes : (typesRes?.items || []);
        const amenities = Array.isArray(amenitiesRes) ? amenitiesRes : (amenitiesRes?.items || []);

        const { rootTags, childTagsByParent } = buildTagHierarchy(allTags);

        setRootTags(rootTags);
        setDistricts(districts);
        setLocationTypes(locationTypes);
        setAmenities(amenities);
        setChildTagsByParent(childTagsByParent);
      } catch (error) {
        message.error('Failed to load dropdown data');
      } finally {
        setTagsLoading(false);
      }
    };
    fetchDropdownData();
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
    if (location && location.tagIds && location.tagIds.length > 0 && rootTags.length > 0) {
      const childTagIds = location.tagIds.filter(id => childTagsByParent);
      
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

      form.setFieldValue('tagIds', childTagIds);
    }
  }, [location, rootTags, childTagsByParent]);

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
      
      setSelectedChildTagIds(location.tagIds || []);
      setMediaLinks(location.mediaLinks || []);
      setSocialLinks(location.socialLinks?.map(sl => ({
        id: sl.id,
        platform: getPlatformName(sl.platform),
        url: sl.url
      })) || []);
    }

    if (location) {
      setOpeningHours(location.openingHours || []);
      setSeasons(location.seasons?.map(season => ({
        id: season.id,
        description: season.description,
        months: typeof season.months === 'string' ? season.months.split(',').filter(m => m) : (season.months || [])
      })) || []);
    } else if (!location) {
      form.resetFields();
      setMediaLinks([]);
      setSocialLinks([]);
      setOpeningHours([]);
      setSeasons([]);
    }
  }, [location, amenities, locationTypes, districts, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const formattedSocialLinks = socialLinks.length > 0
        ? socialLinks
            .filter(sl => sl.platform && sl.url && sl.url.trim() !== '')
            .map(sl => ({
                platform: getPlatformEnumValue(sl.platform),
                url: sl.url.trim()
              }))
        : [];

      const formattedSeasons = seasons.length > 0
        ? seasons.map(season => ({
            id: season.id,
            description: season.description,
            months: Array.isArray(season.months) ? season.months.join(',') : season.months
          }))
        : [];

      const payload = {
        ...values,
        tagIds: selectedChildTagIds,
        mediaLinks: mediaLinks.length > 0 ? mediaLinks : [],
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
      if (error?.response?.status === 409) {
        const errorMessage = error.response.data?.description || error.response.data?.message || 'Duplicate name detected';
        message.error(errorMessage);
      } else if (error?.response?.status === 400) {
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
    return Upload.LIST_IGNORE;
  };

  const handleMapConfirm = (lat, lng) => {
    form.setFieldsValue({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    });
    message.success('Location coordinates updated!');
  };

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
      title={<span className={styles.modalTitle}>{isEdit ? 'Edit Location' : 'Create Location'}</span>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={900}
      rootClassName={styles.tropicalModal}
      okButtonProps={{ className: styles.btnSubmit }}
      cancelButtonProps={{ className: styles.btnCancel }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className={styles.tropicalForm}>
        <Form.Item
          name="name"
          label={<span className={styles.formLabel}>Location Name</span>}
          rules={[
            { required: true, message: 'Please enter location name' },
            { max: 200, message: 'Location name cannot exceed 200 characters' }
          ]}
        >
          <Input placeholder="Enter location name" className={styles.customInput} />
        </Form.Item>

        <Form.Item
          name="description"
          label={<span className={styles.formLabel}>Description</span>}
          rules={[{ max: 2000, message: 'Description cannot exceed 2000 characters' }]}
        >
          <TextArea rows={3} placeholder="Enter description" className={styles.customInput} />
        </Form.Item>

        <Space direction="horizontal" style={{ width: '100%' }} size="large" className={styles.spaceRow}>
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
                  className={styles.linkBtnInfo}
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
            <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="e.g., 10.823099" className={styles.customInput} />
          </Form.Item>

          <Form.Item
            name="longitude"
            label={<span className={styles.formLabel}>Longitude</span>}
            rules={[
              { required: true, message: 'Please enter longitude' },
              { type: 'number', min: -180, max: 180, message: 'Longitude must be between -180 and 180' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="e.g., 106.629664" className={styles.customInput} />
          </Form.Item>
        </Space>

        <Space direction="horizontal" style={{ width: '100%' }} size="large" className={styles.spaceRow}>
          <Form.Item
            name="ticketPrice"
            label={<span className={styles.formLabel}>Ticket Price</span>}
            rules={[
              { required: true, message: 'Please enter ticket price' },
              { type: 'number', min: 0, message: 'Price must be >= 0' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={1} min={0} placeholder="0" className={styles.customInput} />
          </Form.Item>

          <Form.Item
            name="minimumAge"
            label={<span className={styles.formLabel}>Minimum Age</span>}
            rules={[
              { required: true, message: 'Please enter minimum age' },
              { type: 'number', min: 0, max: 120, message: 'Age must be between 0 and 120' }
            ]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} placeholder="e.g., 5" className={styles.customInput} />
          </Form.Item>
        </Space>

        <Space direction="horizontal" style={{ width: '100%' }} size="large" className={styles.spaceRow}>
          <Form.Item
            name="priceMinUsd"
            label={<span className={styles.formLabel}>Min Price</span>}
            rules={[{ min: 0, type: 'number', message: 'Min price must be >= 0' }]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={1} min={0} placeholder="0" className={styles.customInput} />
          </Form.Item>

          <Form.Item
            name="priceMaxUsd"
            label={<span className={styles.formLabel}>Max Price</span>}
            rules={[{ min: 0, type: 'number', message: 'Max price must be >= 0' }]}
            style={{ width: '48%' }}
          >
            <InputNumber style={{ width: '100%' }} step={1} min={0} placeholder="0" className={styles.customInput} />
          </Form.Item>
        </Space>

        <Form.Item
          name="address"
          label={<span className={styles.formLabel}>Address</span>}
          rules={[
            { required: true, message: 'Please enter address' },
            { max: 300, message: 'Address cannot exceed 300 characters' }
          ]}
        >
          <Input placeholder="Enter address" className={styles.customInput} />
        </Form.Item>

        <Space direction="horizontal" style={{ width: '100%' }} size="large" className={styles.spaceRow}>
          <Form.Item
            name="telephone"
            label={<span className={styles.formLabel}>Telephone</span>}
            rules={[{ max: 50, message: 'Telephone cannot exceed 50 characters' }]}
            style={{ width: '48%' }}
          >
            <Input placeholder="Enter telephone" className={styles.customInput} />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span className={styles.formLabel}>Email</span>}
            rules={[
              { type: 'email', message: 'Please enter a valid email' },
              { max: 200, message: 'Email cannot exceed 200 characters' }
            ]}
            style={{ width: '48%' }}
          >
            <Input placeholder="Enter email" className={styles.customInput} />
          </Form.Item>
        </Space>

        <Form.Item
          name="recommendedDurationMinutes"
          label={<span className={styles.formLabel}>Recommended Duration (minutes)</span>}
          rules={[{ min: 0, type: 'integer', message: 'Duration must be >= 0' }]}
        >
          <InputNumber style={{ width: '100%' }} step={15} min={0} placeholder="e.g., 60" className={styles.customInput} />
        </Form.Item>

        <Form.Item
          name="score"
          label={<span className={styles.formLabel}>Score (0-5 stars)</span>}
        >
          <Rate allowHalf style={{ fontSize: 24 }} className={styles.starRate} />
        </Form.Item>

        <Space direction="horizontal" style={{ width: '100%' }} size="large" className={styles.spaceRow}>
          <Form.Item
            name="locationTypeId"
            label={<span className={styles.formLabel}>Location Type</span>}
            rules={[{ required: true, message: 'Please select location type' }]}
            style={{ width: '50%', minWidth: '200px' }}
          >
            <Select 
              placeholder="Select location type" 
              showSearch 
              optionFilterProp="children"
              loading={locationTypes.length === 0}
              className={styles.customInput}
            >
              {Array.isArray(locationTypes) && locationTypes.map(type => (
                <Option key={type.id} value={type.id}>{type.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="districtId"
            label={<span className={styles.formLabel}>District</span>}
            rules={[{ required: true, message: 'Please select district' }]}
            style={{ width: '50%', minWidth: '200px' }}
          >
            <Select placeholder="Select district" showSearch optionFilterProp="children" className={styles.customInput}>
              {Array.isArray(districts) && districts.map(district => (
                <Option key={district.id} value={district.id}>{district.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Space>

        <Form.Item
          label={<span className={styles.formLabel}>Parent Tags</span>}
        >
          <Select
            mode="multiple"
            placeholder="Select parent tags to filter child tags"
            value={selectedParentTagIds}
            style={{ width: '100%', marginBottom: 16 }}
            onChange={handleParentTagChange}
            optionFilterProp="children"
            showSearch
            className={styles.customInput}
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
            className={styles.customInput}
          >
            {availableChildTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                {tag.name} <span style={{ color: '#FF6B6B' }}>(Child)</span>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amenityIds"
          label={<span className={styles.formLabel}>Amenities</span>}
          initialValue={[]}
        >
          <Select
            mode="multiple"
            labelInValue
            placeholder="Select amenities"
            style={{ width: '100%' }}
            maxTagCount="responsive"
            className={styles.customInput}
          >
            {amenities.map(amenity => (
              <Option key={amenity.id} value={amenity.id}>{amenity.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={<span className={styles.formLabel}>Media (Images)</span>}>
          <Upload
            accept="image/*"
            beforeUpload={handleImageUpload}
            showUploadList={false}
            multiple={false}
          >
            <Button className={styles.btnActionSecondary} icon={<UploadOutlined />}>Upload Image to Cloudinary</Button>
          </Upload>

          <div style={{ marginTop: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Or paste image URL here"
                value={newMediaLink}
                onChange={(e) => setNewMediaLink(e.target.value)}
                onPressEnter={handleAddMediaLink}
                className={styles.customInputCompact}
              />
              <Button className={styles.btnPrimary} onClick={handleAddMediaLink} icon={<PlusOutlined />}>
                Add URL
              </Button>
            </Space.Compact>
          </div>
          
          {mediaLinks.length > 0 && (
            <div className={styles.mediaList}>
              {mediaLinks.map((link, index) => (
                <div key={index} className={styles.mediaItem}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <PictureOutlined style={{ marginRight: 8, color: '#4ECDC4' }} />
                    <span className={styles.mediaLinkText}>{link}</span>
                  </div>
                  <Space>
                    <a href={link} target="_blank" rel="noopener noreferrer" className={styles.mediaViewLink}>View</a>
                    <Button type="text" className={styles.btnDangerIcon} size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveMediaLink(index)} />
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Form.Item>

        <Form.Item label={<span className={styles.formLabel}>Social Links</span>}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Select
              placeholder="Add social platform"
              onChange={handleAddSocialLink}
              value={null}
              style={{ width: '100%' }}
              className={styles.customInput}
            >
              {SOCIAL_PLATFORMS
                .filter(platform => !getUsedPlatforms().includes(platform.value))
                .map(platform => (
                  <Option key={platform.value} value={platform.value}>{platform.label}</Option>
                ))}
            </Select>

            {socialLinks.length > 0 && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {socialLinks.map((socialLink, index) => (
                  <div key={index} className={styles.socialItem}>
                    <Tag className={styles.tagPrimary} style={{ minWidth: '100px', textAlign: 'center' }}>
                      {SOCIAL_PLATFORMS.find(p => p.value === socialLink.platform)?.label || socialLink.platform}
                    </Tag>
                    <Input
                      placeholder="Enter URL"
                      value={socialLink.url}
                      onChange={(e) => handleUpdateSocialLink(index, e.target.value)}
                      style={{ flex: 1 }}
                      className={styles.customInput}
                    />
                    <Button
                      type="text"
                      className={styles.btnDangerIcon}
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

        <Divider className={styles.customDivider} orientation="left"><ClockCircleOutlined /> Opening Hours</Divider>
        <Form.Item label=" ">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <Button className={styles.btnDashed} onClick={handleAddAllOpeningHours} icon={<PlusOutlined />}>
                Add All Days
              </Button>
              <Select
                placeholder="Add specific day"
                onChange={handleAddOpeningHour}
                value={null}
                style={{ width: 200 }}
                className={styles.customInput}
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
                className={styles.tropicalTable}
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
                        className={styles.customInput}
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
                        className={styles.customInput}
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
                        className={styles.customInput}
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
                        className={styles.btnDangerIcon}
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

        <Divider className={styles.customDivider} orientation="left"><CloudOutlined /> Best Seasons to Visit</Divider>
        <Form.Item label=" ">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button className={styles.btnDashed} onClick={handleAddSeason} icon={<PlusOutlined />}>
              Add Season
            </Button>

            {seasons.length > 0 && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {seasons.map((season, index) => (
                  <Card
                    key={index}
                    size="small"
                    type="inner"
                    title={<span className={styles.cardTitle}>Season {index + 1}</span>}
                    className={styles.tropicalCard}
                    extra={
                      <Button
                        type="text"
                        className={styles.btnDangerIcon}
                        size="small"
                        icon={<MinusCircleOutlined />}
                        onClick={() => handleRemoveSeason(index)}
                      />
                    }
                    style={{ maxWidth: 800 }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Form.Item label={<span className={styles.formLabel}>Description</span>} required>
                        <Input
                          value={season.description}
                          onChange={(e) => handleUpdateSeason(index, 'description', e.target.value)}
                          placeholder="e.g., Dry Season, Best time for beach activities"
                          className={styles.customInput}
                        />
                      </Form.Item>
                      <Form.Item label={<span className={styles.formLabel}>Months</span>} required>
                        <Select
                          mode="multiple"
                          value={season.months}
                          onChange={(value) => handleUpdateSeason(index, 'months', value)}
                          placeholder="Select months"
                          style={{ width: '100%' }}
                          className={styles.customInput}
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