import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Tag,
  Empty,
  Spin,
  Table,
  Tabs,
  Progress,
  List,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Tooltip,
  Popconfirm,
  Space,
  ConfigProvider,
  Carousel,
  Image,
} from 'antd';
import dayjs from 'dayjs';
import {
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  PlayCircleOutlined,
  ClockCircleFilled,
  PlusOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  EditOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { 
  getTripDetailApi, 
  updateTripActivityStatusApi, 
  logActualExpenseApi, 
  updateExpenseApi, 
  getExpensesByActivityApi, 
  deleteExpenseApi, 
  batchUpdateActivityStatusApi, 
  getBudgetVsActualExportApi,
  updateTripStatusApi,
  updateTripApi,
  getProvincesApi,
  getLocationByIdApi
} from '../api';
import {
  NavigationArrow,
  MapPinLine,
  ForkKnife,
  SignOut,
  SuitcaseRolling,
  ShoppingBag,
} from '@phosphor-icons/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/authStore';
import LocationDetailModal from '../components/LocationDetailModal';
import TransportDetailModal from '../components/TransportDetailModal';
import AccommodationDetailModal from '../components/AccommodationDetailModal';
import MemberManagement from '../components/MemberManagement';
import { exportBudgetVsActualPdf } from '../utils/exportBudgetPdf';
import styles from '../styles/ItineraryResultPage.module.css';

const { Title, Text } = Typography;

const EVENT_BADGES = {
  CheckIn: { badge: <SuitcaseRolling size={24} weight="bold" color="#1A535C" />, bg: 'rgba(26, 83, 92, 0.1)' },
  CheckOut: { badge: <SignOut size={24} weight="bold" color="#1A535C" />, bg: 'rgba(26, 83, 92, 0.1)' },
  Travel: { badge: <NavigationArrow size={24} weight="bold" color="#D89A00" />, bg: 'rgba(255, 230, 109, 0.3)' },
  Visit: { badge: <MapPinLine size={24} weight="bold" color="#24A096" />, bg: 'rgba(78, 205, 196, 0.2)' },
  Shopping: { badge: <ShoppingBag size={24} weight="bold" color="#24A096" />, bg: 'rgba(78, 205, 196, 0.2)' },
  Meal: { badge: <ForkKnife size={24} weight="bold" color="#E64A4A" />, bg: 'rgba(255, 107, 107, 0.15)' },
  LuggageRefresh: { badge: <SuitcaseRolling size={24} weight="bold" color="#1A535C" />, bg: 'rgba(26, 83, 92, 0.1)' },
};

const ACTIVITY_STATUS_CONFIG = {
  0: { label: 'Upcoming', color: 'default', icon: <ClockCircleFilled />, nextStatus: 1, nextLabel: 'Start' },
  1: { label: 'In Progress', color: 'processing', icon: <PlayCircleOutlined />, nextStatus: 2, nextLabel: 'Complete' },
  2: { label: 'Completed', color: 'success', icon: <CheckCircleOutlined />, nextStatus: null, nextLabel: null },
};

const TRIP_STATUS_CONFIG = {
  0: { label: 'Planned', color: 'default', nextStatus: 1, nextLabel: 'Start Trip' },
  1: { label: 'In Progress', color: 'processing', nextStatus: 2, nextLabel: 'Complete Trip' },
  2: { label: 'Completed', color: 'success', nextStatus: null, nextLabel: null },
  3: { label: 'Cancelled', color: 'error', nextStatus: null, nextLabel: null },
};

const getTripStatusConfig = (status) => {
  const key = typeof status === 'number' ? status : Number(status);
  return TRIP_STATUS_CONFIG[key] || { label: `Unknown (${status})`, color: 'default', nextStatus: null, nextLabel: null };
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
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [provinceNameById, setProvinceNameById] = useState(new Map());
  const [locationNameById, setLocationNameById] = useState(new Map());
  const [locationMediaById, setLocationMediaById] = useState(new Map());
  const [locationTelephoneById, setLocationTelephoneById] = useState(new Map());
  const [locationAmenitiesById, setLocationAmenitiesById] = useState(new Map());
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  const [recalculatingDayNumber, setRecalculatingDayNumber] = useState(null);
  const [locationModal, setLocationModal] = useState({ open: false, locationId: null });
  const [transportModal, setTransportModal] = useState({ open: false, data: null });
  const [accommodationModal, setAccommodationModal] = useState({ open: false, data: null });
  const [expenseModal, setExpenseModal] = useState({ open: false, activityId: null, activityTitle: '', editExpense: null });
  const [updatingActivityIds, setUpdatingActivityIds] = useState(new Set());
  const [activityExpenses, setActivityExpenses] = useState({});
  const [expenseForm] = Form.useForm();
  const [exporting, setExporting] = useState(false);
  const [editTripModal, setEditTripModal] = useState(false);
  const [editTripForm] = Form.useForm();
  const [savingTripInfo, setSavingTripInfo] = useState(false);

  const handleExportItineraryPdf = () => {
    if (!trip) return;
    const hide = message.loading('Preparing PDF content...', 0);
    
    const removeAccents = (str) => {
      if (!str) return '';
      return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    };

    try {
      const doc = new jsPDF();
      const currency = trip.currency || 'VND';

      doc.setFontSize(22);
      doc.setTextColor(26, 83, 92);
      doc.text(removeAccents(trip.tripName), 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const dateRange = `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`;
      doc.text(`Duration: ${dateRange} | Members: ${trip.tripMembers?.length || 0} | Currency: ${currency}`, 14, 28);
      
      if (trip.description) {
        doc.setFontSize(10);
        doc.text(`Note: ${removeAccents(trip.description)}`, 14, 34);
      }

      let currentY = 45;

      if (trip.tripSummary) {
        const totalActual = Object.values(activityExpenses).reduce(
          (sum, expenses) => sum + expenses.reduce((a, e) => a + (e.totalAmount || 0), 0), 0
        );

        doc.setFontSize(14);
        doc.text("Budget Summary", 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Total Budget', 'Estimated Total', 'Total Spent', 'Remaining']],
          body: [[
            formatMoney(trip.tripSummary.totalBudget, currency),
            formatMoney(trip.tripSummary.estimatedTotalCost, currency),
            formatMoney(totalActual, currency),
            formatMoney(trip.tripSummary.remainingBudget, currency)
          ]],
          theme: 'striped',
          headStyles: { fillColor: [78, 205, 196] }
        });
        currentY = doc.lastAutoTable.finalY + 15;
      }

      trip.tripDays?.forEach((day) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(26, 83, 92);
        doc.text(`${removeAccents(day.dayTitle)} (${new Date(day.date).toLocaleDateString()})`, 14, currentY);
        currentY += 5;

        const activityRows = (day.activities || []).map(act => {
          const locationName = locationNameById.get(Number(act.locationId)) || act.title;
          const expenses = activityExpenses[act.id] || [];
          const totalSpent = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
          
          let details = act.type;
          if (act.transport) {
            details += ` (${act.transport.transportModeName})`;
          }

          return [
            `${formatTime(act.startTime)} - ${formatTime(act.endTime)}`,
            removeAccents(locationName),
            removeAccents(details),
            formatMoney(act.budget?.estimateCost || 0, currency),
            formatMoney(totalSpent, currency)
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Time', 'Activity/Location', 'Type', 'Estimated', 'Actual']],
          body: activityRows.length > 0 ? activityRows : [['-', 'No activities planned', '-', '-', '-']],
          theme: 'grid',
          headStyles: { fillColor: [26, 83, 92] },
          styles: { fontSize: 9 },
          margin: { left: 14 }
        });

        currentY = doc.lastAutoTable.finalY + 10;
      });

      const fileName = `Itinerary-${removeAccents(trip.tripName).replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`;
      doc.save(fileName);
      message.success('PDF exported successfully!');
    } catch (err) {
      message.error('Error generating PDF!');
    } finally {
      hide();
    }
  };

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
      } catch {}
    };
    loadProvinceNames();
    return () => { mounted = false; };
  }, []);

  const refetchTrip = useCallback(async () => {
    try {
      const data = await getTripDetailApi(Number(id));
      setTrip(data);
    } catch (err) {}
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const loadTrip = async () => {
      setLoading(true);
      try {
        const data = await getTripDetailApi(Number(id));
        if (mounted) setTrip(data);
      } catch (err) {
        if (mounted) setTrip(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) loadTrip();
    return () => { mounted = false; };
  }, [id]);

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
      } catch {}
    };
    loadLocationMetadata();
    return () => { mounted = false; };
  }, [trip]);

  useEffect(() => {
    let mounted = true;
    const loadExpenses = async () => {
      if (!trip) return;
      try {
        const groupedExpenses = await getExpensesByActivityApi(Number(id));
        if (!mounted) return;
        
        const lookup = {};
        (groupedExpenses || []).forEach(item => {
          lookup[item.activityId] = item.expenses || [];
        });
        setActivityExpenses(lookup);
      } catch {}
    };
    loadExpenses();
    return () => { mounted = false; };
  }, [trip, id]);

  const currentUserId = user?.id;
  const myMember = trip?.tripMembers?.find(m => m.userId === currentUserId);
  const isLeader = myMember?.role === 'Leader'; // TripRole.Leader

  // Handle manual trip status update
  const handleUpdateTripStatus = useCallback(async () => {
    const currentStatus = trip?.status ?? 0;
    const config = getTripStatusConfig(currentStatus);

    if (config.nextStatus === null) return;

    setStatusUpdating(true);
    try {
      await updateTripStatusApi(Number(id), config.nextStatus);
      message.success(`Trip status updated to "${getTripStatusConfig(config.nextStatus).label}"`);
      await refetchTrip();
    } catch (err) {
      console.error('Failed to update trip status:', err);
      message.error(err?.response?.data?.message || 'Failed to update trip status');
    } finally {
      setStatusUpdating(false);
    }
  }, [id, trip, refetchTrip]);

  const handleUpdateActivityStatus = useCallback(async (activityId, skipConfirm = false) => {
    const allActivities = trip?.tripDays?.flatMap(d => d.activities || []) || [];
    const activity = allActivities.find(a => a.id === activityId);
    const currentStatus = activity?.status ?? 0;
    const config = ACTIVITY_STATUS_CONFIG[currentStatus];

    if (!config.nextStatus) return;

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
            setUpdatingActivityIds(prev => {
              const next = new Set(prev);
              incompletePrevious.forEach(a => next.add(a.id));
              next.add(activityId);
              return next;
            });
            try {
              await batchUpdateActivityStatusApi({
                activityIdsToComplete: incompletePrevious.map(a => a.id),
                activityIdToStart: activityId,
              });
              message.success(`${incompletePrevious.length} previous activit${incompletePrevious.length > 1 ? 'ies' : 'y'} completed, now in progress`);
              const data = await getTripDetailApi(Number(id));
              setTrip(data);
            } catch (err) {
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
      const data = await getTripDetailApi(Number(id));
      setTrip(data);
    } catch (err) {
      message.error('Failed to update activity status');
    } finally {
      setUpdatingActivityIds(prev => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  }, [trip, id, locationNameById]);

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
      message.error(err?.response?.data?.message || 'Failed to save expense');
    }
  }, [expenseModal, expenseForm, id, trip, user, myMember, reloadTripAndExpenses]);

  const handleDeleteExpense = useCallback(async (expenseId) => {
    try {
      await deleteExpenseApi(expenseId);
      message.success('Expense deleted');
      await reloadTripAndExpenses();
    } catch (err) {
      message.error('Failed to delete expense');
    }
  }, [reloadTripAndExpenses]);

  const handleOpenEditTripModal = useCallback(() => {
    editTripForm.setFieldsValue({
      tripName: trip?.tripName || '',
      description: trip?.description || '',
      dateRange: trip?.startDate && trip?.endDate
        ? [dayjs(trip.startDate), dayjs(trip.endDate)]
        : null,
      currency: trip?.currency || 'VND',
      status: trip?.status ?? 0,
    });
    setEditTripModal(true);
  }, [trip, editTripForm]);

  const handleUpdateTripInfo = useCallback(async (values) => {
    setSavingTripInfo(true);
    try {
      const [startDate, endDate] = values.dateRange || [];
      await updateTripApi(trip.id, {
        tripId: trip.id,
        tripName: values.tripName,
        description: values.description || null,
        startDate: startDate ? startDate.format('YYYY-MM-DD') : trip.startDate,
        endDate: endDate ? endDate.format('YYYY-MM-DD') : trip.endDate,
        startingLocation: trip.startingLocation || null,
        currency: values.currency,
        status: values.status,
      });
      message.success('Trip updated successfully');
      setEditTripModal(false);
      editTripForm.resetFields();
      await refetchTrip();
    } catch (err) {
      message.error(err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update trip');
    } finally {
      setSavingTripInfo(false);
    }
  }, [trip, editTripForm, refetchTrip]);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const data = await getBudgetVsActualExportApi(Number(id));
      await exportBudgetVsActualPdf(data);
      message.success('PDF exported successfully');
    } catch (err) {
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

  const totalBudget = summary?.totalBudget || 0;
  const usableBudget = summary?.usableBudget || 0;
  // Calculate total spent from all expense logs
  const totalActual = Object.values(activityExpenses).reduce(
    (sum, expenses) => sum + expenses.reduce((a, e) => a + (e.totalAmount || 0), 0), 0
  );
  const totalEstimated = summary?.estimatedTotalCost || 0;
  const usableRemaining = usableBudget - totalActual;
  const budgetUsagePercent = usableBudget > 0 ? (totalActual / usableBudget) * 100 : 0;
  const showCaution = usableBudget > 0 && budgetUsagePercent >= 80;

  const variance = totalActual - totalEstimated;
  const hasBudget = totalEstimated > 0;
  const budgetPercent = hasBudget ? (totalActual / totalEstimated) * 100 : 0;
  const budgetStatusColor = !hasBudget ? '#4ECDC4' : (variance > 0 ? '#FF6B6B' : variance < 0 ? '#4ECDC4' : '#1A535C');
  const budgetStatusText = !hasBudget ? 'No Budget Set' : (variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget');

  const categoryData = [];
  if (summary) {
    const allActivities = trip.tripDays?.flatMap(d => d.activities || []) || [];
    const accommodationActivityIds = new Set(
      allActivities.filter(a => a.type === 'CheckIn' || a.type === 'CheckOut').map(a => a.id)
    );
    const transportActivityIds = new Set(
      allActivities.filter(a => a.type === 'Travel').map(a => a.id)
    );

    const accommodationActual = Object.entries(activityExpenses)
      .filter(([accId]) => accommodationActivityIds.has(Number(accId)))
      .reduce((sum, [, expenses]) => sum + expenses.reduce((a, e) => a + (e.totalAmount || 0), 0), 0);
    const transportActual = Object.entries(activityExpenses)
      .filter(([transId]) => transportActivityIds.has(Number(transId)))
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
        <span style={{ color: val > 0 ? '#FF6B6B' : val < 0 ? '#4ECDC4' : '#1A535C', fontWeight: 600 }}>
          {val > 0 ? '+' : ''}{formatMoney(val, currency)}
        </span>
      ),
    },
  ];

  return (
    <>
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
            {trip.updatedAt && (
              <span className={styles.headerMetaItem}>
                <EditOutlined style={{ marginRight: 4 }} />
                Last updated: {new Date(trip.updatedAt).toLocaleString()}
              </span>
            )}
            <span className={styles.headerMetaItem}>
              Status: <Tag color={getTripStatusConfig(trip.status).color}>{getTripStatusConfig(trip.status).label}</Tag>
              {isLeader && getTripStatusConfig(trip.status).nextStatus !== null && (
                <Button 
                  type="primary" 
                  size="small" 
                  loading={statusUpdating}
                  onClick={handleUpdateTripStatus}
                  icon={trip.status === 0 ? <PlayCircleOutlined /> : <CheckCircleOutlined />}
                  style={{ marginLeft: 8 }}
                >
                  {getTripStatusConfig(trip.status).nextLabel}
                </Button>
              )}
            </span>
          </div>
        </Card>

        {summary && (
          <Card
            className={styles.budgetCard}
            title={<div className={styles.budgetCardHeader}><span>Budget Summary</span></div>}              extra={
                <div className={styles.sectionToggleRow}>
                  <Button
                    size="small"
                    className={styles.sectionToggleBtn}
                    onClick={handleExportItineraryPdf}
                  >
                    Download Itinerary PDF
                  </Button>
                  <Button
                    size="small"
                    className={styles.sectionToggleBtn}
                    loading={exporting}
                    onClick={handleExportPdf}
                  >
                    Download Budget Report
                  </Button>
                  <Button
                    size="small"
                    className={styles.sectionToggleBtn}
                    onClick={() => setShowBudgetDetails((prev) => !prev)}
                  >
                    {showBudgetDetails ? 'Hide details' : 'Show details'}
                  </Button>
                </div>
              }
              size="small"
            >
              <div className={styles.budgetVisualContainer}>
                <div className={styles.budgetVisualHeader}>
                  <Text className={styles.budgetVisualLabel}>Budget Usage</Text>
                  {hasBudget ? (
                    <Text strong className={styles.budgetVisualPercent} style={{ color: budgetStatusColor }}>{budgetStatusText} ({budgetPercent.toFixed(1)}%)</Text>
                  ) : (
                    <Text strong className={styles.budgetVisualPercent} style={{ color: budgetStatusColor }}>{budgetStatusText}</Text>
                  )}
                </div>
                <Progress
                  percent={hasBudget ? Math.min(budgetPercent, 100) : 0}
                  strokeColor={budgetStatusColor}
                  trailColor="rgba(78, 205, 196, 0.15)"
                  status={hasBudget && budgetPercent > 100 ? 'exception' : 'normal'}
                  showInfo={false}
                  size={["100%", 10]}
                />
              </div>

              <div className={styles.budgetMainGrid}>
                <div className={styles.budgetStatBox}>
                  <span className={styles.budgetStatLabel}>Total Budget</span>
                  <span className={styles.budgetTotalValue}>{formatMoney(summary.totalBudget, currency)}</span>
                </div>
                <div className={styles.budgetStatBox}>
                  <span className={styles.budgetStatLabel}>Estimated Total</span>
                  <span className={styles.budgetEstimatedValue}>{formatMoney(summary.estimatedTotalCost, currency)}</span>
                </div>
                <div className={styles.budgetStatBox}>
                  <span className={styles.budgetStatLabel}>Total Spent</span>
                  <span className={styles.budgetMealValue} style={{ color: budgetStatusColor }}>{formatMoney(totalActual, currency)}</span>
                </div>
                <div className={styles.budgetStatBox}>
                  <span className={styles.budgetStatLabel}>Remaining</span>
                  <span className={styles.budgetRemainingValue} style={{ color: summary.remainingBudget >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{formatMoney(summary.remainingBudget, currency)}</span>
                </div>
              </div>

              {showBudgetDetails && (
                <div style={{ marginTop: 24 }} className={styles.budgetDetailsSection}>
                  <div className={styles.budgetBreakdownTitle}>Category Breakdown</div>
                  <Table
                    className={styles.tropicalTable}
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

          <Tabs
            defaultActiveKey="itinerary"
            items={[
              {
                key: 'itinerary',
                label: <span style={{ fontWeight: 600 }}>Itinerary</span>,
                children: (
                  <>
                    {trip.tripDays?.map((day) => {
                      const dayNum = day.dayNumber;
                      const isDayUpdating = recalculatingDayNumber === dayNum;
                      const activities = day.activities || [];

                      return (
                        <Card key={day.id} className={styles.dayCard} bordered={false} bodyStyle={{ padding: 0 }}>
                          <div className={styles.dayHeaderInner} style={{ padding: '24px 32px', background: '#4ECDC4' }}>
                            <div className={styles.dayHeaderLeft}>
                              <div className={styles.dayTitle}>{day.dayTitle}</div>
                              <div className={styles.dayMeta} style={{ color: '#1A535C' }}>
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
                          </div>

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
                              const mediaUrls = locationId > 0 ? locationMediaById.get(locationId) || [] : [];
                              const budget = activity.budget;
                              const estimatedCost = budget?.estimateCost || 0;
                              const activityStatus = activity.status ?? 0;
                              const statusConfig = ACTIVITY_STATUS_CONFIG[activityStatus];
                              const isUpdating = updatingActivityIds.has(activity.id);
                              const activityExpensesList = activityExpenses[activity.id] || [];
                              const totalExpenses = activityExpensesList.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

                              let cardClass = styles.visitCard;
                              if (eventType === 'Travel') cardClass = styles.travelCard;
                              else if (eventType === 'Meal') cardClass = styles.mealCard;
                              else if (['CheckIn', 'CheckOut', 'LuggageRefresh'].includes(eventType)) cardClass = styles.logisticsCard;

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

                                  {/* Show Route for Travel */}
                                  {eventType === 'Travel' && activity.transport && (
                                    <div style={{ marginTop: 4, fontSize: 13, color: '#434343', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Text strong style={{ fontSize: 13 }}>
                                        {activity.transport.customFromTransitHubName || 
                                         activity.transport.fromTransitHubName || 
                                         activity.transport.fromLocationName || 
                                         activity.transport.yourLocationName || 'Start'}
                                      </Text>
                                      <span style={{ color: '#bfbfbf', margin: '0 4px' }}>➔</span>
                                      <Text strong style={{ fontSize: 13 }}>
                                        {activity.transport.customToTransitHubName || 
                                         activity.transport.toTransitHubName || 
                                         activity.transport.toLocationName || 'Destination'}
                                      </Text>
                                    </div>
                                  )}
                                  {/* Show budget info if budget is allocated */}
                                  {budget && estimatedCost > 0 && (
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
                                  {/* Show spent amount if no budget allocated but expenses exist */}
                                  {(!budget || estimatedCost <= 0) && totalExpenses > 0 && (
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
                                  <div className={styles.timelineIcon} style={{ background: eventConfig.bg }}>
                                    {eventConfig.badge}
                                  </div>
                                  <div className={styles.timelineContent}>
                                    <div className={`${styles.card} ${cardClass}`}>
                                      <div className={eventType === 'Meal' ? styles.mealTop : styles.visitTop}>
                                        <div className={eventType === 'Meal' ? styles.mealDetails : styles.visitDetails}>
                                          <div className={styles.visitInfo}>
                                            <h3 className={styles.title}>{locationName || activity.title}</h3>
                                            {eventType === 'Travel' && activity.transport && (
                                              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(26, 83, 92, 0.6)', marginLeft: 8 }}>
                                                ({activity.transport.transportModeName || 'Transport'} • {formatMinutesAsHourMinute(activity.transport.travelTimeMinutes)})
                                              </span>
                                            )}
                                          </div>

                                          {eventType === 'Travel' && activity.transport && (
                                            <div style={{ marginTop: 8, fontSize: 14, color: '#1A535C', display: 'flex', alignItems: 'center', gap: 8 }}>
                                              <Text strong>
                                                {activity.transport.customFromTransitHubName || 
                                                 activity.transport.fromTransitHubName || 
                                                 activity.transport.fromLocationName || 
                                                 activity.transport.yourLocationName || 'Start'}
                                              </Text>
                                              <span style={{ color: '#4ECDC4' }}>➔</span>
                                              <Text strong>
                                                {activity.transport.customToTransitHubName || 
                                                 activity.transport.toTransitHubName || 
                                                 activity.transport.toLocationName || 'Destination'}
                                              </Text>
                                            </div>
                                          )}

                                          {budget && (
                                            <div style={{ marginTop: 12 }}>
                                              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                                                <span>Est: <strong className={styles.costAmount} style={{ color: '#1A535C' }}>{formatMoney(estimatedCost, currency)}</strong></span>
                                                {totalExpenses > 0 && (
                                                  <span>Spent: <strong className={styles.costAmount}>{formatMoney(totalExpenses, currency)}</strong></span>
                                                )}
                                              </div>
                                              {totalExpenses > 0 && (() => {
                                                const hasBudget = estimatedCost > 0;
                                                if (!hasBudget) return null;
                                                const variance = totalExpenses - estimatedCost;
                                                const budgetPercent = (totalExpenses / estimatedCost) * 100;
                                                const isOverBudget = variance > 0;
                                                const statusColor = isOverBudget ? '#FF6B6B' : '#4ECDC4';
                                                const statusText = isOverBudget ? 'Over Budget' : 'Under Budget';
                                                return (
                                                  <div style={{ marginTop: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                      <Text className={styles.budgetVisualLabel} style={{ fontSize: 11 }}>Budget Usage</Text>
                                                      <Text strong style={{ color: statusColor, fontSize: 11 }}>{statusText} ({budgetPercent.toFixed(1)}%)</Text>
                                                    </div>
                                                    <Progress
                                                      percent={Math.min(budgetPercent, 100)}
                                                      strokeColor={statusColor}
                                                      trailColor="rgba(78, 205, 196, 0.15)"
                                                      status={budgetPercent > 100 ? 'exception' : 'normal'}
                                                      showInfo={false}
                                                      size={["100%", 6]}
                                                      style={{ marginBottom: 4 }}
                                                    />
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                          )}

                                          {!budget && totalExpenses > 0 && (
                                            <div style={{ marginTop: 12, fontSize: 13 }}>
                                              <span>Spent: <strong className={styles.costAmount}>{formatMoney(totalExpenses, currency)}</strong></span>
                                            </div>
                                          )}

                                          {activityExpensesList.length > 0 && (
                                            <div style={{ marginTop: 12, background: 'rgba(255, 255, 255, 0.6)', borderRadius: 12, padding: '12px', border: '1px solid rgba(26, 83, 92, 0.05)' }}>
                                              {activityExpensesList.map(exp => (
                                                <div
                                                  key={exp.id}
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: 13,
                                                    padding: '6px 0',
                                                    borderBottom: '1px dashed rgba(26, 83, 92, 0.1)',
                                                  }}
                                                >
                                                  <div style={{ flex: 1 }}>
                                                    <span style={{ fontWeight: 700, color: '#1A535C' }}>{exp.title}</span>
                                                    {exp.description && (
                                                      <span style={{ color: 'rgba(26, 83, 92, 0.6)', marginLeft: 6 }}>({exp.description})</span>
                                                    )}
                                                    <span style={{ color: 'rgba(26, 83, 92, 0.4)', marginLeft: 6 }}>by {exp.createdByName}</span>
                                                    {exp.updatedByName && (
                                                      <span style={{ color: '#FF6B6B', marginLeft: 6, fontStyle: 'italic', fontSize: 11 }}>
                                                        (edited by {exp.updatedByName})
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <strong className={styles.costAmount}>{formatMoney(exp.totalAmount, currency)}</strong>
                                                    <Button
                                                      type="text"
                                                      className={styles.linkButton}
                                                      style={{ minWidth: 'auto', minHeight: 'auto', padding: '0 4px' }}
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
                                                      <Button type="text" danger className={styles.linkButton} style={{ minWidth: 'auto', minHeight: 'auto', padding: '0 4px' }}>
                                                        ✕
                                                      </Button>
                                                    </Popconfirm>
                                                  </div>
                                                </div>
                                              ))}
                                              <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 800, fontSize: 14, color: '#1A535C' }}>
                                                Total: {formatMoney(totalExpenses, currency)}
                                              </div>
                                            </div>
                                          )}

                                          {amenities.length > 0 && (
                                            <div className={styles.tags} style={{ marginTop: 12 }}>
                                              {amenities.slice(0, 5).map((amenity, amenityIdx) => (
                                                <Tag key={`${actIdx}-amenity-${amenityIdx}`} className={styles.customTag}>
                                                  {amenity}
                                                </Tag>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {telephone && (
                                            <p className={styles.address} style={{ marginTop: 8 }}>Phone: {telephone}</p>
                                          )}

                                          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            <Tag
                                              icon={statusConfig.icon}
                                              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 9999, padding: '4px 12px', fontWeight: 600, border: 'none', background: statusConfig.color === 'default' ? '#F7F9F9' : statusConfig.color === 'processing' ? 'rgba(78, 205, 196, 0.15)' : 'rgba(26, 83, 92, 0.1)', color: statusConfig.color === 'processing' ? '#4ECDC4' : '#1A535C' }}
                                            >
                                              {statusConfig.label}
                                            </Tag>
                                          </div>

                                          <div className={styles.cardActions} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px dashed rgba(26, 83, 92, 0.1)' }}>
                                            {statusConfig.nextStatus !== null && (
                                              <Tooltip title={`Mark as "${statusConfig.nextLabel}"`}>
                                                <Button
                                                  type="primary"
                                                  loading={isUpdating}
                                                  disabled={isUpdating}
                                                  style={{ 
                                                    background: statusConfig.nextStatus === 1 ? '#FFE66D' : '#4ECDC4', 
                                                    color: '#1A535C', 
                                                      borderRadius: 9999, 
                                                    fontWeight: 800, 
                                                    border: 'none', 
                                                    padding: '0 24px', 
                                                    height: 38,
                                                    boxShadow: '0 4px 12px rgba(26, 83, 92, 0.1)'
                                                  }}
                                                  onClick={() => handleUpdateActivityStatus(activity.id)}
                                                >
                                                  {statusConfig.nextLabel}
                                                </Button>
                                              </Tooltip>
                                            )}

                                            {locationId > 0 && eventType !== 'Travel' && (
                                              <Button
                                                type="text"
                                                className={styles.linkButton}
                                                disabled={isDayUpdating}
                                                onClick={() => setLocationModal({ open: true, locationId })}
                                              >
                                                View Details
                                              </Button>
                                            )}
                                            {eventType === 'Travel' && activity.transport && (
                                              <Button
                                                type="text"
                                                className={styles.linkButton}
                                                onClick={() => setTransportModal({ open: true, data: activity.transport })}
                                              >
                                                View Transport
                                              </Button>
                                            )}

                                            <Tooltip title={activityStatus === 0 ? 'Start the activity before logging expenses' : ''}>
                                              <Button
                                                type="text"
                                                icon={<PlusOutlined />}
                                                className={styles.linkButton}
                                                disabled={activityStatus === 0}
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

                                        {mediaUrls.length > 0 && (eventType === 'Visit' || eventType === 'Shopping' || eventType === 'Meal') && (
                                          <div className={eventType === 'Meal' ? styles.mealImage : styles.visitImage}>
                                            <Image.PreviewGroup>
                                              {mediaUrls.length > 1 ? (
                                                <Carousel autoplay effect="fade" dots={false} className={styles.imageCarousel}>
                                                  {mediaUrls.map((url, imgIdx) => (
                                                    <div key={imgIdx}>
                                                      <Image 
                                                        src={url} 
                                                        alt={`${locationName || activity.title} ${imgIdx + 1}`} 
                                                        className={styles.carouselImage}
                                                        style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
                                                      />
                                                    </div>
                                                  ))}
                                                </Carousel>
                                              ) : (
                                                <Image 
                                                  src={mediaUrls[0]} 
                                                  alt={locationName || activity.title} 
                                                  className={styles.carouselImage}
                                                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                                />
                                              )}
                                            </Image.PreviewGroup>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {activities.length === 0 && (
                              <Empty description="No activities planned for this day" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                          </div>

                          {day.estimateCost > 0 && (
                            <div style={{ padding: '20px 32px', borderTop: '1px dashed rgba(26, 83, 92, 0.1)', background: '#F7F9F9' }}>
                              <Text className={styles.budgetVisualLabel}>Day {dayNum} Estimated Cost: </Text>
                              <Text strong style={{ fontSize: 16, color: '#1A535C' }}>{formatMoney(day.estimateCost, currency)}</Text>
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
                label: <span style={{ fontWeight: 600 }}>Members ({trip.tripMembers?.length || 0})</span>,
                children: (
                  <Card className={styles.dayCard} bordered={false}>
                    <MemberManagement tripId={trip.id} groupSize={trip.groupSize} tripStatus={trip.status} onMemberChange={refetchTrip} />
                  </Card>
                ),
              },
            ]}
          />

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

          <Modal
            title={<span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A535C', fontWeight: 800 }}>Edit Trip</span>}
            open={editTripModal}
            onCancel={() => { setEditTripModal(false); editTripForm.resetFields(); }}
            onOk={() => editTripForm.submit()}
            okText="Save Changes"
            cancelText="Cancel"
            confirmLoading={savingTripInfo}
            okButtonProps={{ className: styles.sectionToggleBtn, style: { background: '#FFE66D', color: '#1A535C', border: 'none' } }}
            cancelButtonProps={{ className: styles.sectionToggleBtn }}
          >
            <Form
              form={editTripForm}
              layout="vertical"
              onFinish={handleUpdateTripInfo}
              style={{ marginTop: 24 }}
            >
              <Form.Item
                name="tripName"
                label={<span className={styles.editTimelineLabel}>Trip Name</span>}
                rules={[{ required: true, message: 'Please enter trip name' }, { max: 200, message: 'Max 200 characters' }]}
              >
                <Input className={styles.editTimelineInput} placeholder="e.g., Hanoi Summer Adventure" />
              </Form.Item>
              <Form.Item
                name="description"
                label={<span className={styles.editTimelineLabel}>Description</span>}
              >
                <Input.TextArea className={styles.editTimelineInput} rows={3} placeholder="Optional trip description" />
              </Form.Item>
              <Form.Item
                name="dateRange"
                label={<span className={styles.editTimelineLabel}>Trip Dates</span>}
                rules={[{ required: true, message: 'Please select trip dates' }]}
              >
                <DatePicker.RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item
                name="currency"
                label={<span className={styles.editTimelineLabel}>Currency</span>}
                rules={[{ required: true, message: 'Please enter currency' }]}
              >
                <Select
                  options={[
                    { value: 'VND', label: 'VND — Vietnamese Dong' },
                    { value: 'USD', label: 'USD — US Dollar' },
                    { value: 'EUR', label: 'EUR — Euro' },
                    { value: 'THB', label: 'THB — Thai Baht' },
                    { value: 'SGD', label: 'SGD — Singapore Dollar' },
                    { value: 'JPY', label: 'JPY — Japanese Yen' },
                    { value: 'KRW', label: 'KRW — Korean Won' },
                  ]}
                  placeholder="Select currency"
                />
              </Form.Item>
              <Form.Item
                name="status"
                label={<span className={styles.editTimelineLabel}>Status</span>}
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select
                  options={[
                    { value: 0, label: 'Planned' },
                    { value: 1, label: 'In Progress' },
                    { value: 2, label: 'Completed' },
                    { value: 3, label: 'Cancelled' },
                  ]}
                />
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title={<span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A535C', fontWeight: 800 }}>{expenseModal.editExpense ? `Edit Expense: ${expenseModal.editExpense.title}` : `Log Expense: ${expenseModal.activityTitle}`}</span>}
            open={expenseModal.open}
            onCancel={() => {
              setExpenseModal({ open: false, activityId: null, activityTitle: '', editExpense: null });
              expenseForm.resetFields();
            }}
            onOk={() => expenseForm.submit()}
            okText={expenseModal.editExpense ? 'Update' : 'Log Expense'}
            cancelText="Cancel"
            okButtonProps={{ className: styles.sectionToggleBtn, style: { background: '#FFE66D', color: '#1A535C', border: 'none' } }}
            cancelButtonProps={{ className: styles.sectionToggleBtn }}
          >
            <Form
              form={expenseForm}
              layout="vertical"
              onFinish={handleExpenseSubmit}
              style={{ marginTop: 24 }}
            >
              <Form.Item
                name="title"
                label={<span className={styles.editTimelineLabel}>Expense Title</span>}
                rules={[{ required: true, message: 'Please enter expense title' }]}
              >
                <Input className={styles.editTimelineInput} placeholder="e.g., Lunch, Taxi fare, Entrance fee" />
              </Form.Item>
              <Form.Item
                name="description"
                label={<span className={styles.editTimelineLabel}>Description (optional)</span>}
              >
                <Input.TextArea className={styles.editTimelineInput} rows={2} placeholder="Optional details about the expense" />
              </Form.Item>
              <Form.Item
                name="totalAmount"
                label={<span className={styles.editTimelineLabel}>Amount</span>}
                rules={[{ required: true, message: 'Please enter amount' }]}
              >
                <InputNumber
                  className={styles.editTimelineInput}
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
    </>
  );
};

export default TripDetailPage;