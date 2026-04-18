import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Form, InputNumber, DatePicker, Select, Button, Card, Radio, Typography, Row, Col, Checkbox, Tag, Spin, message, ConfigProvider, Steps, Alert } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripFormData, parseTripPrefillParams } from '../hooks/useTripFormData';
import { useTripPlanner } from '../hooks/useTripPlanner';
import { CURRENCY_OPTIONS } from '../constants/currency';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import { PATHS } from '@/routes/paths';
import styles from '../styles/CreateTripPage.module.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const HOTEL_PREFERENCE_NONE = 'NONE';
const SEGMENT_OPTIONS = [{ label: 'Budget', value: 'Budget' }, { label: 'Standard', value: 'Standard' }, { label: 'Luxury', value: 'Luxury' }];
const HOTEL_OPTIONS = [{ label: 'No preference', value: HOTEL_PREFERENCE_NONE }, { label: 'Budget', value: 'Budget' }, { label: 'Standard', value: 'Standard' }, { label: 'Luxury', value: 'Luxury' }];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_MAP_CENTER = [10.823099, 106.629664];
const PARENT_TAG_MIN_ID = 1;
const PARENT_TAG_MAX_ID = 16;

const getDisplayNameWithEnglish = (item) => {
  const localName = String(item?.name || item?.Name || '').trim();
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  if (localName && englishName && localName.toLowerCase() !== englishName.toLowerCase()) {
    return `${localName} (${englishName})`;
  }
  return localName || englishName || '';
};

const getEnglishPreferredName = (item) => {
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  const localName = String(item?.name || item?.Name || '').trim();
  return englishName || localName || '';
};

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

const uiTheme = {
  token: {
    colorPrimary: '#0077B6',
    colorInfo: '#4ECDC4',
    colorTextBase: '#1A535C',
    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
    borderRadius: 8,
    colorBgContainer: '#FFFFFF',
    controlHeight: 44,
  },
  components: {
    Card: { borderRadiusLG: 20 },
    Button: { fontWeight: 600 },
  }
};

const CreateTripPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { provinces, rootTags, childTagsMap, districtsMap, loadingProvinces, loadingTags, fetchChildTags, fetchDistricts } = useTripFormData();
  const { loading, generateItinerary } = useTripPlanner();

  const [currentStep, setCurrentStep] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [activeParentTagId, setActiveParentTagId] = useState(null);
  const [prefillSummaryDismissed, setPrefillSummaryDismissed] = useState(false);
  const prefillAppliedRef = useRef(false);
  const prefillInjectedRef = useRef({
    addedProvinceId: null,
    addedProvinceInitial: null,
    addedTagIds: [],
    fallbackBackup: null,
  });

  const prefill = useMemo(() => parseTripPrefillParams(searchParams), [searchParams]);
  const hasPrefillContext = prefill.provinceId != null || prefill.districtId != null || prefill.tagIds.length > 0;

  const clearPrefillContext = useCallback(() => {
    const injected = prefillInjectedRef.current;

    setDestinations((prev) => {
      let next = prev;

      if (injected.addedProvinceId != null) {
        const current = next.find((destination) => Number(destination.provinceId) === Number(injected.addedProvinceId));
        const initial = injected.addedProvinceInitial;
        const unchanged = Boolean(current && initial
          && current.allDistricts === initial.allDistricts
          && current.districtIds.length === initial.districtIds.length
          && current.districtIds.every((id, index) => Number(id) === Number(initial.districtIds[index])));

        if (unchanged) {
          next = next.filter((destination) => Number(destination.provinceId) !== Number(injected.addedProvinceId));
        }
      }

      if (injected.fallbackBackup) {
        next = next.map((destination) => {
          if (Number(destination.provinceId) !== Number(injected.fallbackBackup.provinceId)) return destination;
          const stillFallback = destination.allDistricts === true && destination.districtIds.length === 0;
          return stillFallback ? injected.fallbackBackup.destination : destination;
        });
      }

      return next;
    });

    if (injected.addedTagIds.length > 0) {
      setSelectedTagIds((prev) => prev.filter((id) => !injected.addedTagIds.includes(Number(id))));
    }

    prefillInjectedRef.current = { addedProvinceId: null, addedProvinceInitial: null, addedTagIds: [], fallbackBackup: null };
    setPrefillSummaryDismissed(false);
    navigate(PATHS.CREATE_TRIP, { replace: true });
  }, [navigate]);

  useEffect(() => {
    prefillAppliedRef.current = false;
    prefillInjectedRef.current = { addedProvinceId: null, addedProvinceInitial: null, addedTagIds: [], fallbackBackup: null };
    setPrefillSummaryDismissed(false);
  }, [prefill.provinceId, prefill.districtId, prefill.tagIds]);

  useEffect(() => {
    if (prefillAppliedRef.current || provinces.length === 0 || !hasPrefillContext) return;

    if (prefill.provinceId != null) {
      const province = provinces.find((item) => Number(item.id || item.Id) === prefill.provinceId);
      if (province) {
        fetchDistricts(prefill.provinceId);
        setDestinations((prev) => {
          const exists = prev.some((destination) => Number(destination.provinceId) === prefill.provinceId);
          if (exists) return prev;

          const injectedDestination = {
            provinceId: prefill.provinceId,
            provinceName: getEnglishPreferredName(province),
            districtIds: prefill.districtId != null ? [prefill.districtId] : [],
            allDistricts: prefill.districtId == null,
          };

          prefillInjectedRef.current.addedProvinceId = prefill.provinceId;
          prefillInjectedRef.current.addedProvinceInitial = {
            allDistricts: injectedDestination.allDistricts,
            districtIds: [...injectedDestination.districtIds],
          };

          return [...prev, injectedDestination];
        });
      }
    }

    if (prefill.tagIds.length > 0) {
      setSelectedTagIds((prev) => {
        const added = prefill.tagIds.filter((tagId) => !prev.includes(tagId));
        prefillInjectedRef.current.addedTagIds = added;
        return Array.from(new Set([...prev, ...prefill.tagIds]));
      });
    }

    prefillAppliedRef.current = true;
  }, [hasPrefillContext, prefill, provinces, fetchDistricts]);

  useEffect(() => {
    if (prefill.provinceId == null || prefill.districtId == null) return;

    const districts = districtsMap[prefill.provinceId] || [];
    if (districts.length === 0) return;

    const hasValidDistrict = districts.some((district) => Number(district.id || district.Id) === prefill.districtId);

    if (!hasValidDistrict) {
      setDestinations((prev) => prev.map((destination) => {
        if (Number(destination.provinceId) !== prefill.provinceId) return destination;
        if (!prefillInjectedRef.current.fallbackBackup) {
          prefillInjectedRef.current.fallbackBackup = {
            provinceId: prefill.provinceId,
            destination: {
              ...destination,
              districtIds: [...destination.districtIds],
            },
          };
        }
        return { ...destination, districtIds: [], allDistricts: true };
      }));
    }
  }, [prefill.provinceId, prefill.districtId, districtsMap]);

  const dateRange = Form.useWatch('dateRange', form);
  const groupSize = Form.useWatch('groupSize', form);
  const enableMinimumAge = Form.useWatch('enableMinimumAge', form);
  const minimumAge = Form.useWatch('minimumAge', form);
  const tripSegment = Form.useWatch('tripSegment', form);
  const hotelPreference = Form.useWatch('hotelPreference', form);
  const totalBudget = Form.useWatch('totalBudget', form);
  const currencyCode = Form.useWatch('currencyCode', form);

  const isStepComplete = useCallback((stepIndex) => {
    switch (stepIndex) {
      case 0:
        return !!userLocation && destinations.length > 0;
      case 1:
        return !!dateRange && !!groupSize && (!enableMinimumAge || minimumAge != null);
      case 2:
        return selectedTagIds.length > 0 && !!tripSegment && !!hotelPreference;
      case 3:
        return totalBudget != null && !!currencyCode;
      default:
        return false;
    }
  }, [
    userLocation,
    destinations,
    dateRange,
    groupSize,
    enableMinimumAge,
    minimumAge,
    tripSegment,
    hotelPreference,
    totalBudget,
    currencyCode,
    selectedTagIds
  ]);

  const stepItems = useMemo(() => {
    const rawSteps = [
      { title: 'The Route' },
      { title: 'Dates & Crew' },
      { title: 'Vibes & Stay' },
      { title: 'Budget' }
    ];

    return rawSteps.map((step, index) => {
      let status;
      if (index === currentStep) {
        status = 'process';
      } else if (isStepComplete(index)) {
        status = 'finish';
      } else {
        status = 'wait';
      }
      return { ...step, status };
    });
  }, [currentStep, isStepComplete]);

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
    return (rootTags || []).filter((tag) => {
      const tagId = Number(tag.id || tag.Id);
      return Number.isFinite(tagId) && tagId >= PARENT_TAG_MIN_ID && tagId <= PARENT_TAG_MAX_ID;
    }).sort((a, b) => Number(a.id || a.Id) - Number(b.id || b.Id));
  }, [rootTags]);

  const parentTagIdSet = useMemo(() => new Set(parentTags.map((tag) => Number(tag.id || tag.Id)).filter((id) => Number.isFinite(id))), [parentTags]);

  const tagNameMap = useMemo(() => {
    const map = new Map();
    parentTags.forEach((tag) => {
      const id = Number(tag.id || tag.Id);
      if (!Number.isFinite(id)) return;
      map.set(id, getDisplayNameWithEnglish(tag) || `Tag ${id}`);
    });
    Object.values(childTagsMap).flat().forEach((tag) => {
      const id = Number(tag.id || tag.Id);
      if (!Number.isFinite(id)) return;
      map.set(id, getDisplayNameWithEnglish(tag) || `Tag ${id}`);
    });
    return map;
  }, [parentTags, childTagsMap]);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      message.error('Your browser does not support geolocation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
        form.setFieldsValue({ latitude: loc.latitude, longitude: loc.longitude });
        message.success('Current location detected successfully!');
      },
      () => message.error('Unable to get location. Please select it manually on the map.')
    );
  }, [form]);

  const handleMapConfirm = useCallback((lat, lng) => {
    setUserLocation({ latitude: lat, longitude: lng });
    form.setFieldsValue({ latitude: lat, longitude: lng });
    setMapOpen(false);
  }, [form]);

  const handleAddDestination = useCallback((provinceId) => {
    if (!provinceId) return;
    if (destinations.find((d) => d.provinceId === provinceId)) {
      message.warning('You have already added this destination');
      return;
    }
    const province = provinces.find((p) => (p.id || p.Id) === provinceId);
    if (!province) return;
    setDestinations((prev) => [...prev, { provinceId, provinceName: getEnglishPreferredName(province), districtIds: [], allDistricts: true }]);
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

  const handleRootTagToggle = useCallback(async (tagId) => {
    if (tagId == null) return;
    const isSelected = selectedTagIds.includes(tagId);
    if (isSelected) {
      const childIdsOfThisRoot = new Set((childTagsMap[tagId] || []).map((child) => child.id || child.Id).filter((childId) => childId != null));
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagId && !childIdsOfThisRoot.has(id)));
      return;
    }
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev : [...prev, tagId]));
    await fetchChildTags(tagId);
  }, [selectedTagIds, childTagsMap, fetchChildTags]);

  const handleParentTagChange = useCallback(async (tagId) => {
    setActiveParentTagId(tagId ?? null);
    if (tagId != null) {
      await fetchChildTags(tagId);
    }
  }, [fetchChildTags]);

  const handleTagSelect = useCallback((tagId, checked) => {
    setSelectedTagIds((prev) => {
      if (checked) {
        return prev.includes(tagId) ? prev : [...prev, tagId];
      }
      return prev.filter((id) => id !== tagId);
    });
  }, []);

  const handleRemoveSelectedTag = useCallback((tagId) => {
    if (parentTagIdSet.has(Number(tagId))) {
      void handleRootTagToggle(tagId);
      return;
    }
    handleTagSelect(tagId, false);
  }, [parentTagIdSet, handleRootTagToggle, handleTagSelect]);

  const handleNextStep = () => {
    setCurrentStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (targetStep) => {
    setCurrentStep(targetStep);
  };

  const onFinish = async (values) => {
    if (!isStepComplete(0)) {
      setCurrentStep(0);
      message.error('Please complete your starting point and destinations.');
      return;
    }

    if (!isStepComplete(2)) {
      setCurrentStep(2);
      message.error('Please select at least one favorite experience and your stay preferences.');
      return;
    }

    const [startDate, endDate] = values.dateRange;
    const formData = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      destinations: destinations.map((d) => ({ provinceId: d.provinceId, districtIds: d.allDistricts ? [] : d.districtIds })),
      userFavoriteTagIds: selectedTagIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
      currencyCode: values.currencyCode,
      groupSize: values.groupSize,
      minimumAge: values.enableMinimumAge ? values.minimumAge : null,
      totalBudget: values.totalBudget,
      includeContingencyFund: values.includeContingencyFund !== false,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      hotelPreference: values.hotelPreference === HOTEL_PREFERENCE_NONE ? null : (values.hotelPreference || null),
      tripSegment: values.tripSegment,
    };
    try {
      await generateItinerary(formData);
      navigate('/itinerary');
    } catch { }
  };

  const onFinishFailed = ({ errorFields }) => {
    const firstErrorField = errorFields[0].name[0];
    if (['dateRange', 'groupSize', 'minimumAge'].includes(firstErrorField)) {
      setCurrentStep(1);
    } else if (['tripSegment', 'hotelPreference'].includes(firstErrorField)) {
      setCurrentStep(2);
    } else if (['totalBudget', 'currencyCode'].includes(firstErrorField)) {
      setCurrentStep(3);
    }
    message.error('Please complete all required fields.');
  };

  const selectedProvinceIds = destinations.map((d) => d.provinceId);
  const activeParentTag = parentTags.find((tag) => (tag.id || tag.Id) === activeParentTagId);
  const activeParentChildren = activeParentTagId != null ? (childTagsMap[activeParentTagId] || []) : [];
  const selectedChildrenCount = activeParentChildren.filter((child) => selectedTagIds.includes(child.id || child.Id)).length;
  const selectedTagList = selectedTagIds.map((tagId) => {
    const numericId = Number(tagId);
    return { id: tagId, name: tagNameMap.get(numericId) || `Tag ${tagId}`, isParent: parentTagIdSet.has(numericId) };
  });

  const prefilledDestination = prefill.provinceId != null
    ? destinations.find((destination) => Number(destination.provinceId) === prefill.provinceId)
    : null;

  const prefillBadges = useMemo(() => {
    const badges = [];

    if (prefilledDestination) {
      const provinceLabel = prefilledDestination.provinceName || `Province ${prefill.provinceId}`;
      if (prefill.districtId != null && !prefilledDestination.allDistricts && prefilledDestination.districtIds.includes(prefill.districtId)) {
        const district = (districtsMap[prefilledDestination.provinceId] || []).find((item) => Number(item.id || item.Id) === prefill.districtId);
        badges.push({ key: 'destination', label: `Destination: ${provinceLabel} / ${getEnglishPreferredName(district) || `District ${prefill.districtId}`}` });
      } else {
        badges.push({ key: 'destination', label: `Destination: ${provinceLabel} (all districts)` });
      }
    }

    if (prefill.tagIds.length > 0) {
      const selectedPrefillTags = prefill.tagIds.filter((tagId) => selectedTagIds.includes(tagId));
      if (selectedPrefillTags.length > 0) {
        badges.push({
          key: 'tags',
          label: `Interests: ${selectedPrefillTags.map((tagId) => tagNameMap.get(Number(tagId)) || `Tag ${tagId}`).join(', ')}`,
        });
      }
    }

    return badges;
  }, [prefilledDestination, prefill, selectedTagIds, tagNameMap, districtsMap]);

  const showPrefillSummary = hasPrefillContext && !prefillSummaryDismissed && prefillBadges.length > 0;
  const dismissPrefillSummary = useCallback(() => setPrefillSummaryDismissed(true), []);

  return (
    <ConfigProvider theme={uiTheme}>
      <div className={styles.createTripPage}>
        <div className={styles.formContainer}>

          <div className={styles.headerCard}>
            <Title level={2} className={styles.headerTitle}>Plan Your Perfect Trip</Title>
            <div className={styles.headerSubtitle}>Follow a few simple steps to craft an itinerary just for you</div>
          </div>

          <Steps current={currentStep} onChange={handleStepClick} items={stepItems} className={styles.stepper} />

          {showPrefillSummary && (
            <Alert
              type="info"
              showIcon
              message="Prefilled from discovery"
              description={(
                <div>
                  <div style={{ marginBottom: 8 }}>
                    {prefillBadges.map((item) => (
                      <Tag key={item.key} color="processing" style={{ marginBottom: 6 }}>{item.label}</Tag>
                    ))}
                  </div>
                  <Button type="link" onClick={clearPrefillContext} style={{ padding: 0 }}>Clear prefill context</Button>
                  <Button type="link" onClick={dismissPrefillSummary} style={{ padding: 0, marginLeft: 12 }}>Hide</Button>
                </div>
              )}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            initialValues={{ groupSize: 2, enableMinimumAge: false, currencyCode: 'VND', includeContingencyFund: true, tripSegment: 'Standard', hotelPreference: 'Standard' }}
            size="large"
          >

            <div className={currentStep === 0 ? styles.stepActive : styles.stepHidden}>
              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>Where are you starting from?</span>}>
                <div className={styles.mapInlineWrapper}>
                  <MapContainer center={mapCenter} zoom={12} style={{ width: '100%', height: 280, borderRadius: 16 }}>
                    <TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution='© <a href="https://www.google.com/maps">Google Maps</a>' maxZoom={20} />
                    {userLocation && <Marker position={[userLocation.latitude, userLocation.longitude]} />}
                    <InlineMapClickHandler onPick={(lat, lng) => { setUserLocation({ latitude: lat, longitude: lng }); form.setFieldsValue({ latitude: lat, longitude: lng }); }} />
                    <InlineMapCenterSync center={mapCenter} />
                  </MapContainer>
                </div>
                <Button type="dashed" block onClick={handleGetCurrentLocation} style={{ marginTop: 16, borderColor: '#4ECDC4', color: '#1A535C', backgroundColor: 'rgba(78, 205, 196, 0.1)' }}>
                  Use My Current Location
                </Button>
                <GoogleMapPicker open={mapOpen} onClose={() => setMapOpen(false)} onConfirm={handleMapConfirm} initialLat={userLocation?.latitude} initialLng={userLocation?.longitude} />
              </Card>

              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>Where would you like to go?</span>}>
                <Select showSearch placeholder="Search for a city or province..." loading={loadingProvinces} optionFilterProp="label" options={provinces.filter((p) => !selectedProvinceIds.includes(p.id || p.Id)).map((p) => ({ value: p.id || p.Id, label: getEnglishPreferredName(p) }))} onSelect={handleAddDestination} value={null} style={{ width: '100%' }} />

                {destinations.length === 0 && <Text type="secondary" className={styles.hintText}>Don't forget to add at least one destination!</Text>}

                {destinations.map((dest) => {
                  const districts = districtsMap[dest.provinceId] || [];
                  return (
                    <div key={dest.provinceId} className={styles.destinationItem}>
                      <div className={styles.destinationHeader}>
                        <span className={styles.destinationName}>{dest.provinceName}</span>
                        <Button type="text" danger onClick={() => handleRemoveDestination(dest.provinceId)}>Remove</Button>
                      </div>
                      <Checkbox checked={dest.allDistricts} onChange={(e) => handleAllDistrictsToggle(dest.provinceId, e.target.checked)}>Explore the whole area</Checkbox>
                      {!dest.allDistricts && districts.length > 0 && (
                        <div className={styles.districtGrid}>
                          {districts.map((district) => (
                            <Checkbox key={district.id || district.Id} checked={dest.districtIds.includes(district.id || district.Id)} onChange={(e) => handleDistrictToggle(dest.provinceId, district.id || district.Id, e.target.checked)}>{getEnglishPreferredName(district)}</Checkbox>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>

            <div className={currentStep === 1 ? styles.stepActive : styles.stepHidden}>
              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>When are you traveling?</span>}>
                <Form.Item name="dateRange" rules={[{ required: true, message: 'Please select your travel dates' }]}>
                  <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(current) => current && current < dayjs().startOf('day')} placeholder={['Start date', 'End date']} />
                </Form.Item>
                {computedFields && <Tag color="#4ECDC4" style={{ padding: '6px 16px', borderRadius: 999, fontSize: 14, color: '#1A535C', fontWeight: 600 }}>Trip duration: {computedFields.days} Days, {computedFields.nights} Nights</Tag>}
              </Card>

              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>Who is traveling with you?</span>}>
                <Row gutter={24}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="groupSize" label="Number of travelers" rules={[{ required: true, message: 'Please enter the group size' }]}>
                      <InputNumber min={1} max={50} style={{ width: '100%' }} addonAfter="people" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="enableMinimumAge"
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Checkbox onChange={(e) => { if (!e.target.checked) form.setFieldsValue({ minimumAge: undefined }); }}>
                        Traveling with kids? (Apply minimum age requirement)
                      </Checkbox>
                    </Form.Item>

                    <Form.Item shouldUpdate={(prev, cur) => prev.enableMinimumAge !== cur.enableMinimumAge} noStyle>
                      {({ getFieldValue }) => getFieldValue('enableMinimumAge') && (
                        <Form.Item name="minimumAge" rules={[{ required: true, message: 'Please enter the minimum age' }]}>
                          <InputNumber min={0} max={120} style={{ width: '100%' }} addonAfter="years" placeholder="Minimum age" />
                        </Form.Item>
                      )}
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </div>

            <div className={currentStep === 2 ? styles.stepActive : styles.stepHidden}>
              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>What are your favorite experiences?</span>}>
                {loadingTags ? <Spin /> : (
                  <div className={styles.tagPreferencePanel}>
                    <Select showSearch allowClear value={activeParentTagId} onChange={handleParentTagChange} placeholder="Select an activity category..." optionFilterProp="label" options={parentTags.map((tag) => ({ value: tag.id || tag.Id, label: getDisplayNameWithEnglish(tag) }))} style={{ width: '100%' }} />

                    {selectedTagList.length > 0 && (
                      <div className={styles.selectedTagSummary}>
                        <div className={styles.selectedTagSummaryHeader}>
                          <Text strong style={{ color: '#1A535C' }}>Selected Activities</Text>
                          <Button type="link" size="small" onClick={() => setSelectedTagIds([])} style={{ color: '#1A535C', fontWeight: 600, textDecoration: 'underline' }}>Clear All</Button>
                        </div>
                        <div className={styles.selectedTagList}>
                          {selectedTagList.map((tag) => (
                            <Tag key={tag.id} color={tag.isParent ? '#F4CB8C' : '#4ECDC4'} closable onClose={(e) => { e.preventDefault(); handleRemoveSelectedTag(tag.id); }} style={{ borderRadius: 999, border: 'none', color: '#1A535C', fontWeight: 600 }}>{tag.name}</Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeParentTagId && (
                      <div className={styles.rootTagBlock}>
                        <button type="button" className={`${styles.rootTagButton} ${selectedTagIds.includes(activeParentTagId) ? styles.rootTagButtonActive : ''}`} onClick={() => handleRootTagToggle(activeParentTagId)}>
                          <span>{getDisplayNameWithEnglish(activeParentTag)}</span>
                          <span className={styles.rootTagMeta}>{selectedChildrenCount > 0 ? `${selectedChildrenCount} sub-categories` : ''}</span>
                        </button>
                        {activeParentChildren.length > 0 && (
                          <div className={styles.childTagGrid}>
                            {activeParentChildren.map((child) => {
                              const childId = child.id || child.Id;
                              const isChildSelected = selectedTagIds.includes(childId);
                              return <button type="button" key={childId} className={`${styles.childTagButton} ${isChildSelected ? styles.childTagButtonActive : ''}`} onClick={() => handleTagSelect(childId, !isChildSelected)}>{getDisplayNameWithEnglish(child)}</button>;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>What is your resting style?</span>}>
                <Form.Item name="hotelPreference" label="Accommodation preference">
                  <Radio.Group options={HOTEL_OPTIONS} optionType="button" buttonStyle="solid" />
                </Form.Item>
                <Form.Item name="tripSegment" label="Overall trip segment" rules={[{ required: true }]}>
                  <Radio.Group options={SEGMENT_OPTIONS} optionType="button" buttonStyle="solid" />
                </Form.Item>
              </Card>
            </div>

            <div className={currentStep === 3 ? styles.stepActive : styles.stepHidden}>
              <Card className={styles.sectionCard} title={<span className={styles.sectionTitle}>Plan your trip budget</span>}>
                <Row gutter={16}>
                  <Col xs={24} sm={16}>
                    <Form.Item name="totalBudget" label="Total estimated budget" rules={[{ required: true, message: 'Please enter your budget' }]}>
                      <InputNumber min={1} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} placeholder="e.g., 5,000,000" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="currencyCode" label="Currency" rules={[{ required: true, message: 'Please select currency' }]}>
                      <Select options={CURRENCY_OPTIONS} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="includeContingencyFund" valuePropName="checked">
                  <Checkbox>Set aside a contingency fund (Recommended for unexpected extras)</Checkbox>
                </Form.Item>
              </Card>
            </div>

            <div className={styles.actionButtons}>
              {currentStep > 0 && (
                <Button onClick={handlePrevStep} className={styles.navButton}>
                  Back
                </Button>
              )}
              {currentStep < stepItems.length - 1 && (
                <Button type="primary" onClick={handleNextStep} className={styles.navButtonPrimary}>
                  Continue
                </Button>
              )}
              {currentStep === stepItems.length - 1 && (
                <Button type="primary" htmlType="submit" loading={loading} className={styles.ctaButton}>
                  {loading ? 'Crafting Your Itinerary...' : 'Start Planning My Trip'}
                </Button>
              )}
            </div>

          </Form>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CreateTripPage;