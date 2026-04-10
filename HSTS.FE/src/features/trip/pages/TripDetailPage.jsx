import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Tag,
  Empty,
  Spin,
  Descriptions,
  Table,
  Tabs,
  Statistic,
  Row,
  Col,
  Progress,
  Avatar,
  List,
} from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { getTripDetailApi } from '../api';
import {
  getProvincesApi,
  getLocationByIdApi,
  estimateLocalTravelApi,
  getLocationsByProvinceApi,
} from '../api';
import LocationDetailModal from '../components/LocationDetailModal';
import TransportDetailModal from '../components/TransportDetailModal';
import AccommodationDetailModal from '../components/AccommodationDetailModal';
import styles from './ItineraryResultPage.module.css';

const { Title, Text } = Typography;

const EVENT_BADGES = {
  CheckIn: { badge: 'IN', bg: '#f9f0ff' },
  CheckOut: { badge: 'OUT', bg: '#f5f5f5' },
  Travel: { badge: 'TR', bg: '#e6f4ff' },
  Visit: { badge: 'VS', bg: '#f6ffed' },
  Shopping: { badge: 'SH', bg: '#fff7e6' },
  Meal: { badge: 'ML', bg: '#fff0f6' },
  LuggageRefresh: { badge: 'LG', bg: '#fff0f6' },
};

