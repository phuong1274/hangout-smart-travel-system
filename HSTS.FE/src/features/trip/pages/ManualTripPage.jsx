import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Input,
  InputNumber,
  Row,
  Space,
  Spin,
  TimePicker,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { getTripByIdApi, updateSavedTripApi } from '../api';
import styles from './ManualTripPage.module.css';

const { Title, Text } = Typography;

const createClientId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toNumberOrDefault = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeTimeString = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('HH:mm:ss') : null;
};

const toTimePickerValue = (value) => {
  const normalized = normalizeTimeString(value);
  if (!normalized) return null;

  const parsed = dayjs(normalized, 'HH:mm:ss');
  return parsed.isValid() ? parsed : null;
};

const toIsoDateTimeString = (value) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return dayjs().format('YYYY-MM-DD');
  }
  return parsed.format('YYYY-MM-DD');
};

const createDefaultActivity = () => ({
  id: createClientId('activity'),
  destinationName: '',
  title: '',
  address: '',
  latitude: null,
  longitude: null,
  startTime: null,
  endTime: null,
  estimatedCost: 0,
});

const createDefaultDay = ({ date, index }) => ({
  id: createClientId('day'),
  date,
  dayTitle: `Day ${index + 1}`,
  estimatedCost: 0,
  activities: [createDefaultActivity()],
});

const normalizeTripInfo = (raw) => {
  if (!raw) return null;

  const startDate = raw.startDate || raw.StartDate || null;
  const endDate = raw.endDate || raw.EndDate || null;

  return {
    id: raw.id || raw.Id || null,
    tripName: String(raw.tripName || raw.TripName || 'Untitled Trip').trim(),
    description: String(raw.description || raw.Description || '').trim(),
    startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : null,
    endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
    groupSize: Math.max(1, Math.round(toNumberOrDefault(raw.groupSize || raw.GroupSize, 1))),
    currencyCode: String(raw.currency || raw.currencyCode || raw.Currency || raw.CurrencyCode || 'VND').trim() || 'VND',
  };
};

const normalizeDraftDays = (rawDays) => {
  if (!Array.isArray(rawDays) || rawDays.length === 0) return [];

  return rawDays.map((day, dayIndex) => ({
    id: day.id || createClientId(`day-${dayIndex}`),
    date: day.date ? dayjs(day.date).format('YYYY-MM-DD') : dayjs().add(dayIndex, 'day').format('YYYY-MM-DD'),
    dayTitle: String(day.dayTitle || `Day ${dayIndex + 1}`).trim(),
    estimatedCost: Math.max(0, toNumberOrDefault(day.estimatedCost, 0)),
    activities: Array.isArray(day.activities) && day.activities.length > 0
      ? day.activities.map((activity, activityIndex) => ({
          id: activity.id || createClientId(`activity-${dayIndex}-${activityIndex}`),
          destinationName: String(activity.destinationName || '').trim(),
          title: String(activity.title || '').trim(),
          address: String(activity.address || '').trim(),
          latitude: activity.latitude == null ? null : toNumberOrDefault(activity.latitude, 0),
          longitude: activity.longitude == null ? null : toNumberOrDefault(activity.longitude, 0),
          startTime: normalizeTimeString(activity.startTime),
          endTime: normalizeTimeString(activity.endTime),
          estimatedCost: Math.max(0, toNumberOrDefault(activity.estimatedCost, 0)),
        }))
      : [createDefaultActivity()],
  }));
};

const getDraftStorageKey = (tripId) => `manual-trip-draft-${tripId}`;

