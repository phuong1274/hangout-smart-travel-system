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
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tooltip,
  Popconfirm,
  Space,
} from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  ClockCircleFilled,
  PlusOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { getTripDetailApi, updateTripActivityStatusApi, logActualExpenseApi, updateExpenseApi, getExpensesByActivityApi, deleteExpenseApi, batchUpdateActivityStatusApi, getBudgetVsActualExportApi } from '../api';
import { useAuthStore } from '@/store/authStore';
import {
  getProvincesApi,
  getLocationByIdApi,
  estimateLocalTravelApi,
  getLocationsByProvinceApi,
} from '../api';
import LocationDetailModal from '../components/LocationDetailModal';
import TransportDetailModal from '../components/TransportDetailModal';
import AccommodationDetailModal from '../components/AccommodationDetailModal';
import MemberManagement from '../components/MemberManagement';
import { exportBudgetVsActualPdf } from '../utils/exportBudgetPdf';
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

const ACTIVITY_STATUS_CONFIG = {
  0: { label: 'Upcoming', color: 'default', icon: <ClockCircleFilled />, nextStatus: 1, nextLabel: 'Start' },
  1: { label: 'In Progress', color: 'processing', icon: <PlayCircleOutlined />, nextStatus: 2, nextLabel: 'Complete' },
  2: { label: 'Completed', color: 'success', icon: <CheckCircleOutlined />, nextStatus: null, nextLabel: null },
};

const TRIP_STATUS_CONFIG = {
  0: { label: 'Planned', color: 'default' },
  1: { label: 'In Progress', color: 'processing' },
  2: { label: 'Completed', color: 'success' },
  3: { label: 'Cancelled', color: 'error' },
};