const formatMoney = (amount, currency = 'VND') => {
  if (amount == null) return '0';
  return `${Number(amount).toLocaleString()} ${currency}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  return `${parts[0]}:${parts[1]}`;
};

const formatMinutesAsHourMinute = (minutes) => {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '';
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;
  return `${hours}h ${mins}m`;
};

const TripDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provinceNameById, setProvinceNameById] = useState(new Map());
  const [locationNameById, setLocationNameById] = useState(new Map());
  const [locationMediaById, setLocationMediaById] = useState(new Map());
  const [locationTelephoneById, setLocationTelephoneById] = useState(new Map());
  const [locationAmenitiesById, setLocationAmenitiesById] = useState(new Map());
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  const [showTransportOptionItems, setShowTransportOptionItems] = useState(true);
  const [recalculatingDayNumber, setRecalculatingDayNumber] = useState(null);
  const [locationModal, setLocationModal] = useState({ open: false, locationId: null });
  const [transportModal, setTransportModal] = useState({ open: false, data: null });
  const [accommodationModal, setAccommodationModal] = useState({ open: false, data: null });

  // Load province names
  useEffect(() => {
    let mounted = true;
    const loadProvinceNames = async () => {
      try {
        const data = await getProvincesApi();
        const provinces = Array.isArray(data) ? data : data?.items || data?.Items || [];
        const map = new Map();
        provinces.forEach((province) => {
          const idNum = Number(province.id || province.Id);
          if (!Number.isFinite(idNum)) return;
          const name = String(province.englishName || province.EnglishName || province.name || province.Name || '').trim();
          if (!name) return;
          map.set(idNum, name);
        });
        if (mounted) setProvinceNameById(map);
      } catch { /* ignore */ }
    };
    loadProvinceNames();
    return () => { mounted = false; };
  }, []);

  // Load trip detail
  useEffect(() => {
    let mounted = true;
    const loadTrip = async () => {
      setLoading(true);
      try {
        const data = await getTripDetailApi(Number(id));
        if (mounted) setTrip(data);
      } catch (err) {
        console.error('Failed to load trip detail:', err);
        if (mounted) setTrip(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) loadTrip();
    return () => { mounted = false; };
  }, [id]);

  // Load location metadata for activities
  useEffect(() => {
    let mounted = true;
    const loadLocationMetadata = async () => {
      if (!trip) return;
      const locationIds = new Set();
      trip.tripDays?.forEach((day) => {
        day.activities?.forEach((activity) => {
          if (activity.locationId && Number(activity.locationId) > 0) {
            locationIds.add(Number(activity.locationId));
          }
        });
      });

      if (locationIds.size === 0) {
        if (mounted) {
          setLocationNameById(new Map());
          setLocationMediaById(new Map());
          setLocationTelephoneById(new Map());
          setLocationAmenitiesById(new Map());
        }
        return;
      }

      try {
        const entries = await Promise.all([...locationIds].map(async (locId) => {
          try {
            const data = await getLocationByIdApi(locId);
            const mediaUrls = data?.mediaLinks || data?.MediaLinks || [];
            const telephone = String(data?.telephone || data?.Telephone || '').trim();
            const amenities = (data?.amenityNames || data?.AmenityNames || []).filter(Boolean);
            const name = String(data?.englishName || data?.EnglishName || data?.name || data?.Name || '').trim();
            return [locId, { name, mediaUrls, telephone, amenities }];
          } catch {
            return [locId, { name: '', mediaUrls: [], telephone: '', amenities: [] }];
          }
        }));

        if (!mounted) return;
        const nameMap = new Map();
        const mediaMap = new Map();
        const telephoneMap = new Map();
        const amenitiesMap = new Map();
        entries.forEach(([locId, payload]) => {
          if (payload.name) nameMap.set(locId, payload.name);
          if (payload.mediaUrls?.length > 0) mediaMap.set(locId, payload.mediaUrls);
          if (payload.telephone) telephoneMap.set(locId, payload.telephone);
          if (payload.amenities?.length > 0) amenitiesMap.set(locId, payload.amenities);
        });
        setLocationNameById(nameMap);
        setLocationMediaById(mediaMap);
        setLocationTelephoneById(telephoneMap);
        setLocationAmenitiesById(amenitiesMap);
      } catch { /* ignore */ }
    };
    loadLocationMetadata();
    return () => { mounted = false; };
  }, [trip]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading trip details..." />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className={styles.itineraryPage}>
        <div className={styles.container}>
          <Empty description="Trip not found or unable to load trip details">
            <Button type="primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
              Go Home
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  const currency = trip.currency || 'VND';
  const summary = trip.tripSummary;

  // Budget status calculation
  const totalBudget = summary?.totalBudget || 0;
  const totalActual = trip.tripDays?.reduce((sum, day) =>
    sum + (day.activities?.reduce((aSum, act) => aSum + (act.budget?.actualExpense || 0), 0) || 0), 0) || 0;
  const totalEstimated = summary?.estimatedTotalCost || 0;
  const variance = totalActual - totalEstimated;
  const budgetPercent = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;
  const budgetStatusColor = variance > 0 ? '#ff4d4f' : variance < 0 ? '#52c41a' : '#1890ff';
  const budgetStatusText = variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget';

  // Category budget vs actual
  const categoryData = [];
  if (summary) {
    const accommodationActual = trip.tripDays?.reduce((sum, day) =>
      sum + (day.activities?.filter(a => a.type === 'CheckIn' || a.type === 'CheckOut')
        .reduce((aSum, act) => aSum + (act.budget?.actualExpense || 0), 0) || 0), 0) || 0;
    const transportActual = trip.tripDays?.reduce((sum, day) =>
      sum + (day.activities?.filter(a => a.type === 'Travel')
        .reduce((aSum, act) => aSum + (act.budget?.actualExpense || 0), 0) || 0), 0) || 0;
    const activityActual = trip.tripDays?.reduce((sum, day) =>
      sum + (day.activities?.filter(a => a.type === 'Visit' || a.type === 'Meal' || a.type === 'Shopping')
        .reduce((aSum, act) => aSum + (act.budget?.actualExpense || 0), 0) || 0), 0) || 0;

    categoryData.push({
      key: 'Accommodation',
      estimated: summary.estimatedAccommodationCost,
      actual: accommodationActual,
      variance: accommodationActual - summary.estimatedAccommodationCost,
    });
    categoryData.push({
      key: 'Transport',
      estimated: summary.estimatedTransportCost,
      actual: transportActual,
      variance: transportActual - summary.estimatedTransportCost,
    });
    categoryData.push({
      key: 'Activities',
      estimated: summary.estimatedActivityCost,
      actual: activityActual,
      variance: activityActual - summary.estimatedActivityCost,
    });
  }

  const categoryColumns = [
    { title: 'Category', dataIndex: 'key', key: 'key' },
    {
      title: 'Estimated',
      dataIndex: 'estimated',
      key: 'estimated',
      render: (val) => formatMoney(val, currency),
    },
    {
      title: 'Actual',
      dataIndex: 'actual',
      key: 'actual',
      render: (val) => formatMoney(val, currency),
    },
    {
      title: 'Variance',
      dataIndex: 'variance',
      key: 'variance',
      render: (val) => (
        <span style={{ color: val > 0 ? '#ff4d4f' : val < 0 ? '#52c41a' : '#1890ff', fontWeight: 500 }}>
          {val > 0 ? '+' : ''}{formatMoney(val, currency)}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.itineraryPage}>
      <div className={styles.container}>
        {/* Header */}
        <Card className={styles.headerCard} bordered={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>{trip.tripName}</Title>
              {trip.description && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{trip.description}</Text>
              )}
            </div>
            <Button onClick={() => navigate(-1)}>Back</Button>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerMetaItem}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </span>
            <span className={styles.headerMetaItem}>
              <TeamOutlined style={{ marginRight: 4 }} />
              {trip.tripMembers?.length || 0} member(s)
            </span>
            <span className={styles.headerMetaItem}>
              <DollarOutlined style={{ marginRight: 4 }} />
              {currency}
            </span>
            <span className={styles.headerMetaItem}>
              Status: <strong>{trip.status}</strong>
            </span>
          </div>
        </Card>

        {/* Budget Summary */}
        {summary && (
          <Card
            className={styles.budgetCard}
            title="Budget Summary"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => setShowBudgetDetails((prev) => !prev)}
              >
                {showBudgetDetails ? 'Hide details' : 'Show details'}
              </Button>
            }
            size="small"
          >
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic
                  title="Total Budget"
                  value={summary.totalBudget}
                  precision={0}
                  valueStyle={{ color: '#1890ff' }}
                  suffix={currency}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Estimated Total"
                  value={summary.estimatedTotalCost}
                  precision={0}
                  valueStyle={{ color: '#faad14' }}
                  suffix={currency}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Actual Spent"
                  value={totalActual}
                  precision={0}
                  valueStyle={{ color: budgetStatusColor }}
                  suffix={currency}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Remaining"
                  value={summary.remainingBudget}
                  precision={0}
                  valueStyle={{ color: summary.remainingBudget >= 0 ? '#52c41a' : '#ff4d4f' }}
                  suffix={currency}
                />
              </Col>
            </Row>

            {/* Budget Progress Bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary">Budget Usage</Text>
                <Text strong style={{ color: budgetStatusColor }}>{budgetStatusText} ({budgetPercent.toFixed(1)}%)</Text>
              </div>
              <Progress
                percent={Math.min(budgetPercent, 100)}
                strokeColor={budgetStatusColor}
                status={budgetPercent > 100 ? 'exception' : 'normal'}
                showInfo={false}
              />
            </div>

            {/* Category Breakdown */}
            {showBudgetDetails && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>Category Breakdown</Title>
                <Table
                  dataSource={categoryData}
                  columns={categoryColumns}
                  pagination={false}
                  size="small"
                  rowKey="key"
                />
              </div>
            )}
          </Card>
        )}

        {/* Tabs: Itinerary / Members */}
        <Tabs
          defaultActiveKey="itinerary"
          items={[
            {
              key: 'itinerary',
              label: 'Itinerary',
              children: (
                <>
                  {/* Day-by-Day */}
                  {trip.tripDays?.map((day, dayIdx) => {
                    const dayNum = day.dayNumber;
                    const isDayUpdating = recalculatingDayNumber === dayNum;
                    const activities = day.activities || [];
                    const provinceId = activities.find(a => a.locationId)?.locationId;

                    return (
                      <Card key={day.id} className={styles.dayCard} bordered={false} bodyStyle={{ padding: 0 }}>
                        {/* Day Header */}
                        <div className={styles.dayHeader}>
                          <div className={styles.dayTitle}>{day.dayTitle}</div>
                          <div className={styles.dayMeta}>
                            {day.date && (
                              <span className={styles.dayDate}>
                                {new Date(day.date).toLocaleDateString()}
                              </span>
                            )}
                            {isDayUpdating && (
                              <span className={styles.dayRecalculate}>Recalculating...</span>
                            )}
                            {day.weatherSummary && (
                              <span className={styles.dayWeather} title={day.weatherSummary}>
                                <span className={styles.dayWeatherLabel}>Weather</span>
                                <span className={styles.dayWeatherValue}>{day.weatherSummary}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Activities Timeline */}
                        <div className={styles.timeline}>
                          {activities.map((activity, actIdx) => {
                            const eventType = activity.type || 'Visit';
                            const eventConfig = EVENT_BADGES[eventType] || EVENT_BADGES.Visit;
                            const startTime = activity.startTime;
                            const endTime = activity.endTime;
                            const locationId = Number(activity.locationId);
                            const locationName = locationNameById.get(locationId) || '';
                            const telephone = locationTelephoneById.get(locationId) || '';
                            const amenities = locationAmenitiesById.get(locationId) || [];
                            const mediaUrls = locationMediaById.get(locationId) || [];
                            const budget = activity.budget;
                            const estimatedCost = budget?.estimateCost || 0;
                            const actualCost = budget?.actualExpense || 0;
                            const costVariance = actualCost - estimatedCost;

                            return (
                              <div key={actIdx} className={styles.timelineItem}>
                                <div className={styles.timelineTime}>
                                  {startTime && (
                                    <span className={styles.timelineTimeStart}>{formatTime(startTime)}</span>
                                  )}
                                  {endTime && (
                                    <span className={styles.timelineTimeEnd}>{formatTime(endTime)}</span>
                                  )}
                                </div>
                                <div className={styles.timelineIcon} style={{ background: eventConfig.bg }}>
                                  {eventConfig.badge}
                                </div>
                                <div className={styles.timelineContent}>
                                  <div className={styles.timelineTitle}>
                                    {locationName || activity.title}
                                  </div>
                                  {budget && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 12 }}>
                                      <span>
                                        Est: <strong>{formatMoney(estimatedCost, currency)}</strong>
                                      </span>
                                      {actualCost > 0 && (
                                        <span>
                                          Actual: <strong>{formatMoney(actualCost, currency)}</strong>
                                        </span>
                                      )}
                                      {costVariance !== 0 && (
                                        <span style={{ color: costVariance > 0 ? '#ff4d4f' : '#52c41a' }}>
                                          ({costVariance > 0 ? '+' : ''}{formatMoney(costVariance, currency)})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {amenities.length > 0 && (
                                    <div className={styles.timelineAmenities}>
                                      {amenities.slice(0, 5).map((amenity, amenityIdx) => (
                                        <Tag key={`${actIdx}-amenity-${amenityIdx}`} color="green" style={{ fontSize: 11 }}>
                                          {amenity}
                                        </Tag>
                                      ))}
                                    </div>
                                  )}
                                  {mediaUrls.length > 0 && (
                                    <div className={styles.timelineMedia}>
                                      {mediaUrls.slice(0, 3).map((url, imgIdx) => (
                                        <a
                                          key={`${actIdx}-media-${imgIdx}`}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={styles.timelineMediaLink}
                                        >
                                          <img
                                            src={url}
                                            alt={`${activity.title} ${imgIdx + 1}`}
                                            className={styles.timelineMediaImage}
                                            loading="lazy"
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {telephone && (
                                    <div className={styles.timelineTelephone}>Phone: {telephone}</div>
                                  )}

                                  {/* Actions */}
                                  {locationId > 0 && eventType !== 'Travel' && (
                                    <div className={styles.timelineActions}>
                                      <Button
                                        type="link"
                                        size="small"
                                        disabled={isDayUpdating}
                                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                        onClick={() => setLocationModal({ open: true, locationId })}
                                      >
                                        View Details
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {activities.length === 0 && (
                            <Empty description="No activities planned for this day" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </div>

                        {/* Day Estimated Cost */}
                        {day.estimateCost > 0 && (
                          <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0' }}>
                            <Text type="secondary">Day {dayNum} Estimated Cost: </Text>
                            <Text strong>{formatMoney(day.estimateCost, currency)}</Text>
                          </div>
                        )}
                      </Card>
                    );
                  })}

                  {(!trip.tripDays || trip.tripDays.length === 0) && (
                    <Empty description="No days planned" />
                  )}
                </>
              ),
            },
            {
              key: 'members',
              label: `Members (${trip.tripMembers?.length || 0})`,
              children: (
                <List
                  dataSource={trip.tripMembers || []}
                  renderItem={(member) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={member.name}
                        description={`${member.role} • Joined ${new Date(member.createdAt).toLocaleDateString()}`}
                      />
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />

        {/* Modals */}
        <LocationDetailModal
          open={locationModal.open}
          locationId={locationModal.locationId}
          onClose={() => setLocationModal({ open: false, locationId: null })}
        />
        <TransportDetailModal
          open={transportModal.open}
          data={transportModal.data}
          onClose={() => setTransportModal({ open: false, data: null })}
        />
        <AccommodationDetailModal
          open={accommodationModal.open}
          data={accommodationModal.data}
          onClose={() => setAccommodationModal({ open: false, data: null })}
        />
      </div>
    </div>
  );
};

export default TripDetailPage;