const loadDraftFromStorage = (tripId) => {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(tripId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveDraftToStorage = (tripId, payload) => {
  try {
    localStorage.setItem(getDraftStorageKey(tripId), JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
  }
};

const clearDraftStorage = (tripId) => {
  try {
    localStorage.removeItem(getDraftStorageKey(tripId));
  } catch {
    // Ignore storage remove failures.
  }
};

const ManualTripPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loadingTrip, setLoadingTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [manualDays, setManualDays] = useState([]);

  useEffect(() => {
    const queryTripId = Number(searchParams.get('tripId'));
    const stateTripId = Number(location?.state?.tripId);

    const resolvedTripId = Number.isFinite(queryTripId) && queryTripId > 0
      ? queryTripId
      : (Number.isFinite(stateTripId) && stateTripId > 0 ? stateTripId : 0);

    setTripId(resolvedTripId > 0 ? resolvedTripId : null);
  }, [location?.state?.tripId, searchParams]);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const hydrate = async () => {
      setLoadingTrip(true);

      const stateTripInfo = normalizeTripInfo(location?.state?.tripInfo);
      const draft = loadDraftFromStorage(tripId);
      const draftTripInfo = normalizeTripInfo(draft?.tripInfo);

      let resolvedTripInfo = draftTripInfo || stateTripInfo;
      let resolvedDays = normalizeDraftDays(draft?.days);

      if (!resolvedTripInfo) {
        try {
          const apiTrip = await getTripByIdApi(tripId);
          resolvedTripInfo = normalizeTripInfo(apiTrip);
        } catch {
          if (!cancelled) {
            message.error('Cannot load base trip information.');
          }
        }
      }

      if (!cancelled) {
        setTripInfo(resolvedTripInfo);
        setManualDays(resolvedDays);
        setLoadingTrip(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [location?.state?.tripInfo, tripId]);

  useEffect(() => {
    if (!tripId || !tripInfo) return;

    saveDraftToStorage(tripId, {
      tripInfo,
      days: manualDays,
      updatedAt: new Date().toISOString(),
    });
  }, [tripId, tripInfo, manualDays]);

  const totalPlannedBudget = useMemo(() => manualDays.reduce(
    (sum, day) => sum + Math.max(0, toNumberOrDefault(day.estimatedCost, 0)),
    0,
  ), [manualDays]);

  const totalActivityBudget = useMemo(() => manualDays.reduce((sum, day) => {
    const dayActivitySum = (day.activities || []).reduce(
      (activitySum, activity) => activitySum + Math.max(0, toNumberOrDefault(activity.estimatedCost, 0)),
      0,
    );
    return sum + dayActivitySum;
  }, 0), [manualDays]);

  const dayDateDisabled = (current) => {
    if (!current) return false;

    const currentDay = current.startOf('day');
    const tripStart = tripInfo?.startDate ? dayjs(tripInfo.startDate).startOf('day') : null;
    const tripEnd = tripInfo?.endDate ? dayjs(tripInfo.endDate).startOf('day') : null;

    if (tripStart && currentDay.isBefore(tripStart)) return true;
    if (tripEnd && currentDay.isAfter(tripEnd)) return true;
    return false;
  };

  const updateDayField = (dayId, field, value) => {
    setManualDays((prev) => prev.map((day) => (
      day.id === dayId ? { ...day, [field]: value } : day
    )));
  };

  const addDay = () => {
    setManualDays((prev) => {
      const lastDay = prev[prev.length - 1];
      const fallbackStartDate = tripInfo?.startDate
        ? dayjs(tripInfo.startDate).startOf('day')
        : dayjs().startOf('day');

      const nextDate = lastDay?.date
        ? dayjs(lastDay.date).add(1, 'day').format('YYYY-MM-DD')
        : fallbackStartDate.format('YYYY-MM-DD');

      return [...prev, createDefaultDay({ date: nextDate, index: prev.length })];
    });
  };

  const removeDay = (dayId) => {
    setManualDays((prev) => prev.filter((day) => day.id !== dayId));
  };

  const addActivity = (dayId) => {
    setManualDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: [...(day.activities || []), createDefaultActivity()],
      };
    }));
  };

  const removeActivity = (dayId, activityId) => {
    setManualDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;

      const nextActivities = (day.activities || []).filter((activity) => activity.id !== activityId);
      return {
        ...day,
        activities: nextActivities.length > 0 ? nextActivities : [createDefaultActivity()],
      };
    }));
  };

  const updateActivityField = (dayId, activityId, field, value) => {
    setManualDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;

      const nextActivities = (day.activities || []).map((activity) => {
        if (activity.id !== activityId) return activity;
        return { ...activity, [field]: value };
      });

      return { ...day, activities: nextActivities };
    }));
  };

  const handleSaveManualTrip = async () => {
    if (!tripId || !tripInfo) {
      message.error('Missing trip context. Please create a trip from Manual Trip Setup first.');
      return;
    }

    if (!Array.isArray(manualDays) || manualDays.length === 0) {
      message.error('Please add at least one day.');
      return;
    }

    const tripStart = tripInfo.startDate ? dayjs(tripInfo.startDate).startOf('day') : null;
    const tripEnd = tripInfo.endDate ? dayjs(tripInfo.endDate).startOf('day') : null;

    for (let dayIndex = 0; dayIndex < manualDays.length; dayIndex += 1) {
      const day = manualDays[dayIndex];
      const dayDate = dayjs(day.date);

      if (!dayDate.isValid()) {
        message.error(`Day ${dayIndex + 1}: date is invalid.`);
        return;
      }

      if (tripStart && dayDate.isBefore(tripStart, 'day')) {
        message.error(`Day ${dayIndex + 1}: date cannot be before trip start date.`);
        return;
      }

      if (tripEnd && dayDate.isAfter(tripEnd, 'day')) {
        message.error(`Day ${dayIndex + 1}: date cannot be after trip end date.`);
        return;
      }

      if (!Array.isArray(day.activities) || day.activities.length === 0) {
        message.error(`Day ${dayIndex + 1}: please add at least one destination.`);
        return;
      }

      for (let activityIndex = 0; activityIndex < day.activities.length; activityIndex += 1) {
        const activity = day.activities[activityIndex];
        const destinationName = String(activity.destinationName || '').trim();
        const title = String(activity.title || '').trim();

        if (!destinationName && !title) {
          message.error(`Day ${dayIndex + 1}, destination ${activityIndex + 1}: title is required.`);
          return;
        }

        const startTime = normalizeTimeString(activity.startTime);
        const endTime = normalizeTimeString(activity.endTime);

        // Note: startTime > endTime is valid for overnight activities
        // (e.g. intercity travel 17:47 -> 01:43 next day)
      }
    }

    const mappedDays = manualDays.map((day, dayIndex) => {
      const mappedActivities = (day.activities || []).map((activity) => {
        const fallbackName = String(activity.destinationName || activity.title || '').trim();

        return {
          type: 3,
          title: String(activity.title || fallbackName).trim(),
          startTime: normalizeTimeString(activity.startTime),
          endTime: normalizeTimeString(activity.endTime),
          locationId: null,
          customLocationId: null,
          customLocation: {
            name: fallbackName,
            latitude: toNumberOrDefault(activity.latitude, 0),
            longitude: toNumberOrDefault(activity.longitude, 0),
            address: activity.address ? String(activity.address).trim() : null,
          },
          transport: null,
          budget: {
            estimateCost: Math.max(0, Math.round(toNumberOrDefault(activity.estimatedCost, 0))),
          },
        };
      });

      const fallbackDayCost = mappedActivities.reduce(
        (sum, activity) => sum + toNumberOrDefault(activity?.budget?.estimateCost, 0),
        0,
      );

      return {
        dayNumber: dayIndex + 1,
        date: toIsoDateTimeString(day.date),
        dayTitle: String(day.dayTitle || `Day ${dayIndex + 1}`).trim(),
        weatherSummary: null,
        estimatedCost: Math.max(0, Math.round(toNumberOrDefault(day.estimatedCost, fallbackDayCost))),
        activities: mappedActivities,
      };
    });

    const totalBudget = Math.max(0, Math.round(totalPlannedBudget));
    const usableBudget = totalBudget;
    const estimatedActivityCost = Math.max(0, Math.round(totalActivityBudget));
    const estimatedTotalCost = estimatedActivityCost;
    const remainingBudget = Math.max(0, usableBudget - estimatedTotalCost);

    const payload = {
      tripName: tripInfo.tripName,
      description: tripInfo.description,
      startDate: tripInfo.startDate,
      endDate: tripInfo.endDate,
      groupSize: tripInfo.groupSize,
      currencyCode: tripInfo.currencyCode,
      days: mappedDays,
      budgetSummary: {
        totalBudget,
        usableBudget,
        estimatedAccommodationCost: 0,
        estimatedTransportCost: 0,
        estimatedActivityCost,
        estimatedMealCost: 0,
        estimatedTotalCost,
        remainingBudget,
        contingencyFund: null,
      },
    };

    setSavingTrip(true);
    try {
      await updateSavedTripApi(tripId, payload);
      clearDraftStorage(tripId);
      message.success('Manual trip saved successfully.');
      navigate(PATHS.TRIP_DETAIL.replace(':id', String(tripId)));
    } catch (error) {
      const responseData = error?.response?.data;
      const errorMessage = responseData?.detail || responseData?.title || responseData?.message || 'Cannot save manual trip.';
      message.error(errorMessage);
    } finally {
      setSavingTrip(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageContent}>
        {!tripId && (
          <Alert
            type="warning"
            showIcon
            message="Trip not found"
            description="Please start from Manual Trip Setup to create a trip first."
          />
        )}

        {loadingTrip && (
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Spin tip="Loading trip information..." style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }} />
          </Card>
        )}

        {tripId && tripInfo && (
          <>
            <Card bordered={false} className={styles.headerCard}>
              <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col flex="auto">
                  <Title level={3} style={{ color: 'white', margin: 0 }}>
                    {tripInfo.tripName}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.86)' }}>
                    {tripInfo.startDate || 'TBD'} to {tripInfo.endDate || 'TBD'} • {tripInfo.groupSize} people
                  </Text>
                </Col>
                <Col>
                  <div style={{ textAlign: 'right' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>ESTIMATED TOTAL</Text>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
                      {Math.round(totalActivityBudget).toLocaleString()} {tripInfo.currencyCode}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card bordered={false} className={styles.builderCard}>
              <Title level={3} style={{ marginTop: 0, marginBottom: 2 }}>Manual Day & Location Builder</Title>
              <Text type="secondary">Add each day and each destination manually, then save to trip detail.</Text>

              {!manualDays.length && (
                <Empty
                  description="No day added yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginTop: 40, marginBottom: 40 }}
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={addDay}>
                    Add First Day
                  </Button>
                </Empty>
              )}

              {manualDays.length > 0 && (
                <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 20 }}>
                  {manualDays.map((day, dayIndex) => (
                    <Card
                      key={day.id}
                      size="small"
                      className={styles.dayCard}
                      title={`Day ${dayIndex + 1}`}
                      extra={(
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          onClick={() => removeDay(day.id)}
                          disabled={manualDays.length <= 1}
                        >
                          Remove Day
                        </Button>
                      )}
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={8}>
                          <Text>Date</Text>
                          <DatePicker
                            style={{ width: '100%', marginTop: 6 }}
                            value={day.date ? dayjs(day.date) : null}
                            disabledDate={dayDateDisabled}
                            onChange={(value) => updateDayField(day.id, 'date', value ? value.format('YYYY-MM-DD') : '')}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Text>Day Title</Text>
                          <Input
                            style={{ marginTop: 6 }}
                            value={day.dayTitle}
                            onChange={(event) => updateDayField(day.id, 'dayTitle', event.target.value)}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Text>Estimated Cost</Text>
                          <InputNumber
                            style={{ width: '100%', marginTop: 6 }}
                            min={0}
                            value={day.estimatedCost}
                            onChange={(value) => updateDayField(day.id, 'estimatedCost', Math.max(0, toNumberOrDefault(value, 0)))}
                          />
                        </Col>
                      </Row>

                      <Divider orientation="left" className={styles.destinationDivider}>Destinations</Divider>

                      <Space direction="vertical" size="middle" className={styles.activityList}>
                        {(day.activities || []).map((activity, activityIndex) => (
                          <Card
                            key={activity.id}
                            size="small"
                            type="inner"
                            className={styles.activityCard}
                            title={`Destination ${activityIndex + 1}`}
                            extra={(
                              <Button
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => removeActivity(day.id, activity.id)}
                                disabled={(day.activities || []).length <= 1}
                              >
                                Remove
                              </Button>
                            )}
                          >
                            <Row gutter={[12, 12]}>
                              <Col xs={24} md={12}>
                                <Text>Destination Name</Text>
                                <Input
                                  style={{ marginTop: 6 }}
                                  value={activity.destinationName}
                                  onChange={(event) => updateActivityField(day.id, activity.id, 'destinationName', event.target.value)}
                                />
                              </Col>
                              <Col xs={24} md={12}>
                                <Text>Activity Title</Text>
                                <Input
                                  style={{ marginTop: 6 }}
                                  value={activity.title}
                                  onChange={(event) => updateActivityField(day.id, activity.id, 'title', event.target.value)}
                                />
                              </Col>

                              <Col xs={24} md={12}>
                                <Text>Address</Text>
                                <Input
                                  style={{ marginTop: 6 }}
                                  value={activity.address}
                                  onChange={(event) => updateActivityField(day.id, activity.id, 'address', event.target.value)}
                                />
                              </Col>
                              <Col xs={24} md={12}>
                                <Text>Estimated Cost</Text>
                                <InputNumber
                                  style={{ width: '100%', marginTop: 6 }}
                                  min={0}
                                  value={activity.estimatedCost}
                                  onChange={(value) => updateActivityField(day.id, activity.id, 'estimatedCost', Math.max(0, toNumberOrDefault(value, 0)))}
                                />
                              </Col>

                              <Col xs={24} md={6}>
                                <Text>Start Time</Text>
                                <TimePicker
                                  style={{ width: '100%', marginTop: 6 }}
                                  format="HH:mm"
                                  value={toTimePickerValue(activity.startTime)}
                                  onChange={(value) => updateActivityField(day.id, activity.id, 'startTime', value ? value.format('HH:mm:ss') : null)}
                                />
                              </Col>
                              <Col xs={24} md={6}>
                                <Text>End Time</Text>
                                <TimePicker
                                  style={{ width: '100%', marginTop: 6 }}
                                  format="HH:mm"
                                  value={toTimePickerValue(activity.endTime)}
                                  onChange={(value) => updateActivityField(day.id, activity.id, 'endTime', value ? value.format('HH:mm:ss') : null)}
                                />
                              </Col>
                              <Col xs={24} md={6}>
                                <Text>Latitude</Text>
                                <InputNumber
                                  style={{ width: '100%', marginTop: 6 }}
                                  value={activity.latitude}
                                  min={-90}
                                  max={90}
                                  onChange={(value) => updateActivityField(day.id, activity.id, 'latitude', value == null ? null : toNumberOrDefault(value, 0))}
                                />
                              </Col>
                              <Col xs={24} md={6}>
                                <Text>Longitude</Text>
                                <InputNumber
                                  style={{ width: '100%', marginTop: 6 }}
                                  value={activity.longitude}
                                  min={-180}
                                  max={180}
                                  onChange={(value) => updateActivityField(day.id, activity.id, 'longitude', value == null ? null : toNumberOrDefault(value, 0))}
                                />
                              </Col>
                            </Row>
                          </Card>
                        ))}

                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => addActivity(day.id)}
                        >
                          Add Destination
                        </Button>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}

              {manualDays.length > 0 && (
                <Space direction="vertical" style={{ width: '100%', marginTop: 24 }}>
                  <Button type="dashed" icon={<PlusOutlined />} block onClick={addDay}>
                    Add Day
                  </Button>
                </Space>
              )}
            </Card>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <Button icon={<PlusOutlined />} onClick={addDay}>
                Add Day
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingTrip}
                onClick={handleSaveManualTrip}
              >
                Save Manual Trip
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManualTripPage;
