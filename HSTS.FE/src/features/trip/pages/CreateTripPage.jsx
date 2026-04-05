import React, { useState, useMemo, useCallback } from 'react';
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  Card,
  Radio,
  Typography,
  Row,
  Col,
  Checkbox,
  Tag,
  Divider,
  Space,
  Spin,
  message,
} from 'antd';
import {
  EnvironmentOutlined,
  PlusOutlined,
  DeleteOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  HomeOutlined,
  RocketOutlined,
  AimOutlined,
  TagsOutlined,
  DownOutlined,
  RightOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripFormData } from '../hooks/useTripFormData';
import { useTripPlanner } from '../hooks/useTripPlanner';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import styles from './CreateTripPage.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND - Vietnamese Dong' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'KRW', label: 'KRW - Korean Won' },
  { value: 'THB', label: 'THB - Thai Baht' },
];

const SEGMENT_OPTIONS = [
  { label: '💰 Budget', value: 'Budget' },
  { label: '⭐ Standard', value: 'Standard' },
  { label: '💎 Luxury', value: 'Luxury' },
];

const HOTEL_OPTIONS = [
  { label: '💰 Budget', value: 'Budget' },
  { label: '⭐ Standard', value: 'Standard' },
  { label: '💎 Luxury', value: 'Luxury' },
];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_MAP_CENTER = [10.823099, 106.629664];
const PARENT_TAG_MIN_ID = 1;
const PARENT_TAG_MAX_ID = 16;

const InlineMapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const InlineMapCenterSync = ({ center }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!center || center.length !== 2) return;
    map.setView(center, map.getZoom());
  }, [map, center]);

  return null;
};

const CreateTripPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { provinces, rootTags, childTagsMap, districtsMap, loadingProvinces, loadingTags, fetchChildTags, fetchDistricts } = useTripFormData();
  const { loading, generateItinerary } = useTripPlanner();

  const [mapOpen, setMapOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [expandedRootTags, setExpandedRootTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');

  // Date range for computed fields
  const dateRange = Form.useWatch('dateRange', form);
  const groupSize = Form.useWatch('groupSize', form);
  const totalBudget = Form.useWatch('totalBudget', form);

  const computedFields = useMemo(() => {
    const start = dateRange?.[0];
    const end = dateRange?.[1];
    if (!start || !end) return null;

    const days = end.diff(start, 'day') + 1;
    const nights = days - 1;
    const perPerson = groupSize > 0 && totalBudget > 0 ? Math.round(totalBudget / groupSize) : 0;
    const perDay = days > 0 && totalBudget > 0 ? Math.round(totalBudget / days) : 0;

    return { days, nights, perPerson, perDay };
  }, [dateRange, groupSize, totalBudget]);

  const mapCenter = useMemo(() => {
    if (userLocation?.latitude != null && userLocation?.longitude != null) {
      return [userLocation.latitude, userLocation.longitude];
    }
    return DEFAULT_MAP_CENTER;
  }, [userLocation]);

  const parentTags = useMemo(() => {
    return (rootTags || [])
      .filter((tag) => {
        const tagId = Number(tag.id || tag.Id);
        return Number.isFinite(tagId) && tagId >= PARENT_TAG_MIN_ID && tagId <= PARENT_TAG_MAX_ID;
      })
      .sort((a, b) => Number(a.id || a.Id) - Number(b.id || b.Id));
  }, [rootTags]);

  const filteredRootTags = useMemo(() => {
    const keyword = tagSearch.trim().toLowerCase();
    if (!keyword) return parentTags;

    return parentTags.filter((tag) => {
      const tagName = String(tag.name || tag.Name || '').toLowerCase();
      return tagName.includes(keyword);
    });
  }, [parentTags, tagSearch]);

  // Get current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      message.error('Your browser does not support geolocation');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
        form.setFieldsValue({ latitude: loc.latitude, longitude: loc.longitude });
        message.success('Current location detected');
      },
      () => message.error('Unable to get location. Please enter manually.'),
    );
  }, [form]);

  const handleMapConfirm = useCallback((lat, lng) => {
    setUserLocation({ latitude: lat, longitude: lng });
    form.setFieldsValue({ latitude: lat, longitude: lng });
    setMapOpen(false);
  }, [form]);

  // Destination management
  const handleAddDestination = useCallback((provinceId) => {
    if (!provinceId) return;
    if (destinations.find((d) => d.provinceId === provinceId)) {
      message.warning('This province is already selected');
      return;
    }
    const province = provinces.find((p) => (p.id || p.Id) === provinceId);
    if (!province) return;

    setDestinations((prev) => [...prev, {
      provinceId,
      provinceName: province.name || province.Name,
      districtIds: [],
      allDistricts: true,
    }]);
    fetchDistricts(provinceId);
  }, [destinations, provinces, fetchDistricts]);

  const handleRemoveDestination = useCallback((provinceId) => {
    setDestinations((prev) => prev.filter((d) => d.provinceId !== provinceId));
  }, []);

  const handleDistrictToggle = useCallback((provinceId, districtId, checked) => {
    setDestinations((prev) => prev.map((d) => {
      if (d.provinceId !== provinceId) return d;
      let newIds;
      if (checked) {
        newIds = [...d.districtIds, districtId];
      } else {
        newIds = d.districtIds.filter((id) => id !== districtId);
      }
      return { ...d, districtIds: newIds, allDistricts: false };
    }));
  }, []);

  const handleAllDistrictsToggle = useCallback((provinceId, checked) => {
    setDestinations((prev) => prev.map((d) => {
      if (d.provinceId !== provinceId) return d;
      return { ...d, allDistricts: checked, districtIds: [] };
    }));
  }, []);

  // Tag management
  const handleRootTagExpand = useCallback(async (tagId) => {
    const isExpanded = expandedRootTags.includes(tagId);
    setExpandedRootTags((prev) => (isExpanded ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
    if (!isExpanded) {
      await fetchChildTags(tagId);
    }
  }, [expandedRootTags, fetchChildTags]);

  const handleRootTagToggle = useCallback(async (tagId) => {
    if (tagId == null) return;

    const isSelected = selectedTagIds.includes(tagId);

    if (isSelected) {
      const childIdsOfThisRoot = new Set(
        (childTagsMap[tagId] || [])
          .map((child) => child.id || child.Id)
          .filter((childId) => childId != null)
      );

      setSelectedTagIds((prev) => prev.filter((id) => id !== tagId && !childIdsOfThisRoot.has(id)));
      return;
    }

    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]));
    if (!expandedRootTags.includes(tagId)) {
      setExpandedRootTags((prev) => [...prev, tagId]);
    }
    await fetchChildTags(tagId);
  }, [selectedTagIds, childTagsMap, expandedRootTags, fetchChildTags]);

  const handleTagSelect = useCallback((tagId, checked) => {
    setSelectedTagIds((prev) => {
      if (checked) {
        return prev.includes(tagId) ? prev : [...prev, tagId];
      }
      return prev.filter((id) => id !== tagId);
    });
  }, []);

  // Form submit
  const handleSubmit = async (values) => {
    if (!userLocation) {
      message.error('Please select a starting point');
      return;
    }
    if (destinations.length === 0) {
      message.error('Please select at least 1 destination');
      return;
    }

    const [startDate, endDate] = values.dateRange;

    const formData = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      destinations: destinations.map((d) => ({
        provinceId: d.provinceId,
        districtIds: d.allDistricts ? [] : d.districtIds,
      })),
      userFavoriteTagIds: selectedTagIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
      currencyCode: values.currencyCode,
      groupSize: values.groupSize,
      minimumAge: values.minimumAge ?? 0,
      totalBudget: values.totalBudget,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      hotelPreference: values.hotelPreference || null,
      tripSegment: values.tripSegment,
    };

    try {
      await generateItinerary(formData);
      navigate('/itinerary');
    } catch {
      // error already handled in hook
    }
  };

  const selectedProvinceIds = destinations.map((d) => d.provinceId);

  return (
    <div className={styles.createTripPage}>
      <div className={styles.formContainer}>
        {/* Header */}
        <Card className={styles.headerCard} bordered={false}>
          <Title level={2} className={styles.headerTitle}>
            🗺️ Create Travel Itinerary
          </Title>
          <div className={styles.headerSubtitle}>
            The system will automatically create an optimized itinerary based on your preferences and budget
          </div>
        </Card>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            groupSize: 2,
            minimumAge: 0,
            currencyCode: 'VND',
            tripSegment: 'Standard',
            hotelPreference: 'Standard',
          }}
          size="large"
        >
          {/* 1. Starting Point */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><EnvironmentOutlined /> Starting Point</span>}
          >
            <div className={styles.mapInlineWrapper}>
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ width: '100%', height: 240 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {userLocation && (
                  <Marker position={[userLocation.latitude, userLocation.longitude]} />
                )}
                <InlineMapClickHandler
                  onPick={(lat, lng) => {
                    setUserLocation({ latitude: lat, longitude: lng });
                    form.setFieldsValue({ latitude: lat, longitude: lng });
                  }}
                />
                <InlineMapCenterSync center={mapCenter} />
              </MapContainer>
            </div>
            <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setMapOpen(true)}>
              Open full map picker
            </Button>

            {userLocation && (
              <div className={styles.locationDisplay}>
                📍 Lat: {userLocation.latitude.toFixed(6)}, Lng: {userLocation.longitude.toFixed(6)}
              </div>
            )}

            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={10}>
                <Form.Item name="latitude" label="Latitude">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={-90} max={90} step={0.000001}
                    placeholder="10.7725"
                    onChange={(val) => {
                      const lng = form.getFieldValue('longitude');
                      if (val != null && lng != null) setUserLocation({ latitude: val, longitude: lng });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="longitude" label="Longitude">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={-180} max={180} step={0.000001}
                    placeholder="106.6980"
                    onChange={(val) => {
                      const lat = form.getFieldValue('latitude');
                      if (lat != null && val != null) setUserLocation({ latitude: lat, longitude: val });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={4} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
                <Button icon={<AimOutlined />} onClick={handleGetCurrentLocation}>
                  GPS
                </Button>
              </Col>
            </Row>

            <GoogleMapPicker
              open={mapOpen}
              onClose={() => setMapOpen(false)}
              onConfirm={handleMapConfirm}
              initialLat={userLocation?.latitude}
              initialLng={userLocation?.longitude}
            />
          </Card>

          {/* 2. Destinations */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><EnvironmentOutlined style={{ color: '#52c41a' }} /> Destinations</span>}
          >
            <Row gutter={12}>
              <Col flex="auto">
                <Select
                  showSearch
                  placeholder="Select province/city..."
                  loading={loadingProvinces}
                  optionFilterProp="label"
                  options={provinces
                    .filter((p) => !selectedProvinceIds.includes(p.id || p.Id))
                    .map((p) => ({ value: p.id || p.Id, label: p.name || p.Name }))}
                  onSelect={handleAddDestination}
                  value={null}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>

            {destinations.length === 0 && (
              <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                Select at least 1 province/city as destination
              </Text>
            )}

            {destinations.map((dest) => {
              const districts = districtsMap[dest.provinceId] || [];
              return (
                <div key={dest.provinceId} className={styles.destinationItem}>
                  <div className={styles.destinationHeader}>
                    <span className={styles.destinationName}>📍 {dest.provinceName}</span>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveDestination(dest.provinceId)}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>
                      Districts:
                    </Text>
                    <Checkbox
                      checked={dest.allDistricts}
                      onChange={(e) => handleAllDistrictsToggle(dest.provinceId, e.target.checked)}
                    >
                      All
                    </Checkbox>
                    {!dest.allDistricts && districts.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {districts.map((district) => (
                          <Checkbox
                            key={district.id || district.Id}
                            checked={dest.districtIds.includes(district.id || district.Id)}
                            onChange={(e) => handleDistrictToggle(dest.provinceId, district.id || district.Id, e.target.checked)}
                          >
                            {district.name || district.Name}
                          </Checkbox>
                        ))}
                      </div>
                    )}
                    {!dest.allDistricts && districts.length === 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}> Loading districts...</Text>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>

          {/* 3. Tags / Preferences */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><TagsOutlined /> Your Preferences</span>}
          >
            {loadingTags ? (
              <Spin />
            ) : (
              <div className={styles.tagPreferencePanel}>
                <div className={styles.tagSearchRow}>
                  <Input
                    allowClear
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Search tags by name"
                  />
                  <Text type="secondary">{selectedTagIds.length} selected</Text>
                </div>

                {filteredRootTags.length === 0 && (
                  <Text type="secondary">No tags match your search.</Text>
                )}

                {filteredRootTags.map((tag) => {
                  const tagId = tag.id || tag.Id;
                  const tagName = tag.name || tag.Name;
                  const isExpanded = expandedRootTags.includes(tagId);
                  const isRootSelected = selectedTagIds.includes(tagId);
                  const children = childTagsMap[tagId] || [];
                  const selectedChildrenCount = children.filter((child) => selectedTagIds.includes(child.id || child.Id)).length;

                  return (
                    <div key={tagId} className={styles.rootTagBlock}>
                      <div className={styles.rootTagRow}>
                        <button
                          type="button"
                          className={`${styles.rootTagButton} ${isRootSelected ? styles.rootTagButtonActive : ''}`}
                          onClick={() => handleRootTagToggle(tagId)}
                        >
                          <span>{tagName}</span>
                          <span className={styles.rootTagMeta}>
                            {selectedChildrenCount > 0 ? `${selectedChildrenCount} child` : ''}
                            {isRootSelected ? <CheckOutlined /> : null}
                          </span>
                        </button>
                        <Button
                          type="text"
                          size="small"
                          className={styles.expandButton}
                          icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                          onClick={() => handleRootTagExpand(tagId)}
                        />
                      </div>

                      {isExpanded && children.length > 0 && (
                        <div className={styles.childTagGrid}>
                          {children.map((child) => {
                            const childId = child.id || child.Id;
                            const isChildSelected = selectedTagIds.includes(childId);
                            return (
                              <button
                                type="button"
                                key={childId}
                                className={`${styles.childTagButton} ${isChildSelected ? styles.childTagButtonActive : ''}`}
                                onClick={() => handleTagSelect(childId, !isChildSelected)}
                              >
                                {child.name || child.Name}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {isExpanded && children.length === 0 && (
                        <Text type="secondary" className={styles.childTagHint}>No child tags</Text>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 4. Group Info */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><TeamOutlined /> Group Information</span>}
          >
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="groupSize"
                  label="Group Size"
                  rules={[{ required: true, message: 'Please enter group size' }]}
                >
                  <InputNumber min={1} max={50} style={{ width: '100%' }} addonAfter="people" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="minimumAge"
                  label="Minimum Age"
                  rules={[{ required: true, message: 'Please enter minimum age' }]}
                >
                  <InputNumber min={0} max={120} style={{ width: '100%' }} addonAfter="years" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 5. Budget */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><DollarOutlined /> Budget</span>}
          >
            <Row gutter={16}>
              <Col xs={24} sm={16}>
                <Form.Item
                  name="totalBudget"
                  label="Total Budget"
                  rules={[{ required: true, message: 'Please enter budget' }]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/,/g, '')}
                    placeholder="5,000,000"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="currencyCode"
                  label="Currency"
                  rules={[{ required: true, message: 'Select currency' }]}
                >
                  <Select options={CURRENCY_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>

            {computedFields && totalBudget > 0 && (
              <div className={styles.computedInfo}>
                <div className={styles.computedItem}>
                  <span className={styles.computedLabel}>Budget per person:</span>
                  <span className={styles.computedValue}>
                    {computedFields.perPerson.toLocaleString()} {form.getFieldValue('currencyCode')}
                  </span>
                </div>
                <div className={styles.computedItem}>
                  <span className={styles.computedLabel}>Budget per day:</span>
                  <span className={styles.computedValue}>
                    {computedFields.perDay.toLocaleString()} {form.getFieldValue('currencyCode')}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* 6. Dates */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><CalendarOutlined /> Travel Dates</span>}
          >
            <Form.Item
              name="dateRange"
              label="Start Date - End Date"
              rules={[{ required: true, message: 'Please select dates' }]}
            >
              <RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>

            {computedFields && (
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                📅 {computedFields.days} days {computedFields.nights} nights
              </Tag>
            )}
          </Card>

          {/* 7. Accommodation & Trip Segment */}
          <Card
            className={styles.sectionCard}
            title={<span className={styles.sectionTitle}><HomeOutlined /> Accommodation Options</span>}
          >
            <Form.Item
              name="hotelPreference"
              label="Hotel Preference"
            >
              <Radio.Group options={HOTEL_OPTIONS} optionType="button" buttonStyle="solid" />
            </Form.Item>

            <Form.Item
              name="tripSegment"
              label="Trip Segment"
              rules={[{ required: true, message: 'Select trip segment' }]}
            >
              <Radio.Group options={SEGMENT_OPTIONS} optionType="button" buttonStyle="solid" />
            </Form.Item>
          </Card>

          {/* Submit Button */}
          <div className={styles.submitSection}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<RocketOutlined />}
              className={styles.submitButton}
            >
              {loading ? 'Generating Itinerary...' : 'Generate Itinerary'}
            </Button>
            {loading && (
              <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                The system is analyzing and optimizing your itinerary, please wait...
              </Text>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
};

export default CreateTripPage;