const getTripStatusConfig = (status) => {
  const key = typeof status === 'number' ? status : Number(status);
  return TRIP_STATUS_CONFIG[key] || { label: `Unknown (${status})`, color: 'default' };
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
  const { user } = useAuthStore();
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
  const [expenseModal, setExpenseModal] = useState({ open: false, activityId: null, activityTitle: '', editExpense: null });
  const [updatingActivityIds, setUpdatingActivityIds] = useState(new Set());
  const [activityExpenses, setActivityExpenses] = useState({}); // { activityId: [expense1, expense2, ...] }
  const [expenseForm] = Form.useForm();
  const [exporting, setExporting] = useState(false);

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
  const refetchTrip = useCallback(async () => {
    try {
      const data = await getTripDetailApi(Number(id));
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip detail:', err);
    }
  }, [id]);

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

  // Load expenses for this trip (grouped by activity)
  useEffect(() => {
    let mounted = true;
    const loadExpenses = async () => {
      if (!trip) return;
      try {
        const groupedExpenses = await getExpensesByActivityApi(Number(id));
        if (!mounted) return;
        
        // Convert to lookup by activityId: { activityId: expenses[], activityId2: expenses[], ... }
        const lookup = {};
        (groupedExpenses || []).forEach(item => {
          lookup[item.activityId] = item.expenses || [];
        });
        setActivityExpenses(lookup);
      } catch {
        // ignore
      }
    };
    loadExpenses();
    return () => { mounted = false; };
  }, [trip, id]);

  // Find the current user's TripMember id for this trip
  const currentUserId = user?.id;
  const myMember = trip?.tripMembers?.find(m => m.userId === currentUserId);

  // Handle activity status update
  const handleUpdateActivityStatus = useCallback(async (activityId, skipConfirm = false) => {
    const allActivities = trip?.tripDays?.flatMap(d => d.activities || []) || [];
    const activity = allActivities.find(a => a.id === activityId);
    const currentStatus = activity?.status ?? 0;
    const config = ACTIVITY_STATUS_CONFIG[currentStatus];

    if (!config.nextStatus) return; // Already completed

    // When starting an activity (0 -> 1), check for previous incomplete activities
    if (currentStatus === 0 && config.nextStatus === 1 && !skipConfirm) {
      const activityIndex = allActivities.findIndex(a => a.id === activityId);
      const previousActivities = allActivities.slice(0, activityIndex);
      const incompletePrevious = previousActivities.filter(a => (a.status ?? 0) < 2);

      if (incompletePrevious.length > 0) {
        Modal.confirm({
          title: 'Complete Previous Activities?',
          content: (
            <div>
              <p>Starting this activity will automatically complete the following {incompletePrevious.length} previous activit{incompletePrevious.length > 1 ? 'ies' : 'y'}:</p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                {incompletePrevious.map((a, i) => {
                  const locId = Number(a.locationId);
                  const name = locationNameById.get(locId) || a.title || `Activity ${i + 1}`;
                  return <li key={a.id}>{name}</li>;
                })}
              </ul>
              <p style={{ color: '#888', fontSize: 12 }}>Do you want to proceed?</p>
            </div>
          ),
          okText: 'Yes, Complete All',
          cancelText: 'Cancel',
          onOk: async () => {
            // Set all involved activities as updating
            setUpdatingActivityIds(prev => {
              const next = new Set(prev);
              incompletePrevious.forEach(a => next.add(a.id));
              next.add(activityId);
              return next;
            });
            try {
              // Single atomic batch call
              await batchUpdateActivityStatusApi({
                activityIdsToComplete: incompletePrevious.map(a => a.id),
                activityIdToStart: activityId,
              });
              message.success(`${incompletePrevious.length} previous activit${incompletePrevious.length > 1 ? 'ies' : 'y'} completed, now in progress`);
              // Reload trip data
              const data = await getTripDetailApi(Number(id));
              setTrip(data);
            } catch (err) {
              console.error('Failed to batch update activity statuses:', err);
              message.error('Failed to update activity statuses');
            } finally {
              setUpdatingActivityIds(prev => {
                const next = new Set(prev);
                incompletePrevious.forEach(a => next.delete(a.id));
                next.delete(activityId);
                return next;
              });
            }
          },
        });
        return;
      }
    }

    setUpdatingActivityIds(prev => new Set(prev).add(activityId));
    try {
      await updateTripActivityStatusApi(activityId, config.nextStatus);
      message.success(`Activity marked as "${config.nextLabel === 'Complete' ? 'Completed' : 'In Progress'}"`);
      // Reload trip data
      const data = await getTripDetailApi(Number(id));
      setTrip(data);
    } catch (err) {
      console.error('Failed to update activity status:', err);
      message.error('Failed to update activity status');
    } finally {
      setUpdatingActivityIds(prev => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  }, [trip, id, locationNameById]);

  // Handle expense submission (create or update)
  const handleExpenseSubmit = useCallback(async (values) => {
    try {
      if (expenseModal.editExpense) {
        await updateExpenseApi(expenseModal.editExpense.id, {
          title: values.title,
          description: values.description,
          totalAmount: values.totalAmount,
        });
        message.success('Expense updated successfully');
      } else {
        await logActualExpenseApi({
          tripActivityId: expenseModal.activityId,
          title: values.title,
          description: values.description,
          totalAmount: values.totalAmount,
        });
        message.success('Expense logged successfully');
      }
      expenseForm.resetFields();
      setExpenseModal({ open: false, activityId: null, activityTitle: '', editExpense: null });
      await reloadTripAndExpenses();
    } catch (err) {
      console.error('Failed to save expense:', err);
      message.error(err?.response?.data?.message || 'Failed to save expense');
    }
  }, [expenseModal, expenseForm, id, trip, user, myMember]);

  // Handle expense deletion
  const handleDeleteExpense = useCallback(async (expenseId) => {
    try {
      await deleteExpenseApi(expenseId);
      message.success('Expense deleted');
      await reloadTripAndExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      message.error('Failed to delete expense');
    }
  }, [id]);

  // Helper to reload trip + expenses
  const reloadTripAndExpenses = useCallback(async () => {
    const [tripData, groupedExpenses] = await Promise.all([
      getTripDetailApi(Number(id)),
      getExpensesByActivityApi(Number(id)),
    ]);
    setTrip(tripData);

    const lookup = {};
    (groupedExpenses || []).forEach(item => {
      lookup[item.activityId] = item.expenses || [];
    });
    setActivityExpenses(lookup);
  }, [id]);

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const data = await getBudgetVsActualExportApi(Number(id));
      await exportBudgetVsActualPdf(data);
      message.success('PDF exported successfully');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      message.error('Failed to export PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }, [id]);

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
  // Calculate total spent from all expense logs
  const totalActual = Object.values(activityExpenses).reduce(
    (sum, expenses) => sum + expenses.reduce((a, e) => a + (e.totalAmount || 0), 0), 0
  );
  const totalEstimated = summary?.estimatedTotalCost || 0;
  const variance = totalActual - totalEstimated;
  const hasBudget = totalEstimated > 0;
  const budgetPercent = hasBudget ? (totalActual / totalEstimated) * 100 : 0;
  const budgetStatusColor = !hasBudget ? '#1890ff' : (variance > 0 ? '#ff4d4f' : variance < 0 ? '#52c41a' : '#1890ff');
  const budgetStatusText = !hasBudget ? 'No Budget Set' : (variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget');

  // Category budget vs actual
  const categoryData = [];
  if (summary) {
    // Calculate actuals from expense logs grouped by activity type
    const allActivities = trip.tripDays?.flatMap(d => d.activities || []) || [];
    const accommodationActivityIds = new Set(
      allActivities.filter(a => a.type === 'CheckIn' || a.type === 'CheckOut').map(a => a.id)
    );
    const transportActivityIds = new Set(
      allActivities.filter(a => a.type === 'Travel').map(a => a.id)
    );

    const accommodationActual = Object.entries(activityExpenses)
      .filter(([id]) => accommodationActivityIds.has(Number(id)))
      .reduce((sum, [, expenses]) => sum + expenses.reduce((a, e) => a + (e.totalAmount || 0), 0), 0);
    const transportActual = Object.entries(activityExpenses)
      .filter(([id]) => transportActivityIds.has(Number(id)))
      .reduce((sum, [, expenses]) => sum + expenses.reduce((a, e) => a + (e.totalAmount || 0), 0), 0);
    const activityActual = totalActual - accommodationActual - transportActual;

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
              Status: <Tag color={getTripStatusConfig(trip.status).color}>{getTripStatusConfig(trip.status).label}</Tag>
            </span>
          </div>
        </Card>

        {/* Budget Summary */}
        {summary && (
          <Card
            className={styles.budgetCard}
            title="Budget Summary"
            extra={
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  icon={<ExportOutlined />}
                  loading={exporting}
                  onClick={handleExportPdf}
                >
                  Export PDF
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowBudgetDetails((prev) => !prev)}
                >
                  {showBudgetDetails ? 'Hide details' : 'Show details'}
                </Button>
              </Space>
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
                  title="Total Spent"
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
                {hasBudget ? (
                  <Text strong style={{ color: budgetStatusColor }}>{budgetStatusText} ({budgetPercent.toFixed(1)}%)</Text>
                ) : (
                  <Text strong style={{ color: budgetStatusColor }}>{budgetStatusText}</Text>
                )}
              </div>
              <Progress
                percent={hasBudget ? Math.min(budgetPercent, 100) : 0}
                strokeColor={budgetStatusColor}
                status={hasBudget && budgetPercent > 100 ? 'exception' : 'normal'}
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
                            const activityStatus = activity.status ?? 0;
                            const statusConfig = ACTIVITY_STATUS_CONFIG[activityStatus];
                            const isUpdating = updatingActivityIds.has(activity.id);
                            const activityExpensesList = activityExpenses[activity.id] || [];
                            const totalExpenses = activityExpensesList.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

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
                                  {/* Show budget info if budget exists */}
                                  {budget && (
                                    <div style={{ marginTop: 6 }}>
                                      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                                        <span>
                                          Est: <strong>{formatMoney(estimatedCost, currency)}</strong>
                                        </span>
                                        {totalExpenses > 0 && (
                                          <span>
                                            Spent: <strong>{formatMoney(totalExpenses, currency)}</strong>
                                          </span>
                                        )}
                                      </div>
                                      {totalExpenses > 0 && (() => {
                                        const hasBudget = estimatedCost > 0;
                                        if (!hasBudget) {
                                          return (
                                            <div style={{ marginTop: 4 }}>
                                              <Text strong style={{ color: '#1890ff', fontSize: 11 }}>No Budget Set</Text>
                                            </div>
                                          );
                                        }
                                        const variance = totalExpenses - estimatedCost;
                                        const budgetPercent = (totalExpenses / estimatedCost) * 100;
                                        const isOverBudget = variance > 0;
                                        const statusColor = isOverBudget ? '#ff4d4f' : '#52c41a';
                                        const statusText = isOverBudget ? 'Over Budget' : 'Under Budget';
                                        return (
                                          <div style={{ marginTop: 4 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                              <Text type="secondary" style={{ fontSize: 11 }}>Budget Usage</Text>
                                              <Text strong style={{ color: statusColor, fontSize: 11 }}>{statusText} ({budgetPercent.toFixed(1)}%)</Text>
                                            </div>
                                            <Progress
                                              percent={Math.min(budgetPercent, 100)}
                                              strokeColor={statusColor}
                                              status={budgetPercent > 100 ? 'exception' : 'normal'}
                                              showInfo={false}
                                              size="small"
                                              style={{ marginBottom: 4 }}
                                            />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  {/* Show spent amount even without budget */}
                                  {!budget && totalExpenses > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                                        <span>
                                          Spent: <strong>{formatMoney(totalExpenses, currency)}</strong>
                                        </span>
                                      </div>
                                      <div style={{ marginTop: 4 }}>
                                        <Text strong style={{ color: '#1890ff', fontSize: 11 }}>No Budget Set</Text>
                                      </div>
                                    </div>
                                  )}

                                  {/* Individual expense logs */}
                                  {activityExpensesList.length > 0 && (
                                        <div style={{ marginTop: 6, background: '#fafafa', borderRadius: 6, padding: '6px 8px' }}>
                                          {activityExpensesList.map(exp => (
                                            <div
                                              key={exp.id}
                                              style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: 12,
                                                padding: '3px 0',
                                                borderBottom: '1px solid #f0f0f0',
                                              }}
                                            >
                                              <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 500 }}>{exp.title}</span>
                                                {exp.description && (
                                                  <span style={{ color: '#888', marginLeft: 4 }}>({exp.description})</span>
                                                )}
                                                <span style={{ color: '#aaa', marginLeft: 4 }}>by {exp.createdByName}</span>
                                                {exp.updatedByName && (
                                                  <span style={{ color: '#ff9800', marginLeft: 4, fontStyle: 'italic' }}>
                                                    (edited by {exp.updatedByName})
                                                  </span>
                                                )}
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <strong>{formatMoney(exp.totalAmount, currency)}</strong>
                                                <Button
                                                  type="link"
                                                  size="small"
                                                  style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                                  onClick={() => {
                                                    expenseForm.setFieldsValue({
                                                      title: exp.title,
                                                      description: exp.description,
                                                      totalAmount: exp.totalAmount,
                                                    });
                                                    setExpenseModal({
                                                      open: true,
                                                      activityId: activity.id,
                                                      activityTitle: activity.title || locationName || 'Activity',
                                                      editExpense: exp,
                                                    });
                                                  }}
                                                >
                                                  ✎
                                                </Button>
                                                <Popconfirm
                                                  title="Delete this expense?"
                                                  onConfirm={() => handleDeleteExpense(exp.id)}
                                                  okText="Delete"
                                                  cancelText="Cancel"
                                                >
                                                  <Button type="link" size="small" danger style={{ padding: 0, height: 'auto', fontSize: 12 }}>
                                                    ✕
                                                  </Button>
                                                </Popconfirm>
                                              </div>
                                            </div>
                                          ))}
                                          <div style={{ textAlign: 'right', marginTop: 4, fontWeight: 600, fontSize: 12 }}>
                                            Total: {formatMoney(totalExpenses, currency)}
                                          </div>
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

                                  {/* Status Badge */}
                                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <Tag
                                      icon={statusConfig.icon}
                                      color={statusConfig.color}
                                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                    >
                                      {statusConfig.label}
                                    </Tag>

                                    {/* Status Progression Button */}
                                    {statusConfig.nextStatus !== null && (
                                      <Tooltip title={`Mark as "${statusConfig.nextLabel}"`}>
                                        <Button
                                          type="link"
                                          size="small"
                                          loading={isUpdating}
                                          disabled={isUpdating}
                                          style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                          onClick={() => handleUpdateActivityStatus(activity.id)}
                                        >
                                          {statusConfig.nextLabel}
                                        </Button>
                                      </Tooltip>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className={styles.timelineActions} style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {locationId > 0 && eventType !== 'Travel' && (
                                      <Button
                                        type="link"
                                        size="small"
                                        disabled={isDayUpdating}
                                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                        onClick={() => setLocationModal({ open: true, locationId })}
                                      >
                                        View Details
                                      </Button>
                                    )}
                                    <Tooltip title={activityStatus === 0 ? 'Start the activity before logging expenses' : ''}>
                                      <Button
                                        type="link"
                                        size="small"
                                        icon={<PlusOutlined />}
                                        disabled={activityStatus === 0}
                                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                        onClick={() => {
                                          expenseForm.resetFields();
                                          setExpenseModal({
                                            open: true,
                                            activityId: activity.id,
                                            activityTitle: activity.title || locationName || 'Activity',
                                            editExpense: null,
                                          });
                                        }}
                                      >
                                        Log Expense
                                      </Button>
                                    </Tooltip>
                                  </div>
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
                <>
                  <MemberManagement tripId={trip.id} groupSize={trip.groupSize} tripStatus={trip.status} onMemberChange={refetchTrip} />
                </>
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

        {/* Log Expense Modal */}
        <Modal
          title={expenseModal.editExpense ? `Edit Expense: ${expenseModal.editExpense.title}` : `Log Expense: ${expenseModal.activityTitle}`}
          open={expenseModal.open}
          onCancel={() => {
            setExpenseModal({ open: false, activityId: null, activityTitle: '', editExpense: null });
            expenseForm.resetFields();
          }}
          onOk={() => expenseForm.submit()}
          okText={expenseModal.editExpense ? 'Update' : 'Log Expense'}
          cancelText="Cancel"
        >
          <Form
            form={expenseForm}
            layout="vertical"
            onFinish={handleExpenseSubmit}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="title"
              label="Expense Title"
              rules={[{ required: true, message: 'Please enter expense title' }]}
            >
              <Input placeholder="e.g., Lunch, Taxi fare, Entrance fee" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description (optional)"
            >
              <Input.TextArea rows={2} placeholder="Optional details about the expense" />
            </Form.Item>
            <Form.Item
              name="totalAmount"
              label="Amount"
              rules={[{ required: true, message: 'Please enter amount' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={0}
                placeholder="Enter amount"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default TripDetailPage;
