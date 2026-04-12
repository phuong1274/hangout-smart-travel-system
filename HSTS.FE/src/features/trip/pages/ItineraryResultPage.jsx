import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  Typography,
  Button,
  Tag,
  Empty,
  Space,
  Popconfirm,
  message,
  Modal,
  Select,
  Spin,
  ConfigProvider,
  Carousel,
  Collapse,
  Progress
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTripPlanner } from '../hooks/useTripPlanner';
import {
  getProvincesApi,
  estimateLocalTravelApi,
  getLocationsByProvinceApi,
  saveTripApi,
} from '../api';
import LocationDetailModal from '../components/LocationDetailModal';
import TransportDetailModal from '../components/TransportDetailModal';
import AccommodationDetailModal from '../components/AccommodationDetailModal';
import {
  PaperPlaneRight,
  NavigationArrow,
  MapPinLine,
  ForkKnife,
  SignIn,
  SignOut,
  SuitcaseRolling,
  Star,
  Clock
} from '@phosphor-icons/react';
import styles from './ItineraryResultPage.module.css';

const { Title, Text } = Typography;

const EVENT_BADGES = {
  travel: {
    badge: <NavigationArrow size={24} weight="bold" color="#D89A00" />,
    bg: 'rgba(255, 230, 109, 0.3)'
  },
  visit: {
    badge: <MapPinLine size={24} weight="bold" color="#24A096" />,
    bg: 'rgba(78, 205, 196, 0.2)'
  },
  meal: {
    badge: <ForkKnife size={24} weight="bold" color="#E64A4A" />,
    bg: 'rgba(255, 107, 107, 0.15)'
  },
  'check-in': {
    badge: <SignIn size={24} weight="bold" color="#1A535C" />,
    bg: 'rgba(26, 83, 92, 0.1)'
  },
  'check-out': {
    badge: <SignOut size={24} weight="bold" color="#1A535C" />,
    bg: 'rgba(26, 83, 92, 0.1)'
  },
  'luggage-refresh': {
    badge: <SuitcaseRolling size={24} weight="bold" color="#1A535C" />,
    bg: 'rgba(26, 83, 92, 0.1)'
  },
};

const EVENT_DEFAULT_TITLES = {
  travel: 'Move',
  visit: 'Visit',
  meal: 'Meal',
  'check-in': 'Check-in',
  'check-out': 'Check-out',
  'luggage-refresh': 'Luggage Refresh',
};

const ACTIVITY_TYPE_ENUM = {
  'check-in': 0,
  'check-out': 1,
  travel: 2,
  visit: 3,
  shopping: 4,
  'luggage-refresh': 5,
  meal: 6,
};

const normalizeTitle = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const translateTitleToEnglish = (rawTitle) => {
  const normalized = normalizeTitle(rawTitle);
  if (!normalized) return '';

  const directMap = {
    'di chuyen': 'Move',
    'tham quan': 'Visit',
    'an uong': 'Meal',
    'nhan phong': 'Check-in',
    'tra phong': 'Check-out',
    'gui hanh ly': 'Luggage Refresh',
    'lay hanh ly': 'Luggage Refresh',
  };

  if (directMap[normalized]) {
    return directMap[normalized];
  }

  return rawTitle;
};

const translateNoteToEnglish = (rawNote, eventType) => {
  const note = String(rawNote || '').trim();
  if (!note) return '';

  const normalized = normalizeTitle(note);

  const directMap = {
    'nhan phong va gui hanh ly': 'Check-in and luggage refresh',
    'nhan phong va lay hanh ly': 'Check-in and luggage refresh',
    'nhan phong': 'Check-in',
    'tra phong': 'Check-out',
    'gui hanh ly': 'Luggage refresh',
    'lay hanh ly': 'Luggage refresh',
  };

  if (directMap[normalized]) {
    return directMap[normalized];
  }

  if ((eventType === 'check-in' || eventType === 'luggage-refresh')
    && (normalized.includes('nhan phong') || normalized.includes('hanh ly'))) {
    return 'Check-in and luggage refresh';
  }

  return note;
};

const pickFirstText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const getTravelPointName = (travelDetail, isFrom) => {
  if (!travelDetail) return '';
  if (isFrom) {
    return pickFirstText(
      travelDetail.fromTransitHubName,
      travelDetail.FromTransitHubName,
      travelDetail.fromLocationName,
      travelDetail.FromLocationName,
      travelDetail.fromProvinceName,
      travelDetail.FromProvinceName,
      travelDetail.fromEnglishName,
      travelDetail.FromEnglishName,
      travelDetail.fromName,
      travelDetail.FromName,
      travelDetail.from,
      travelDetail.From,
      travelDetail.fromLocationId != null ? `Location #${travelDetail.fromLocationId}` : '',
      travelDetail.FromLocationId != null ? `Location #${travelDetail.FromLocationId}` : '',
    );
  }
  return pickFirstText(
    travelDetail.toTransitHubName,
    travelDetail.ToTransitHubName,
    travelDetail.toLocationName,
    travelDetail.ToLocationName,
    travelDetail.toProvinceName,
    travelDetail.ToProvinceName,
    travelDetail.toEnglishName,
    travelDetail.ToEnglishName,
    travelDetail.toName,
    travelDetail.ToName,
    travelDetail.to,
    travelDetail.To,
    travelDetail.toLocationId != null ? `Location #${travelDetail.toLocationId}` : '',
    travelDetail.ToLocationId != null ? `Location #${travelDetail.ToLocationId}` : '',
  );
};

const formatMoney = (moneyDto) => {
  if (!moneyDto) return null;
  const amount = Number(moneyDto.amount ?? moneyDto.Amount ?? 0);
  const currency = moneyDto.currency || moneyDto.Currency || 'VND';
  return `${Math.round(amount).toLocaleString('vi-VN')} ${currency}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
};

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getMoneyAmount = (moneyDto) => {
  if (!moneyDto) return null;
  const amount = Number(moneyDto.amount ?? moneyDto.Amount);
  return Number.isFinite(amount) ? amount : null;
};

const normalizeMoney = (value, fallbackCurrency = 'VND') => {
  if (value == null) return null;

  if (typeof value === 'number' || typeof value === 'string') {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return null;
    return { amount, currency: fallbackCurrency };
  }

  const amount = getMoneyAmount(value);
  if (amount == null) return null;
  return {
    amount,
    currency: value.currency || value.Currency || fallbackCurrency,
  };
};

const pickBestMoney = (...candidates) => {
  const valid = candidates.filter((candidate) => getMoneyAmount(candidate) != null);
  if (!valid.length) return null;

  const positive = valid.find((candidate) => (getMoneyAmount(candidate) ?? 0) > 0);
  return positive || valid[0];
};

const getTransportOptions = (travelDetail) => {
  const options = travelDetail?.transportOptions || travelDetail?.TransportOptions || [];
  return Array.isArray(options) ? options : [];
};

const getRecommendedTransportOption = (travelDetail) => {
  const options = getTransportOptions(travelDetail);
  if (!options.length) return null;
  return options.find((option) => Boolean(option?.recommended ?? option?.Recommended)) || options[0];
};

const getTravelMethod = (travelDetail) => {
  const recommended = getRecommendedTransportOption(travelDetail);
  return pickFirstText(
    travelDetail?.selectedMethod,
    travelDetail?.SelectedMethod,
    recommended?.method,
    recommended?.Method,
    travelDetail?.mode,
    travelDetail?.Mode,
    travelDetail?.transportMode,
    travelDetail?.TransportMode,
  );
};

const getTravelDurationMinutes = (travelDetail) => {
  const selected = toFiniteNumber(travelDetail?.selectedTravelTimeMinutes ?? travelDetail?.SelectedTravelTimeMinutes);
  if (selected != null && selected > 0) return selected;

  const direct = toFiniteNumber(
    travelDetail?.durationMinutes
    ?? travelDetail?.DurationMinutes
    ?? travelDetail?.duration
    ?? travelDetail?.Duration
  );
  if (direct != null && direct > 0) return direct;

  const recommended = getRecommendedTransportOption(travelDetail);
  const optionMinutes = toFiniteNumber(recommended?.estimatedTravelMinutes ?? recommended?.EstimatedTravelMinutes);
  return optionMinutes != null && optionMinutes > 0 ? optionMinutes : null;
};

const getTravelGroupCost = (itemCostForGroup, travelDetail) => {
  const recommended = getRecommendedTransportOption(travelDetail);
  return pickBestMoney(
    itemCostForGroup,
    travelDetail?.selectedTotalCost,
    travelDetail?.SelectedTotalCost,
    recommended?.costForGroup,
    recommended?.CostForGroup,
    recommended?.estimatedTotalCost,
    recommended?.EstimatedTotalCost,
  );
};

const formatMinutesAsHourMinute = (minutes) => {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '';

  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;
  return `${hours}h ${mins}m`;
};

const getDurationStr = (start, end) => {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return '';
  return formatMinutesAsHourMinute(diffMin);
};

const getEnglishPreferredName = (item) => {
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  const localName = String(item?.name || item?.Name || '').trim();
  return englishName || localName || '';
};

const extractMediaUrls = (value) => {
  if (!value) return [];

  const toUrl = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item.trim();
    return String(
      item?.url
      || item?.Url
      || item?.mediaUrl
      || item?.MediaUrl
      || item?.link
      || item?.Link
      || item?.href
      || item?.Href
      || ''
    ).trim();
  };

  const asList = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];

    const candidateArrays = [
      value?.mediaUrls,
      value?.MediaUrls,
      value?.mediaLinks,
      value?.MediaLinks,
      value?.images,
      value?.Images,
      value?.medias,
      value?.Medias,
    ].filter(Array.isArray);

    if (candidateArrays.length > 0) {
      return candidateArrays.flat();
    }

    return [value];
  })();

  return [...new Set(asList.map(toUrl).filter(Boolean))];
};

const extractAmenityNames = (value) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      return String(item?.englishName || item?.EnglishName || item?.name || item?.Name || '').trim();
    })
    .filter(Boolean);
};

const parseScoreToFive = (value) => {
  if (value == null || value === '') return null;

  const match = String(value).match(/([0-9]+(?:[.,][0-9]+)?)/);
  if (!match) return null;

  const numeric = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;

  let normalized = numeric;
  if (numeric > 10) {
    normalized = numeric / 20;
  } else if (numeric > 5) {
    normalized = numeric / 2;
  }

  return Math.min(5, Math.max(0, normalized));
};

const formatScoreLabel = (value) => {
  const score = parseScoreToFive(value);
  if (score == null) return null;
  if (score <= 0) return null;

  const decimalPlaces = Number.isInteger(score) ? 0 : 1;
  return `${score.toFixed(decimalPlaces)}/5`;
};

const toMinutesOfDay = (timeStr) => {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':').map((part) => Number(part));
  if (parts.length < 2) return null;
  const [hour, minute] = parts;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return ((hour * 60) + minute + 1440) % 1440;
};

const toTimeOnlyString = (minutesOfDay) => {
  const normalized = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}:00`;
};

const addMinutesToTime = (timeStr, minutesToAdd) => {
  const base = toMinutesOfDay(timeStr);
  const safeBase = base == null ? 8 * 60 : base;
  return toTimeOnlyString(safeBase + Math.max(0, Math.round(minutesToAdd || 0)));
};

const shiftTimeByMinutes = (timeStr, deltaMinutes) => {
  const base = toMinutesOfDay(timeStr);
  if (base == null) return String(timeStr || '');
  return toTimeOnlyString(base + Math.round(deltaMinutes || 0));
};

const getTimelineDurationMinutes = (item) => {
  const eventType = item?.eventType || item?.EventType;
  const start = toMinutesOfDay(item?.startTime || item?.StartTime);
  const end = toMinutesOfDay(item?.endTime || item?.EndTime);

  if (start != null && end != null) {
    const diff = end >= start ? end - start : (end + 1440) - start;
    if (diff > 0) return diff;
  }

  if (eventType === 'check-in' || eventType === 'check-out' || eventType === 'luggage-refresh') return 30;
  if (eventType === 'meal') return 60;
  return 90;
};

const getItemLocationId = (item) => Number(item?.locationId ?? item?.LocationId);

const isTravelEvent = (item) => (item?.eventType || item?.EventType) === 'travel';

const isEditableLocationEvent = (item) => {
  const locationId = getItemLocationId(item);
  return !isTravelEvent(item) && Number.isFinite(locationId) && locationId > 0;
};

const getTravelDetailEntry = (item) => {
  const candidates = [
    ['locationToLocationTravel', item?.locationToLocationTravel],
    ['LocationToLocationTravel', item?.LocationToLocationTravel],
    ['transitHubToLocationTravel', item?.transitHubToLocationTravel],
    ['TransitHubToLocationTravel', item?.TransitHubToLocationTravel],
    ['locationToTransitHubTravel', item?.locationToTransitHubTravel],
    ['LocationToTransitHubTravel', item?.LocationToTransitHubTravel],
    ['provinceToProvinceTravel', item?.provinceToProvinceTravel],
    ['ProvinceToProvinceTravel', item?.ProvinceToProvinceTravel],
  ];

  return candidates.find(([, value]) => Boolean(value)) || [null, null];
};

const clonePlainObject = (value) => JSON.parse(JSON.stringify(value));

const buildLocationMetadataFromItinerary = (itinerary) => {
  const nameMap = new Map();
  const mediaMap = new Map();
  const telephoneMap = new Map();
  const amenitiesMap = new Map();

  const upsertLocationMetadata = (source) => {
    const id = Number(source?.locationId ?? source?.LocationId);
    if (!Number.isFinite(id) || id <= 0) return;

    if (!nameMap.has(id)) {
      const name = pickFirstText(
        source?.locationName,
        source?.LocationName,
        source?.englishName,
        source?.EnglishName,
        source?.name,
        source?.Name,
      );
      if (name) nameMap.set(id, name);
    }

    if (!telephoneMap.has(id)) {
      const telephone = pickFirstText(source?.telephone, source?.Telephone);
      if (telephone) telephoneMap.set(id, telephone);
    }

    const amenities = extractAmenityNames(
      source?.amenityNames
      || source?.AmenityNames
      || source?.amenities
      || source?.Amenities
      || []
    );
    if (amenities.length > 0 && !amenitiesMap.has(id)) {
      amenitiesMap.set(id, amenities);
    }

    const mediaUrls = extractMediaUrls(source);
    if (mediaUrls.length > 0) {
      const previous = mediaMap.get(id) || [];
      mediaMap.set(id, [...new Set([...previous, ...mediaUrls])]);
    }
  };

  const days = itinerary?.days || itinerary?.Days || [];
  days.forEach((day) => {
    const timeline = day?.timeline || day?.Timeline || [];
    timeline.forEach((item) => {
      upsertLocationMetadata(item);
      const alternatives = item?.alternatives || item?.Alternatives || [];
      alternatives.forEach((alternative) => upsertLocationMetadata(alternative));
    });
  });

  return { nameMap, mediaMap, telephoneMap, amenitiesMap };
};

const getTimelineItemCostAmount = (item) => {
  if (!item) return 0;

  const [, travelDetail] = getTravelDetailEntry(item);
  const travelCost = getTravelGroupCost(item.costForGroup || item.CostForGroup, travelDetail);
  const amount = getMoneyAmount(
    travelCost
    || item.costForGroup
    || item.CostForGroup
    || item.ticketCost
    || item.TicketCost
  );

  return amount ?? 0;
};

const getTimelineCostBreakdown = (timeline) => {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  return safeTimeline.reduce((acc, item) => {
    const amount = getTimelineItemCostAmount(item);
    if (amount <= 0) return acc;

    const eventType = String(item?.eventType || item?.EventType || '').toLowerCase();
    if (eventType === 'meal') {
      acc.meal += amount;
    } else {
      acc.other += amount;
    }

    return acc;
  }, { meal: 0, other: 0 });
};

const getTimelineDetailedCostBreakdown = (timeline) => {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  return safeTimeline.reduce((acc, item) => {
    const amount = getTimelineItemCostAmount(item);
    if (amount <= 0) return acc;

    const eventType = String(item?.eventType || item?.EventType || '').toLowerCase();
    if (eventType === 'meal') {
      acc.meal += amount;
    } else if (eventType === 'travel') {
      acc.transport += amount;
    } else {
      acc.activity += amount;
    }

    return acc;
  }, { meal: 0, transport: 0, activity: 0 });
};

const toPositiveIntOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

const normalizeTimeOnly = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  return null;
};

const toIsoDateTimeString = (value, fallbackValue) => {
  const raw = value ?? fallbackValue;
  if (!raw) return new Date().toISOString();

  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00`).toISOString();
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const fallback = new Date(fallbackValue || Date.now());
  return !Number.isNaN(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
};

const toCustomGeoPayload = (value) => {
  if (!value) return null;

  const name = pickFirstText(value?.name, value?.Name);
  const latitude = toFiniteNumber(value?.latitude ?? value?.Latitude);
  const longitude = toFiniteNumber(value?.longitude ?? value?.Longitude);

  if (!name || latitude == null || longitude == null) return null;

  return {
    name,
    latitude,
    longitude,
    address: pickFirstText(value?.address, value?.Address) || null,
  };
};

const updateDayEstimatedCost = (day, timelineKey, currencyCode) => {
  if (!day || !timelineKey) return;
  const timeline = Array.isArray(day[timelineKey]) ? day[timelineKey] : [];
  const dayCostBreakdown = getTimelineCostBreakdown(timeline);
  const estimatedAmount = dayCostBreakdown.meal + dayCostBreakdown.other;
  const money = { amount: Math.round(estimatedAmount), currency: currencyCode || 'VND' };

  if ('estimatedCost' in day || 'EstimatedCost' in day) {
    if ('estimatedCost' in day) day.estimatedCost = money;
    if ('EstimatedCost' in day) day.EstimatedCost = money;
  }
  if ('estimatedDayCost' in day || 'EstimatedDayCost' in day) {
    if ('estimatedDayCost' in day) day.estimatedDayCost = money;
    if ('EstimatedDayCost' in day) day.EstimatedDayCost = money;
  }
};

const updateBudgetSummaryFromDays = (draftItinerary) => {
  if (!draftItinerary) return;

  const daysKey = Array.isArray(draftItinerary?.days) ? 'days' : 'Days';
  const summaryKey = draftItinerary?.budgetSummary ? 'budgetSummary' : 'BudgetSummary';
  const days = Array.isArray(draftItinerary?.[daysKey]) ? draftItinerary[daysKey] : [];
  const summary = draftItinerary?.[summaryKey];
  if (!summary) return;

  const currencyCode = pickFirstText(draftItinerary?.currencyCode, draftItinerary?.CurrencyCode) || 'VND';
  const totalBreakdown = days.reduce((acc, day) => {
    const timeline = day?.timeline || day?.Timeline || [];
    const dayBreakdown = getTimelineCostBreakdown(timeline);
    acc.meal += dayBreakdown.meal;
    acc.other += dayBreakdown.other;
    return acc;
  }, { meal: 0, other: 0 });

  const estimatedTotal = totalBreakdown.meal + totalBreakdown.other;

  const estimatedMoney = { amount: Math.round(estimatedTotal), currency: currencyCode };
  const mealMoney = { amount: Math.round(totalBreakdown.meal), currency: currencyCode };
  const otherMoney = { amount: Math.round(totalBreakdown.other), currency: currencyCode };
  const usable = normalizeMoney(summary?.usableBudget || summary?.UsableBudget, currencyCode);
  const remainingMoney = usable
    ? { amount: Math.round(usable.amount - estimatedMoney.amount), currency: usable.currency || currencyCode }
    : null;

  if ('estimatedTotalCost' in summary) summary.estimatedTotalCost = estimatedMoney;
  if ('EstimatedTotalCost' in summary) summary.EstimatedTotalCost = estimatedMoney;
  summary.mealCost = mealMoney;
  summary.MealCost = mealMoney;
  summary.otherCost = otherMoney;
  summary.OtherCost = otherMoney;
  if (remainingMoney) {
    if ('remainingBudget' in summary) summary.remainingBudget = remainingMoney;
    if ('RemainingBudget' in summary) summary.RemainingBudget = remainingMoney;
  }
};

const findNextPrimaryLocationIndex = (timeline, fromIndex) => {
  for (let index = fromIndex + 1; index < timeline.length; index += 1) {
    if (isEditableLocationEvent(timeline[index])) return index;
  }
  return -1;
};

const findPreviousPrimaryLocationIndex = (timeline, fromIndex) => {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    if (isEditableLocationEvent(timeline[index])) return index;
  }
  return -1;
};

const ItineraryResultPage = () => {
  const navigate = useNavigate();
  const { itinerary, clearItinerary, updateItinerary } = useTripPlanner();
  const [savingTrip, setSavingTrip] = useState(false);
  const [provinceNameById, setProvinceNameById] = useState(new Map());
  const [showAlternativeItems, setShowAlternativeItems] = useState(true);
  const [showTransportOptionItems, setShowTransportOptionItems] = useState(true);
  const [recalculatingDayNumber, setRecalculatingDayNumber] = useState(null);
  const [addBetweenModal, setAddBetweenModal] = useState({
    open: false,
    dayIndex: null,
    insertAfterIndex: null,
    provinceId: null,
  });
  const [provinceLocationOptions, setProvinceLocationOptions] = useState([]);
  const [provinceLocationLoading, setProvinceLocationLoading] = useState(false);
  const [selectedProvinceLocationId, setSelectedProvinceLocationId] = useState(null);
  const [provinceLocationSearch, setProvinceLocationSearch] = useState('');

  const [locationModal, setLocationModal] = useState({ open: false, locationId: null });
  const [transportModal, setTransportModal] = useState({ open: false, data: null });
  const [accommodationModal, setAccommodationModal] = useState({ open: false, data: null });
  const {
    nameMap: locationNameById,
    mediaMap: locationMediaById,
    telephoneMap: locationTelephoneById,
    amenitiesMap: locationAmenitiesById,
  } = useMemo(() => buildLocationMetadataFromItinerary(itinerary), [itinerary]);

  useEffect(() => {
    let mounted = true;

    const loadProvinceNames = async () => {
      try {
        const data = await getProvincesApi();
        const provinces = Array.isArray(data) ? data : data?.items || data?.Items || [];
        const map = new Map();

        provinces.forEach((province) => {
          const id = Number(province.id || province.Id);
          if (!Number.isFinite(id)) return;
          const name = getEnglishPreferredName(province);
          if (!name) return;
          map.set(id, name);
        });

        if (mounted) {
          setProvinceNameById(map);
        }
      } catch {
      }
    };

    loadProvinceNames();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewLocation = useCallback((locationId) => {
    setLocationModal({ open: true, locationId });
  }, []);

  const handleViewAccommodation = useCallback((data) => {
    setAccommodationModal({ open: true, data });
  }, []);

  const recalculateDayTimeline = useCallback(async (draftItinerary, dayIndex, options = {}) => {
    const preserveExternalSegments = Boolean(options?.preserveExternalSegments);
    const daysKey = Array.isArray(draftItinerary?.days) ? 'days' : 'Days';
    const days = Array.isArray(draftItinerary?.[daysKey]) ? draftItinerary[daysKey] : [];
    const day = days[dayIndex];
    if (!day) return draftItinerary;

    const timelineKey = Array.isArray(day?.timeline) ? 'timeline' : 'Timeline';
    const sourceTimeline = Array.isArray(day?.[timelineKey]) ? [...day[timelineKey]] : [];
    const locationIndexes = sourceTimeline
      .map((item, index) => (isEditableLocationEvent(item) ? index : -1))
      .filter((index) => index >= 0);

    if (locationIndexes.length === 0) {
      day[timelineKey] = preserveExternalSegments
        ? sourceTimeline
        : sourceTimeline.filter((item) => !isTravelEvent(item));
      return draftItinerary;
    }

    if (locationIndexes.length === 1) {
      day[timelineKey] = preserveExternalSegments
        ? sourceTimeline
        : sourceTimeline.filter((item) => !isTravelEvent(item));
      return draftItinerary;
    }

    const currencyCode = pickFirstText(draftItinerary?.currencyCode, draftItinerary?.CurrencyCode) || 'VND';
    const groupSizeValue = Number(draftItinerary?.groupSize ?? draftItinerary?.GroupSize);
    const groupSize = Number.isFinite(groupSizeValue) && groupSizeValue > 0
      ? Math.round(groupSizeValue)
      : 1;

    const locationStops = locationIndexes.map((index) => ({ ...sourceTimeline[index] }));
    const stopDurations = locationStops.map(getTimelineDurationMinutes);
    const rebuiltSegment = [];

    const firstStart = pickFirstText(locationStops[0]?.startTime, locationStops[0]?.StartTime) || '08:00:00';
    const firstEnd = addMinutesToTime(firstStart, stopDurations[0]);
    const firstStop = {
      ...locationStops[0],
      startTime: firstStart,
      endTime: firstEnd,
    };
    rebuiltSegment.push(firstStop);

    let prevStop = firstStop;

    for (let index = 1; index < locationStops.length; index += 1) {
      const currentStop = locationStops[index];
      const departureTime = pickFirstText(prevStop.endTime, prevStop.EndTime) || firstEnd;
      const fromLocationId = getItemLocationId(prevStop);
      const toLocationId = getItemLocationId(currentStop);

      let travelLeg = null;
      if (Number.isFinite(fromLocationId) && fromLocationId > 0
        && Number.isFinite(toLocationId) && toLocationId > 0) {
        travelLeg = await estimateLocalTravelApi({
          fromLocationId,
          toLocationId,
          groupSize,
          departureTime,
          currencyCode,
        });
      }

      const estimatedTravelMinutes = Number(
        travelLeg?.selectedTravelTimeMinutes
        ?? travelLeg?.SelectedTravelTimeMinutes
        ?? 20,
      );
      const safeTravelMinutes = Number.isFinite(estimatedTravelMinutes) && estimatedTravelMinutes > 0
        ? estimatedTravelMinutes
        : 20;
      const arrivalTime = pickFirstText(
        travelLeg?.arrivalTime,
        travelLeg?.ArrivalTime,
      ) || addMinutesToTime(departureTime, safeTravelMinutes);

      const fromName = pickFirstText(
        travelLeg?.fromLocationName,
        travelLeg?.FromLocationName,
        prevStop?.locationName,
        prevStop?.LocationName,
        prevStop?.title,
        prevStop?.Title,
      ) || `Location #${fromLocationId}`;
      const toName = pickFirstText(
        travelLeg?.toLocationName,
        travelLeg?.ToLocationName,
        currentStop?.locationName,
        currentStop?.LocationName,
        currentStop?.title,
        currentStop?.Title,
      ) || `Location #${toLocationId}`;

      rebuiltSegment.push({
        eventType: 'travel',
        title: `Move from ${fromName} to ${toName}`,
        startTime: departureTime,
        endTime: arrivalTime,
        locationId: 0,
        tagNames: [],
        note: 'Updated by local-travel-estimate',
        score: 0,
        locationToLocationTravel: travelLeg,
        costForGroup: travelLeg?.selectedTotalCost || travelLeg?.SelectedTotalCost || null,
      });

      const currentDuration = stopDurations[index];
      const currentEnd = addMinutesToTime(arrivalTime, currentDuration);
      const normalizedCurrentStop = {
        ...currentStop,
        startTime: arrivalTime,
        endTime: currentEnd,
      };

      rebuiltSegment.push(normalizedCurrentStop);
      prevStop = normalizedCurrentStop;
    }

    const firstLocationIndex = locationIndexes[0];
    const lastLocationIndex = locationIndexes[locationIndexes.length - 1];
    const beforeSegment = preserveExternalSegments
      ? sourceTimeline.slice(0, firstLocationIndex)
      : sourceTimeline.slice(0, firstLocationIndex).filter((item) => !isTravelEvent(item));
    const afterSegment = preserveExternalSegments
      ? sourceTimeline.slice(lastLocationIndex + 1)
      : sourceTimeline.slice(lastLocationIndex + 1).filter((item) => !isTravelEvent(item));

    day[timelineKey] = [...beforeSegment, ...rebuiltSegment, ...afterSegment];
    updateDayEstimatedCost(day, timelineKey, currencyCode);
    updateBudgetSummaryFromDays(draftItinerary);
    return draftItinerary;
  }, []);

  const loadProvinceLocations = useCallback(async (provinceId, dayIndex, searchTerm = '') => {
    if (!itinerary) return;

    setProvinceLocationLoading(true);
    try {
      const draftDays = itinerary.days || itinerary.Days || [];
      const day = draftDays[dayIndex];
      const dayTimeline = day ? (day.timeline || day.Timeline || []) : [];
      const usedLocationIds = new Set(
        dayTimeline
          .filter((item) => isEditableLocationEvent(item))
          .map((item) => getItemLocationId(item))
      );

      const response = await getLocationsByProvinceApi({
        provinceId,
        countryId: 'VN',
        searchTerm: searchTerm || undefined,
        pageSize: 300,
      });

      const items = Array.isArray(response?.items) ? response.items : [];
      const options = items
        .map((location) => {
          const id = Number(location?.id ?? location?.Id);
          if (!Number.isFinite(id) || id <= 0 || usedLocationIds.has(id)) return null;
          const name = pickFirstText(location?.englishName, location?.EnglishName, location?.name, location?.Name) || `Location #${id}`;
          return {
            id,
            name,
            address: pickFirstText(location?.address, location?.Address),
            score: location?.score ?? location?.Score ?? null,
            tagNames: location?.tagNames || location?.TagNames || [],
            telephone: pickFirstText(location?.telephone, location?.Telephone),
            mediaUrls: location?.mediaLinks || location?.MediaLinks || [],
          };
        })
        .filter(Boolean);

      setProvinceLocationOptions(options);
    } catch {
      setProvinceLocationOptions([]);
      message.error('Unable to load locations in this province.');
    } finally {
      setProvinceLocationLoading(false);
    }
  }, [itinerary]);

  const handleReplaceAlternative = useCallback(async (dayIndex, timelineIndex, alternative, sourceEventType) => {
    if (!itinerary) return;

    const days = itinerary.days || itinerary.Days || [];
    const dayNumber = days[dayIndex]?.dayNumber || days[dayIndex]?.DayNumber || dayIndex + 1;
    setRecalculatingDayNumber(dayNumber);

    try {
      const draft = clonePlainObject(itinerary);
      const daysKey = Array.isArray(draft?.days) ? 'days' : 'Days';
      const draftDays = Array.isArray(draft?.[daysKey]) ? draft[daysKey] : [];
      const day = draftDays[dayIndex];
      if (!day) return;

      const timelineKey = Array.isArray(day?.timeline) ? 'timeline' : 'Timeline';
      const timeline = Array.isArray(day?.[timelineKey]) ? [...day[timelineKey]] : [];
      const anchorItem = timeline[timelineIndex] || {};
      const anchorLocationId = Number(anchorItem?.locationId ?? anchorItem?.LocationId);
      const altLocationId = Number(alternative?.locationId ?? alternative?.LocationId);

      if (!Number.isFinite(altLocationId) || altLocationId <= 0) {
        message.warning('Alternative location is not valid for replacement.');
        return;
      }

      const altName = pickFirstText(
        alternative?.locationName,
        alternative?.LocationName,
        alternative?.name,
        alternative?.Name,
        locationNameById.get(altLocationId),
      ) || `Location #${altLocationId}`;

      const anchorTitle = pickFirstText(anchorItem?.title, anchorItem?.Title)
        .replace(/^(visit|meal at)\s+/i, '')
        .trim();

      const anchorName = pickFirstText(
        anchorItem?.locationName,
        anchorItem?.LocationName,
        anchorItem?.name,
        anchorItem?.Name,
        anchorTitle,
        Number.isFinite(anchorLocationId) ? locationNameById.get(anchorLocationId) : '',
      ) || (Number.isFinite(anchorLocationId) ? `Location #${anchorLocationId}` : 'Current location');

      const anchorMediaUrls = extractMediaUrls(anchorItem);
      const currentAlternatives = anchorItem?.alternatives || anchorItem?.Alternatives || [];
      const swappedAlternatives = currentAlternatives.filter((item) => {
        const id = Number(item?.locationId ?? item?.LocationId);
        if (!Number.isFinite(id)) return true;
        if (id === altLocationId) return false;
        if (Number.isFinite(anchorLocationId) && id === anchorLocationId) return false;
        return true;
      });

      if (Number.isFinite(anchorLocationId) && anchorLocationId > 0 && anchorLocationId !== altLocationId) {
        swappedAlternatives.unshift({
          locationId: anchorLocationId,
          locationName: anchorName,
          LocationName: anchorName,
          name: anchorName,
          Name: anchorName,
          tagNames: anchorItem?.tagNames || anchorItem?.TagNames || [],
          ticketCost: anchorItem?.ticketCost || anchorItem?.TicketCost || null,
          extraCostPerPerson: anchorItem?.extraCostPerPerson || anchorItem?.ExtraCostPerPerson || null,
          score: anchorItem?.score ?? anchorItem?.Score ?? 0,
          address: anchorItem?.address || anchorItem?.Address || null,
          telephone: pickFirstText(
            anchorItem?.telephone,
            anchorItem?.Telephone,
            locationTelephoneById.get(anchorLocationId),
          ) || null,
          mediaUrls: anchorMediaUrls.length > 0
            ? anchorMediaUrls
            : (locationMediaById.get(anchorLocationId) || []),
        });
      }

      const replacedItem = {
        ...anchorItem,
        eventType: sourceEventType || anchorItem?.eventType || anchorItem?.EventType || 'visit',
        title: sourceEventType === 'meal' ? `Meal at ${altName}` : `Visit ${altName}`,
        locationName: altName,
        LocationName: altName,
        name: altName,
        Name: altName,
        locationId: altLocationId,
        tagNames: alternative?.tagNames || alternative?.TagNames || [],
        ticketCost: alternative?.ticketCost || alternative?.TicketCost || null,
        extraCostPerPerson: alternative?.extraCostPerPerson || alternative?.ExtraCostPerPerson || null,
        costForGroup: anchorItem?.costForGroup || anchorItem?.CostForGroup || null,
        note: 'Replaced by selected alternative',
        score: alternative?.score ?? alternative?.Score ?? 0,
        address: alternative?.address || alternative?.Address || null,
        telephone: alternative?.telephone || alternative?.Telephone || null,
        mediaUrls: alternative?.mediaUrls || alternative?.MediaUrls || [],
        alternatives: swappedAlternatives,
      };

      timeline[timelineIndex] = replacedItem;
      day[timelineKey] = timeline;

      await recalculateDayTimeline(draft, dayIndex);
      updateItinerary(draft);
      message.success('Swapped main location with selected alternative.');
    } catch {
      message.error('Unable to replace location and recalculate timeline.');
    } finally {
      setRecalculatingDayNumber(null);
    }
  }, [itinerary, locationMediaById, locationNameById, locationTelephoneById, recalculateDayTimeline, updateItinerary]);

  const handleOpenAddBetweenPicker = useCallback(async (dayIndex, insertAfterIndex, provinceId) => {
    const normalizedProvinceId = Number(provinceId);
    if (!Number.isFinite(normalizedProvinceId) || normalizedProvinceId <= 0) {
      message.warning('Province is missing, cannot load locations for this day.');
      return;
    }

    const dayNum = (itinerary?.days || itinerary?.Days || [])[dayIndex]?.dayNumber
      || (itinerary?.days || itinerary?.Days || [])[dayIndex]?.DayNumber
      || dayIndex + 1;

    setSelectedProvinceLocationId(null);
    setProvinceLocationSearch('');
    setAddBetweenModal({ open: true, dayIndex, insertAfterIndex, provinceId: normalizedProvinceId });
    setRecalculatingDayNumber(dayNum);
    await loadProvinceLocations(normalizedProvinceId, dayIndex, '');
    setRecalculatingDayNumber(null);
  }, [itinerary, loadProvinceLocations]);

  const handleSearchProvinceLocations = useCallback(async (searchTerm) => {
    if (!addBetweenModal?.open || !Number.isFinite(Number(addBetweenModal?.provinceId))) return;
    setProvinceLocationSearch(searchTerm);
    await loadProvinceLocations(addBetweenModal.provinceId, addBetweenModal.dayIndex, searchTerm);
  }, [addBetweenModal, loadProvinceLocations]);

  const handleConfirmAddBetween = useCallback(async () => {
    if (!itinerary) return;

    const dayIndex = addBetweenModal?.dayIndex;
    const insertAfterIndex = addBetweenModal?.insertAfterIndex;
    const locationId = Number(selectedProvinceLocationId);

    if (!Number.isFinite(dayIndex) || !Number.isFinite(insertAfterIndex)) return;
    if (!Number.isFinite(locationId) || locationId <= 0) {
      message.warning('Please select a location to add.');
      return;
    }

    const picked = provinceLocationOptions.find((item) => item.id === locationId);
    if (!picked) {
      message.warning('Selected location is not available anymore.');
      return;
    }

    const days = itinerary.days || itinerary.Days || [];
    const dayNumber = days[dayIndex]?.dayNumber || days[dayIndex]?.DayNumber || dayIndex + 1;
    setRecalculatingDayNumber(dayNumber);

    try {
      const draft = clonePlainObject(itinerary);
      const daysKey = Array.isArray(draft?.days) ? 'days' : 'Days';
      const draftDays = Array.isArray(draft?.[daysKey]) ? draft[daysKey] : [];
      const day = draftDays[dayIndex];
      if (!day) return;

      const timelineKey = Array.isArray(day?.timeline) ? 'timeline' : 'Timeline';
      const timeline = Array.isArray(day?.[timelineKey]) ? [...day[timelineKey]] : [];
      const anchorItem = timeline[insertAfterIndex] || {};
      const startTime = pickFirstText(anchorItem?.endTime, anchorItem?.EndTime, '08:00:00');

      const insertedItem = {
        eventType: 'visit',
        title: `Visit ${picked.name}`,
        locationName: picked.name,
        startTime,
        endTime: addMinutesToTime(startTime, getTimelineDurationMinutes(anchorItem)),
        locationId: picked.id,
        tagNames: picked.tagNames || [],
        ticketCost: null,
        extraCostPerPerson: null,
        costForGroup: null,
        note: 'Inserted after selected location',
        score: picked.score ?? 0,
        address: picked.address || null,
        telephone: picked.telephone || null,
        mediaUrls: picked.mediaUrls || [],
        alternatives: [],
      };

      timeline.splice(Math.min(timeline.length, insertAfterIndex + 1), 0, insertedItem);
      day[timelineKey] = timeline;

      await recalculateDayTimeline(draft, dayIndex);
      updateItinerary(draft);
      message.success('Location added and timeline recalculated.');

      setAddBetweenModal({ open: false, dayIndex: null, insertAfterIndex: null, provinceId: null });
      setProvinceLocationOptions([]);
      setSelectedProvinceLocationId(null);
      setProvinceLocationSearch('');
    } catch {
      message.error('Unable to add location.');
    } finally {
      setRecalculatingDayNumber(null);
    }
  }, [
    itinerary,
    addBetweenModal,
    selectedProvinceLocationId,
    provinceLocationOptions,
    recalculateDayTimeline,
    updateItinerary,
  ]);

  const handleCloseAddBetweenModal = useCallback(() => {
    setAddBetweenModal({ open: false, dayIndex: null, insertAfterIndex: null, provinceId: null });
    setProvinceLocationOptions([]);
    setSelectedProvinceLocationId(null);
    setProvinceLocationSearch('');
  }, []);

  const handleSelectTransportOption = useCallback((dayIndex, timelineIndex, optionIndex) => {
    if (!itinerary) return;

    const days = itinerary.days || itinerary.Days || [];
    const dayNumber = days[dayIndex]?.dayNumber || days[dayIndex]?.DayNumber || dayIndex + 1;
    setRecalculatingDayNumber(dayNumber);

    try {
      const draft = clonePlainObject(itinerary);
      const daysKey = Array.isArray(draft?.days) ? 'days' : 'Days';
      const draftDays = Array.isArray(draft?.[daysKey]) ? draft[daysKey] : [];
      const day = draftDays[dayIndex];
      if (!day) return;

      const timelineKey = Array.isArray(day?.timeline) ? 'timeline' : 'Timeline';
      const timeline = Array.isArray(day?.[timelineKey]) ? [...day[timelineKey]] : [];
      const travelItem = timeline[timelineIndex];
      if (!travelItem || !isTravelEvent(travelItem)) {
        message.warning('Only travel segments can change transport option.');
        return;
      }

      const [travelDetailKey, travelDetail] = getTravelDetailEntry(travelItem);
      if (!travelDetailKey || !travelDetail) {
        message.warning('Travel detail is missing on this segment.');
        return;
      }

      const options = getTransportOptions(travelDetail);
      const selectedOption = options[optionIndex];
      if (!selectedOption) {
        message.warning('Selected transport option is not available.');
        return;
      }

      const startTime = pickFirstText(travelItem?.startTime, travelItem?.StartTime);
      const currentEndTime = pickFirstText(travelItem?.endTime, travelItem?.EndTime);
      const currentMinutesFromClock = (() => {
        const start = toMinutesOfDay(startTime);
        const end = toMinutesOfDay(currentEndTime);
        if (start == null || end == null) return null;
        return end >= start ? end - start : (end + 1440) - start;
      })();

      const selectedMinutesRaw = toFiniteNumber(
        selectedOption?.estimatedTravelMinutes ?? selectedOption?.EstimatedTravelMinutes,
      );
      const selectedMinutes = selectedMinutesRaw != null && selectedMinutesRaw > 0
        ? Math.round(selectedMinutesRaw)
        : (getTravelDurationMinutes(travelDetail) || getTimelineDurationMinutes(travelItem));
      const currentMinutes = currentMinutesFromClock != null
        ? currentMinutesFromClock
        : (getTravelDurationMinutes(travelDetail) || selectedMinutes);

      const newEndTime = addMinutesToTime(startTime, selectedMinutes);
      const deltaMinutes = selectedMinutes - currentMinutes;

      const selectedMethod = pickFirstText(
        selectedOption?.method,
        selectedOption?.Method,
        travelDetail?.selectedMethod,
        travelDetail?.SelectedMethod,
      ) || 'Transport';
      const selectedCost = pickBestMoney(
        selectedOption?.costForGroup,
        selectedOption?.CostForGroup,
        selectedOption?.estimatedTotalCost,
        selectedOption?.EstimatedTotalCost,
        travelDetail?.selectedTotalCost,
        travelDetail?.SelectedTotalCost,
      );

      const normalizedOptions = options.map((option, idx) => ({
        ...option,
        recommended: idx === optionIndex,
        Recommended: idx === optionIndex,
      }));

      const updatedTravelDetail = {
        ...travelDetail,
        selectedMethod: selectedMethod,
        SelectedMethod: selectedMethod,
        selectedTravelTimeMinutes: selectedMinutes,
        SelectedTravelTimeMinutes: selectedMinutes,
        selectedTotalCost: selectedCost,
        SelectedTotalCost: selectedCost,
        departureTime: pickFirstText(travelDetail?.departureTime, travelDetail?.DepartureTime, startTime),
        DepartureTime: pickFirstText(travelDetail?.departureTime, travelDetail?.DepartureTime, startTime),
        arrivalTime: newEndTime,
        ArrivalTime: newEndTime,
      };

      if ('transportOptions' in travelDetail) {
        updatedTravelDetail.transportOptions = normalizedOptions;
      }
      if ('TransportOptions' in travelDetail) {
        updatedTravelDetail.TransportOptions = normalizedOptions;
      }
      if (!('transportOptions' in travelDetail) && !('TransportOptions' in travelDetail)) {
        updatedTravelDetail.transportOptions = normalizedOptions;
      }

      const updatedTravelItem = {
        ...travelItem,
        endTime: newEndTime,
        EndTime: newEndTime,
        costForGroup: selectedCost,
        CostForGroup: selectedCost,
      };
      updatedTravelItem[travelDetailKey] = updatedTravelDetail;
      timeline[timelineIndex] = updatedTravelItem;

      if (deltaMinutes !== 0) {
        for (let index = timelineIndex + 1; index < timeline.length; index += 1) {
          const next = { ...timeline[index] };
          const itemStart = pickFirstText(next?.startTime, next?.StartTime);
          const itemEnd = pickFirstText(next?.endTime, next?.EndTime);

          if (itemStart) {
            const shiftedStart = shiftTimeByMinutes(itemStart, deltaMinutes);
            next.startTime = shiftedStart;
            next.StartTime = shiftedStart;
          }
          if (itemEnd) {
            const shiftedEnd = shiftTimeByMinutes(itemEnd, deltaMinutes);
            next.endTime = shiftedEnd;
            next.EndTime = shiftedEnd;
          }

          const [nextTravelKey, nextTravelDetail] = getTravelDetailEntry(next);
          if (nextTravelKey && nextTravelDetail) {
            const td = { ...nextTravelDetail };
            const tdDeparture = pickFirstText(td?.departureTime, td?.DepartureTime);
            const tdArrival = pickFirstText(td?.arrivalTime, td?.ArrivalTime);
            if (tdDeparture) {
              const shiftedDeparture = shiftTimeByMinutes(tdDeparture, deltaMinutes);
              td.departureTime = shiftedDeparture;
              td.DepartureTime = shiftedDeparture;
            }
            if (tdArrival) {
              const shiftedArrival = shiftTimeByMinutes(tdArrival, deltaMinutes);
              td.arrivalTime = shiftedArrival;
              td.ArrivalTime = shiftedArrival;
            }
            next[nextTravelKey] = td;
          }

          timeline[index] = next;
        }
      }

      day[timelineKey] = timeline;

      const currencyCode = pickFirstText(draft?.currencyCode, draft?.CurrencyCode) || 'VND';
      updateDayEstimatedCost(day, timelineKey, currencyCode);
      updateBudgetSummaryFromDays(draft);
      updateItinerary(draft);
      message.success('Main transport option updated.');
    } catch {
      message.error('Unable to update transport option.');
    } finally {
      setRecalculatingDayNumber(null);
    }
  }, [itinerary, updateItinerary]);

  const handleRemoveLocation = useCallback(async (dayIndex, timelineIndex) => {
    if (!itinerary) return;

    const days = itinerary.days || itinerary.Days || [];
    const dayNumber = days[dayIndex]?.dayNumber || days[dayIndex]?.DayNumber || dayIndex + 1;
    setRecalculatingDayNumber(dayNumber);

    try {
      const draft = clonePlainObject(itinerary);
      const daysKey = Array.isArray(draft?.days) ? 'days' : 'Days';
      const draftDays = Array.isArray(draft?.[daysKey]) ? draft[daysKey] : [];
      const day = draftDays[dayIndex];
      if (!day) return;

      const timelineKey = Array.isArray(day?.timeline) ? 'timeline' : 'Timeline';
      const timeline = Array.isArray(day?.[timelineKey]) ? [...day[timelineKey]] : [];
      const item = timeline[timelineIndex];

      if (!item || !isEditableLocationEvent(item)) {
        message.warning('Only location events can be removed.');
        return;
      }

      const prevLocationIndex = findPreviousPrimaryLocationIndex(timeline, timelineIndex);
      const nextLocationIndex = findNextPrimaryLocationIndex(timeline, timelineIndex);
      const prevLocation = prevLocationIndex >= 0 ? timeline[prevLocationIndex] : null;
      const nextLocation = nextLocationIndex >= 0 ? timeline[nextLocationIndex] : null;

      let leftTravelIndex = -1;
      if (prevLocationIndex >= 0) {
        for (let index = timelineIndex - 1; index > prevLocationIndex; index -= 1) {
          if (isTravelEvent(timeline[index])) {
            leftTravelIndex = index;
            break;
          }
        }
      }

      let rightTravelIndex = -1;
      if (nextLocationIndex >= 0) {
        for (let index = timelineIndex + 1; index < nextLocationIndex; index += 1) {
          if (isTravelEvent(timeline[index])) {
            rightTravelIndex = index;
            break;
          }
        }
      }

      let mergedTravelItem = null;
      const prevLocationId = getItemLocationId(prevLocation);
      const nextLocationId = getItemLocationId(nextLocation);
      const canConnectPreviousAndNext = Number.isFinite(prevLocationId) && prevLocationId > 0
        && Number.isFinite(nextLocationId) && nextLocationId > 0;

      if (canConnectPreviousAndNext) {
        const leftTravel = leftTravelIndex >= 0 ? timeline[leftTravelIndex] : null;
        const rightTravel = rightTravelIndex >= 0 ? timeline[rightTravelIndex] : null;
        const departureTime = pickFirstText(
          leftTravel?.startTime,
          leftTravel?.StartTime,
          prevLocation?.endTime,
          prevLocation?.EndTime,
          '08:00:00',
        );
        const arrivalTime = pickFirstText(
          rightTravel?.endTime,
          rightTravel?.EndTime,
          nextLocation?.startTime,
          nextLocation?.StartTime,
          addMinutesToTime(departureTime, 20),
        );

        const currencyCode = pickFirstText(draft?.currencyCode, draft?.CurrencyCode) || 'VND';
        const groupSizeValue = Number(draft?.groupSize ?? draft?.GroupSize);
        const groupSize = Number.isFinite(groupSizeValue) && groupSizeValue > 0
          ? Math.round(groupSizeValue)
          : 1;

        let travelLeg = null;
        try {
          travelLeg = await estimateLocalTravelApi({
            fromLocationId: prevLocationId,
            toLocationId: nextLocationId,
            groupSize,
            departureTime,
            currencyCode,
          });
        } catch {
          travelLeg = null;
        }

        const fromName = pickFirstText(
          travelLeg?.fromLocationName,
          travelLeg?.FromLocationName,
          prevLocation?.locationName,
          prevLocation?.LocationName,
          prevLocation?.title,
          prevLocation?.Title,
        ) || `Location #${prevLocationId}`;
        const toName = pickFirstText(
          travelLeg?.toLocationName,
          travelLeg?.ToLocationName,
          nextLocation?.locationName,
          nextLocation?.LocationName,
          nextLocation?.title,
          nextLocation?.Title,
        ) || `Location #${nextLocationId}`;

        mergedTravelItem = {
          eventType: 'travel',
          title: `Move from ${fromName} to ${toName}`,
          startTime: departureTime,
          endTime: arrivalTime,
          locationId: 0,
          tagNames: [],
          note: 'Updated after removing location',
          score: 0,
          locationToLocationTravel: travelLeg
            ? {
              ...travelLeg,
              departureTime,
              DepartureTime: departureTime,
              arrivalTime,
              ArrivalTime: arrivalTime,
            }
            : null,
          costForGroup: travelLeg?.selectedTotalCost || travelLeg?.SelectedTotalCost || null,
        };
      }

      const indexesToRemove = new Set([timelineIndex]);
      if (leftTravelIndex >= 0) indexesToRemove.add(leftTravelIndex);
      if (rightTravelIndex >= 0) indexesToRemove.add(rightTravelIndex);

      const rawInsertAt = leftTravelIndex >= 0 ? leftTravelIndex : timelineIndex;
      const insertAt = timeline
        .slice(0, rawInsertAt)
        .filter((_, index) => !indexesToRemove.has(index))
        .length;

      const nextTimeline = timeline.filter((_, index) => !indexesToRemove.has(index));
      if (mergedTravelItem) {
        nextTimeline.splice(Math.max(0, Math.min(insertAt, nextTimeline.length)), 0, mergedTravelItem);
      }

      day[timelineKey] = nextTimeline;

      const currencyCode = pickFirstText(draft?.currencyCode, draft?.CurrencyCode) || 'VND';
      updateDayEstimatedCost(day, timelineKey, currencyCode);
      updateBudgetSummaryFromDays(draft);
      updateItinerary(draft);
      message.success('Location removed and adjacent locations were reconnected.');
    } catch {
      message.error('Unable to remove location and reconnect adjacent points.');
    } finally {
      setRecalculatingDayNumber(null);
    }
  }, [itinerary, updateItinerary]);

  const handleRegenerate = () => {
    clearItinerary();
    navigate('/create-trip');
  };

  const planColumnClass = locationModal.open
    ? `${styles.planColumn} ${styles.planColumnWithLocation}`
    : accommodationModal.open
    ? `${styles.planColumn} ${styles.planColumnWithAccommodation}`
    : transportModal.open
    ? `${styles.planColumn} ${styles.planColumnWithTransport}`
    : styles.planColumn;

  if (!itinerary) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#FF6B6B', colorTextBase: '#1A535C', colorInfo: '#4ECDC4', colorSuccess: '#4ECDC4', colorWarning: '#FFE66D', colorError: '#FF6B6B', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}>
        <div className={styles.itineraryPage}>
          <div className={planColumnClass}>
            <div className={styles.container}>
              <div className={styles.emptyState}>
                <Empty description="No itinerary has been generated yet" />
                <Button type="primary" onClick={() => navigate('/create-trip')} style={{ marginTop: 16 }}>
                  Create New Itinerary
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  const days = itinerary.days || itinerary.Days || [];
  const budgetSummary = itinerary.budgetSummary || itinerary.BudgetSummary;
  const startDate = itinerary.startDate || itinerary.StartDate;
  const endDate = itinerary.endDate || itinerary.EndDate;
  const groupSize = itinerary.groupSize || itinerary.GroupSize;
  const budgetLevel = itinerary.budgetLevel || itinerary.BudgetLevel;
  const tripCurrencyCode = pickFirstText(itinerary.currencyCode, itinerary.CurrencyCode) || 'VND';

  const timelineCostBreakdown = useMemo(() => days.reduce((acc, day) => {
    const timeline = day.timeline || day.Timeline || [];
    const dayBreakdown = getTimelineCostBreakdown(timeline);
    acc.meal += dayBreakdown.meal;
    acc.other += dayBreakdown.other;
    return acc;
  }, { meal: 0, other: 0 }), [days]);

  const timelineDetailedCostBreakdown = useMemo(() => days.reduce((acc, day) => {
    const timeline = day.timeline || day.Timeline || [];
    const dayBreakdown = getTimelineDetailedCostBreakdown(timeline);
    acc.meal += dayBreakdown.meal;
    acc.transport += dayBreakdown.transport;
    acc.activity += dayBreakdown.activity;
    return acc;
  }, { meal: 0, transport: 0, activity: 0 }), [days]);

  const accommodationCostFallback = useMemo(() => days.reduce((sum, day) => {
    const accommodations = day.accommodationRecommendations || day.AccommodationRecommendations || [];
    const safeList = Array.isArray(accommodations) ? accommodations : [];
    const selected = safeList[0];
    if (!selected) return sum;

    const estimated = normalizeMoney(
      selected.pricePerNight
      || selected.PricePerNight
      || selected.estimatedCost
      || selected.EstimatedCost,
      tripCurrencyCode,
    );
    return sum + (estimated?.amount || 0);
  }, 0), [days, tripCurrencyCode]);

  const totalBudgetValue = getMoneyAmount(budgetSummary?.totalBudget || budgetSummary?.TotalBudget) || 0;
  const estimatedTotalValue = getMoneyAmount(budgetSummary?.estimatedTotalCost || budgetSummary?.EstimatedTotalCost)
    ?? (timelineCostBreakdown.meal + timelineCostBreakdown.other);
  const mealCostMoney = {
    amount: Math.round(getMoneyAmount(budgetSummary?.mealCost || budgetSummary?.MealCost) ?? timelineCostBreakdown.meal),
    currency: tripCurrencyCode,
  };
  const budgetUsedPercent = totalBudgetValue > 0 ? Math.round((estimatedTotalValue / totalBudgetValue) * 100) : 0;

  const budgetMainItems = budgetSummary
    ? [
      {
        key: 'totalBudget',
        label: 'Total Budget',
        value: formatMoney(budgetSummary.totalBudget || budgetSummary.TotalBudget),
        className: styles.budgetTotalValue,
      },
      {
        key: 'usableBudget',
        label: 'Usable',
        value: formatMoney(budgetSummary.usableBudget || budgetSummary.UsableBudget),
        className: styles.budgetUsableValue,
      },
      {
        key: 'estimatedTotal',
        label: 'Estimated Total',
        value: formatMoney({ amount: Math.round(estimatedTotalValue), currency: tripCurrencyCode }),
        className: styles.budgetEstimatedValue,
      },
      {
        key: 'mealCost',
        label: 'Meal Cost',
        value: formatMoney(mealCostMoney),
        className: styles.budgetMealValue,
      },
      {
        key: 'remainingBudget',
        label: 'Remaining',
        value: formatMoney(budgetSummary.remainingBudget || budgetSummary.RemainingBudget),
        className: styles.budgetRemainingValue,
      },
    ]
    : [];

  const handleSaveTrip = async () => {
    if (!itinerary || savingTrip) return;

    const getNonNegativeAmount = (value, fallback = 0) => {
      const money = normalizeMoney(value, tripCurrencyCode);
      const amount = money?.amount;
      if (Number.isFinite(amount)) return Math.max(0, amount);

      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.max(0, numeric) : Math.max(0, fallback);
    };

    const getTravelDurationFromTimes = (start, end) => {
      const startMinutes = toMinutesOfDay(start);
      const endMinutes = toMinutesOfDay(end);
      if (startMinutes == null || endMinutes == null) return null;
      const diff = endMinutes >= startMinutes ? endMinutes - startMinutes : (endMinutes + 1440) - startMinutes;
      return diff > 0 ? diff : null;
    };

    const toActivityType = (eventType) => {
      const key = String(eventType || '').toLowerCase();
      return ACTIVITY_TYPE_ENUM[key] ?? ACTIVITY_TYPE_ENUM.visit;
    };

    const toTransportPayload = (item) => {
      const eventType = String(item?.eventType || item?.EventType || '').toLowerCase();
      const [, travelDetail] = getTravelDetailEntry(item);
      if (eventType !== 'travel' && !travelDetail) return null;

      const recommended = getRecommendedTransportOption(travelDetail);
      const startTime = normalizeTimeOnly(item?.startTime || item?.StartTime);
      const endTime = normalizeTimeOnly(item?.endTime || item?.EndTime);
      const travelTimeMinutes = Math.max(1, Math.round(
        getTravelDurationMinutes(travelDetail)
        || getTravelDurationFromTimes(startTime, endTime)
        || 1
      ));

      return {
        transportModeId: toPositiveIntOrNull(
          travelDetail?.transportModeId
          ?? travelDetail?.TransportModeId
          ?? travelDetail?.selectedTransportModeId
          ?? travelDetail?.SelectedTransportModeId
          ?? recommended?.transportModeId
          ?? recommended?.TransportModeId
          ?? recommended?.modeId
          ?? recommended?.ModeId
        ),
        distanceKm: Math.max(0, Number(toFiniteNumber(travelDetail?.distanceKm ?? travelDetail?.DistanceKm) || 0)),
        travelTimeMinutes,
        fromLocationId: toPositiveIntOrNull(travelDetail?.fromLocationId ?? travelDetail?.FromLocationId),
        toLocationId: toPositiveIntOrNull(travelDetail?.toLocationId ?? travelDetail?.ToLocationId),
        fromTransitHubId: toPositiveIntOrNull(travelDetail?.fromTransitHubId ?? travelDetail?.FromTransitHubId),
        toTransitHubId: toPositiveIntOrNull(travelDetail?.toTransitHubId ?? travelDetail?.ToTransitHubId),
        customFromTransitHubId: toPositiveIntOrNull(travelDetail?.customFromTransitHubId ?? travelDetail?.CustomFromTransitHubId),
        customToTransitHubId: toPositiveIntOrNull(travelDetail?.customToTransitHubId ?? travelDetail?.CustomToTransitHubId),
        customFromTransitHub: toCustomGeoPayload(travelDetail?.customFromTransitHub || travelDetail?.CustomFromTransitHub),
        customToTransitHub: toCustomGeoPayload(travelDetail?.customToTransitHub || travelDetail?.CustomToTransitHub),
      };
    };

    const normalizedCurrency = String(tripCurrencyCode || 'VND').trim().toUpperCase();
    const safeCurrency = normalizedCurrency.length === 3 ? normalizedCurrency : 'VND';

    const startIso = toIsoDateTimeString(startDate);
    const endIso = toIsoDateTimeString(endDate, startDate);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      message.error('End date must be after start date to save this trip.');
      return;
    }

    const mappedDays = days.map((day, dayIndex) => {
      const dayNumber = Number(day?.dayNumber ?? day?.DayNumber);
      const safeDayNumber = Number.isFinite(dayNumber) && dayNumber > 0 ? Math.round(dayNumber) : dayIndex + 1;
      const dayDate = toIsoDateTimeString(day?.date || day?.Date, startDate);
      const dayTitle = pickFirstText(day?.dayTitle, day?.DayTitle) || `Day ${safeDayNumber}`;
      const weatherSummary = pickFirstText(day?.weatherSummary, day?.WeatherSummary) || null;
      const timeline = day?.timeline || day?.Timeline || [];
      const estimatedCost = getNonNegativeAmount(
        day?.estimatedCost
        || day?.EstimatedCost
        || day?.estimatedDayCost
        || day?.EstimatedDayCost,
        timeline.reduce((sum, item) => sum + getTimelineItemCostAmount(item), 0),
      );

      const activities = (Array.isArray(timeline) ? timeline : []).map((item, itemIndex) => {
        const eventType = String(item?.eventType || item?.EventType || '').toLowerCase();
        const locationId = toPositiveIntOrNull(item?.locationId ?? item?.LocationId);
        const customLocationId = locationId ? null : toPositiveIntOrNull(item?.customLocationId ?? item?.CustomLocationId);
        const customLocation = (!locationId && !customLocationId)
          ? toCustomGeoPayload(item?.customLocation || item?.CustomLocation)
          : null;

        return {
          type: toActivityType(eventType),
          title: pickFirstText(item?.title, item?.Title) || `${EVENT_DEFAULT_TITLES[eventType] || 'Activity'} ${itemIndex + 1}`,
          startTime: normalizeTimeOnly(item?.startTime || item?.StartTime),
          endTime: normalizeTimeOnly(item?.endTime || item?.EndTime),
          locationId,
          customLocationId,
          customLocation,
          transport: toTransportPayload(item),
          budget: {
            estimateCost: Math.round(getNonNegativeAmount(getTimelineItemCostAmount(item), 0)),
          },
        };
      });

      if (!activities.length) {
        activities.push({
          type: ACTIVITY_TYPE_ENUM.visit,
          title: dayTitle,
          startTime: null,
          endTime: null,
          locationId: null,
          customLocationId: null,
          customLocation: null,
          transport: null,
          budget: { estimateCost: 0 },
        });
      }

      return {
        dayNumber: safeDayNumber,
        date: dayDate,
        dayTitle,
        weatherSummary,
        estimatedCost: Math.round(estimatedCost),
        activities,
      };
    });

    const summary = budgetSummary || {};
    const totalBudget = Math.round(getNonNegativeAmount(summary.totalBudget || summary.TotalBudget, totalBudgetValue));
    const usableBudget = Math.round(getNonNegativeAmount(summary.usableBudget || summary.UsableBudget, totalBudget));
    const estimatedAccommodationCost = Math.round(getNonNegativeAmount(
      summary.estimatedAccommodationCost || summary.EstimatedAccommodationCost,
      accommodationCostFallback,
    ));
    const estimatedTransportCost = Math.round(getNonNegativeAmount(
      summary.estimatedTransportCost || summary.EstimatedTransportCost,
      timelineDetailedCostBreakdown.transport,
    ));
    const estimatedActivityCost = Math.round(getNonNegativeAmount(
      summary.estimatedActivityCost || summary.EstimatedActivityCost,
      timelineDetailedCostBreakdown.activity,
    ));
    const estimatedMealCost = Math.round(getNonNegativeAmount(
      summary.estimatedMealCost || summary.EstimatedMealCost || summary.mealCost || summary.MealCost,
      timelineDetailedCostBreakdown.meal,
    ));
    const estimatedTotalCost = Math.round(getNonNegativeAmount(
      summary.estimatedTotalCost || summary.EstimatedTotalCost,
      estimatedAccommodationCost + estimatedTransportCost + estimatedActivityCost + estimatedMealCost,
    ));
    const remainingBudget = Math.max(0, Math.round(getNonNegativeAmount(
      summary.remainingBudget || summary.RemainingBudget,
      usableBudget - estimatedTotalCost,
    )));
    const contingencyRaw = getNonNegativeAmount(
      summary.contingencyFund || summary.ContingencyFund,
      Math.max(0, totalBudget - usableBudget),
    );
    const contingencyFund = contingencyRaw > 0 ? Math.round(contingencyRaw) : null;

    const fallbackTripName = `Trip ${String(startDate || '').slice(0, 10)} - ${String(endDate || '').slice(0, 10)}`;
    const tripName = pickFirstText(
      itinerary.tripName,
      itinerary.TripName,
      itinerary.name,
      itinerary.Name,
      fallbackTripName,
    );
    const description = pickFirstText(itinerary.description, itinerary.Description) || null;

    const payload = {
      tripName,
      description,
      startDate: startIso,
      endDate: endIso,
      groupSize: Math.max(1, Math.round(Number(groupSize) || 1)),
      currencyCode: safeCurrency,
      days: mappedDays,
      budgetSummary: {
        totalBudget,
        usableBudget,
        estimatedAccommodationCost,
        estimatedTransportCost,
        estimatedActivityCost,
        estimatedMealCost,
        estimatedTotalCost,
        remainingBudget,
        contingencyFund,
      },
    };

    setSavingTrip(true);
    try {
      const result = await saveTripApi(payload);
      const savedTripId = Number(result?.tripId ?? result?.TripId);
      message.success('Trip saved successfully.');
      if (Number.isFinite(savedTripId) && savedTripId > 0) {
        navigate(`/trips/${savedTripId}`);
      }
    } catch (error) {
      const responseData = error?.response?.data;
      const errorDetails = Array.isArray(responseData?.errors)
        ? responseData.errors.map((item) => item?.description || item?.Description || '').filter(Boolean)
        : [];
      const errorMessage = errorDetails[0]
        || responseData?.message
        || responseData?.Message
        || 'Unable to save trip.';
      message.error(errorMessage);
    } finally {
      setSavingTrip(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#FF6B6B', colorTextBase: '#1A535C', colorInfo: '#4ECDC4', colorSuccess: '#4ECDC4', colorWarning: '#FFE66D', colorError: '#FF6B6B', borderRadius: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}>
      <div className={styles.itineraryPage}>
        <div className={planColumnClass}>
          <div className={styles.container}>

          <Card className={styles.headerCard} bordered={false}>
            <Title level={3} className={styles.headerTitle}>
              Travel Itinerary Results
            </Title>
            <div className={styles.headerMeta}>
              <span className={styles.headerMetaItem}>
                {startDate} to {endDate}
              </span>
              <span className={styles.headerMetaItem}>
                {groupSize} people
              </span>
              <span className={styles.headerMetaItem}>
                {budgetLevel}
              </span>
            </div>
          </Card>

          {budgetSummary && (
            <Card
              className={styles.budgetCard}
              title={(
                <div className={styles.budgetCardHeader}>
                  <span>Budget Summary</span>
                </div>
              )}
              size="small"
            >
              <div className={styles.budgetVisualContainer}>
                <div className={styles.budgetVisualHeader}>
                  <Text type="secondary" className={styles.budgetVisualLabel}>Budget Usage</Text>
                  <Text strong className={styles.budgetVisualPercent}>{budgetUsedPercent}%</Text>
                </div>
                <Progress
                  percent={budgetUsedPercent}
                  showInfo={false}
                  strokeColor={budgetUsedPercent > 90 ? '#FF6B6B' : '#4ECDC4'}
                  trailColor="rgba(78, 205, 196, 0.15)"
                  size={["100%", 10]}
                />
              </div>
              <div className={styles.budgetMainGrid}>
                {budgetMainItems.map((item) => (
                  <div key={item.key} className={styles.budgetStatBox}>
                    <span className={styles.budgetStatLabel}>{item.label}</span>
                    <span className={item.className}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.sectionToggleRow}>
                <Button
                  size="small"
                  className={styles.sectionToggleBtn}
                  onClick={() => setShowAlternativeItems((prev) => !prev)}
                >
                  {showAlternativeItems ? 'Hide alternatives' : 'Show alternatives'}
                </Button>
                <Button
                  size="small"
                  className={styles.sectionToggleBtn}
                  onClick={() => setShowTransportOptionItems((prev) => !prev)}
                >
                  {showTransportOptionItems ? 'Hide transport options' : 'Show transport options'}
                </Button>
              </div>
            </Card>
          )}

            {days.map((day, dayIdx) => {
              const dayNum = day.dayNumber || day.DayNumber;
              const isDayUpdating = recalculatingDayNumber === dayNum;
              const rawDayTitle = day.dayTitle || day.DayTitle || `Day ${dayNum}`;
              const date = day.date || day.Date;
              const weather = day.weatherSummary || day.WeatherSummary;
              const timeline = day.timeline || day.Timeline || [];
              const itineraryCurrencyCode = pickFirstText(itinerary.currencyCode, itinerary.CurrencyCode) || 'VND';
              const estimatedCostRaw = day.estimatedCost
                || day.EstimatedCost
                || day.estimatedDayCost
                || day.EstimatedDayCost;
              const estimatedCost = normalizeMoney(estimatedCostRaw, itineraryCurrencyCode);
              const accommodations = day.accommodationRecommendations || day.AccommodationRecommendations || [];

              const currentProvinceId = Number(day.provinceId || day.ProvinceId);
              const currentProvinceName = provinceNameById.get(currentProvinceId);
              const prevDay = dayIdx > 0 ? days[dayIdx - 1] : null;
              const prevProvinceId = Number(prevDay?.provinceId || prevDay?.ProvinceId);
              const prevProvinceName = provinceNameById.get(prevProvinceId);
              const hasRouteTitle = String(rawDayTitle).includes(' - ');

              let dayTitle = rawDayTitle;
              if (currentProvinceName) {
                if (hasRouteTitle && prevProvinceName && prevProvinceName !== currentProvinceName) {
                  dayTitle = `Day ${dayNum}: ${prevProvinceName} - ${currentProvinceName}`;
                } else {
                  dayTitle = `Day ${dayNum} - ${currentProvinceName}`;
                }
              }

              const collapseItems = [
                {
                  key: '1',
                  className: styles.dayCollapsePanel,
                  label: (
                    <div className={styles.dayHeaderInner}>
                      <div className={styles.dayHeaderLeft}>
                        <div className={styles.dayTitle}>{dayTitle}</div>
                        <div className={styles.dayMeta}>
                          {date && <span className={styles.dayDate}>{date}</span>}
                          {isDayUpdating && <span className={styles.dayRecalculate}>Recalculating timeline...</span>}
                          {weather && (
                            <span className={styles.dayWeather} title={weather}>
                              <span className={styles.dayWeatherLabel}>Weather</span>
                              <span className={styles.dayWeatherValue}>{weather}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.headerEstimatedCost}>
                        <span className={styles.headerSummaryLabel}>Estimated Cost:</span>
                        <span className={styles.headerSummaryValue}>
                          {formatMoney(estimatedCost) || `0 ${itineraryCurrencyCode}`}
                        </span>
                      </div>
                    </div>
                  ),
                  children: (
                    <>
                      <div className={styles.timeline}>
                        {timeline.map((item, idx) => {
                          const eventType = item.eventType || item.EventType || 'visit';
                          const startTime = item.startTime || item.StartTime;
                          const endTime = item.endTime || item.EndTime;
                          const startTimeLabel = formatTime(startTime);
                          const endTimeLabel = formatTime(endTime);
                          const locationId = item.locationId || item.LocationId;
                          const locationIdNum = Number(locationId);
                          const rawTitle = item.title || item.Title || '';
                          const isTravel = eventType === 'travel';
                          const isMeal = eventType === 'meal';
                          const isLogistics = ['check-in', 'check-out', 'luggage-refresh'].includes(eventType);

                          const travelDetail = item.locationToLocationTravel || item.LocationToLocationTravel
                            || item.transitHubToLocationTravel || item.TransitHubToLocationTravel
                            || item.locationToTransitHubTravel || item.LocationToTransitHubTravel
                            || item.provinceToProvinceTravel || item.ProvinceToProvinceTravel;
                          const transportOptions = isTravel ? getTransportOptions(travelDetail) : [];
                          const itemLocationName = pickFirstText(item.locationName, item.LocationName);
                          const locationName = locationNameById.get(Number(locationId));
                          const fallbackEventTitle = EVENT_DEFAULT_TITLES[eventType] || 'Activity';
                          const translatedTitle = translateTitleToEnglish(rawTitle);
                          const title = itemLocationName || locationName || translatedTitle || fallbackEventTitle;

                          const tagIds = item.tagIds || item.TagIds || [];
                          const tagNames = item.tagNames || item.TagNames || [];
                          const normalizedTagNames = Array.isArray(tagNames)
                            ? tagNames.map((tag) => String(tag || '').trim()).filter(Boolean)
                            : [];
                          const displayTags = normalizedTagNames.length > 0
                            ? normalizedTagNames.slice(0, 3)
                            : (Array.isArray(tagIds) ? tagIds.slice(0, 3).map((tagId) => `Tag #${tagId}`) : []);

                          const costForGroup = item.costForGroup || item.CostForGroup;
                          const ticketCost = item.ticketCost || item.TicketCost;
                          const rawNote = item.note || item.Note || '';
                          const alternatives = item.alternatives || item.Alternatives || [];

                          const address = pickFirstText(item.address, item.Address);
                          const telephone = pickFirstText(
                            item.telephone,
                            item.Telephone,
                            Number.isFinite(locationIdNum) ? locationTelephoneById.get(locationIdNum) : '',
                          );
                          const itemAmenities = extractAmenityNames(
                            item.amenityNames || item.AmenityNames || item.amenities || item.Amenities || []
                          );
                          const fallbackAmenities = Number.isFinite(locationIdNum)
                            ? (locationAmenitiesById.get(locationIdNum) || [])
                            : [];
                          const displayAmenities = (itemAmenities.length > 0 ? itemAmenities : fallbackAmenities).slice(0, 5);

                          const mediaUrls = (() => {
                            const fromItem = extractMediaUrls(item);
                            if (fromItem.length > 0) return fromItem;
                            if (Number.isFinite(locationIdNum)) {
                              const fromMap = locationMediaById.get(locationIdNum) || [];
                              if (fromMap.length > 0) return fromMap;
                            }
                            const fromAlternatives = extractMediaUrls(item.alternatives || item.Alternatives || []);
                            if (fromAlternatives.length > 0) return fromAlternatives;
                            return [];
                          })();

                          const scoreValue = item.score ?? item.Score ?? item.rating ?? item.Rating;
                          const displayScore = formatScoreLabel(scoreValue);
                          const cleanedNote = String(rawNote).replace(/score\s*:\s*[0-9]+(?:[.,][0-9]+)?/gi, '').replace(/\s{2,}/g, ' ').trim();
                          const note = translateNoteToEnglish(cleanedNote, eventType);

                          const canRemoveLocation = isEditableLocationEvent(item);
                          const canAddPoint = canRemoveLocation;

                          const displayCost = costForGroup || ticketCost;

                          const renderActions = () => (
                            <div className={styles.cardActions}>
                              {locationId && !isTravel && (
                                <Button type="link" size="small" disabled={isDayUpdating} className={styles.linkButton} onClick={() => handleViewLocation(locationId)}>
                                  View Details
                                </Button>
                              )}
                              {canAddPoint && (
                                <Button type="link" size="small" disabled={isDayUpdating} className={styles.linkButton} onClick={() => handleOpenAddBetweenPicker(dayIdx, idx, currentProvinceId)}>
                                  Add Point
                                </Button>
                              )}
                              {canRemoveLocation && (
                                <Popconfirm title="Remove this location?" description="Timeline and travel estimate will be recalculated." okText="Remove" cancelText="Cancel" onConfirm={() => handleRemoveLocation(dayIdx, idx)}>
                                  <Button type="link" size="small" danger disabled={isDayUpdating} className={styles.linkButton}>
                                    Remove
                                  </Button>
                                </Popconfirm>
                              )}
                            </div>
                          );

                          const renderAlternatives = () => {
                            if (alternatives.length === 0) return null;
                            return (
                              <div className={styles.alternativesSection}>
                                <Collapse
                                  activeKey={showAlternativeItems ? ['1'] : []}
                                  onChange={(keys) => setShowAlternativeItems(keys.length > 0)}
                                  className={styles.innerCollapse}
                                  bordered={false}
                                  expandIconPosition="end"
                                  items={[
                                    {
                                      key: '1',
                                      className: styles.innerCollapsePanel,
                                      label: <span className={styles.innerCollapseLabel}>Alternative options ({alternatives.length})</span>,
                                      children: (
                                        <div className={styles.alternativeList}>
                                          {alternatives.map((alternative, altIdx) => {
                                            const altLocationId = alternative.locationId || alternative.LocationId;
                                            const altLocationIdNum = Number(altLocationId);
                                            const fallbackAltName = Number.isFinite(altLocationIdNum) ? locationNameById.get(altLocationIdNum) : '';
                                            const altName = alternative.locationName || alternative.LocationName || fallbackAltName || `Location ${altIdx + 1}`;
                                            const altScoreLabel = formatScoreLabel(alternative.score ?? alternative.Score);
                                            const altTelephone = pickFirstText(alternative.telephone, alternative.Telephone, Number.isFinite(altLocationIdNum) ? locationTelephoneById.get(altLocationIdNum) : '');

                                            const altMediaUrls = (() => {
                                              const fromAlternative = extractMediaUrls(
                                                alternative.mediaUrls || alternative.MediaUrls || alternative.images || alternative.Images || alternative.medias || alternative.Medias || []
                                              );
                                              if (fromAlternative.length > 0) return fromAlternative;
                                              if (Number.isFinite(altLocationIdNum)) {
                                                return locationMediaById.get(altLocationIdNum) || [];
                                              }
                                              return [];
                                            })();

                                            return (
                                              <div key={`${idx}-alt-${altLocationId || altIdx}`} className={styles.alternativeItem}>
                                                <div className={styles.alternativeInfo}>
                                                  <div className={styles.alternativeMain}>
                                                    <span className={styles.alternativeName}>{altName}</span>
                                                  </div>
                                                  {altTelephone && <div className={styles.timelineTelephone}>Phone: {altTelephone}</div>}
                                                  <div className={styles.alternativeActions}>
                                                    {altScoreLabel && <Text type="secondary" className={styles.scoreText}>Score: {altScoreLabel}</Text>}
                                                    {altLocationId && (
                                                      <>
                                                        <Button type="link" size="small" disabled={isDayUpdating} className={styles.linkButton} onClick={() => handleReplaceAlternative(dayIdx, idx, alternative, eventType)}>Replace</Button>
                                                        <Button type="link" size="small" disabled={isDayUpdating} className={styles.linkButton} onClick={() => handleViewLocation(altLocationId)}>View</Button>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                                {altTelephone && <div className={styles.timelineTelephone}>Phone: {altTelephone}</div>}
                                                <div className={styles.alternativeActions}>
                                                  {altScoreLabel && <Text type="secondary" className={styles.scoreText}>Score: {altScoreLabel}</Text>}
                                                  {altLocationId && (
                                                    <>
                                                      <Button type="link" size="small" disabled={isDayUpdating} className={styles.linkButton} onClick={() => handleReplaceAlternative(dayIdx, idx, alternative, eventType)}>Replace</Button>
                                                      <Button type="link" size="small" disabled={isDayUpdating} className={styles.linkButton} onClick={() => handleViewLocation(altLocationId)}>View</Button>
                                                    </>
                                                  )}
                                                </div>
                                                {altMediaUrls.length > 0 && (
                                                  <div className={styles.alternativeMedia}>
                                                    {altMediaUrls.length > 1 ? (
                                                      <Carousel autoplay effect="fade" dots={false} className={styles.imageCarousel}>
                                                        {altMediaUrls.map((url, mediaIdx) => (
                                                          <div key={mediaIdx}>
                                                            <img src={url} alt={`${altName} ${mediaIdx + 1}`} loading="lazy" className={styles.carouselImage} />
                                                          </div>
                                                        ))}
                                                      </Carousel>
                                                    ) : (
                                                      <img src={altMediaUrls[0]} alt={altName} loading="lazy" className={styles.carouselImage} />
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )
                                    }
                                  ]}
                                />
                              </div>
                            );
                          };

                          const badgeConfig = EVENT_BADGES[eventType] || EVENT_BADGES.visit;

                          return (
                            <div key={idx} className={styles.timelineItem}>
                              <div className={styles.timelineTime}>
                                <span className={styles.timelineTimeStart}>{startTimeLabel}</span>
                                {endTimeLabel && <span className={styles.timelineTimeEnd}>{endTimeLabel}</span>}
                                <span className={styles.timelineDuration}>{getDurationStr(startTime, endTime)}</span>
                              </div>

                              <div className={styles.timelineIcon} style={{ background: badgeConfig.bg }}>
                                {badgeConfig.badge}
                              </div>

                              <div className={styles.timelineContent}>
                                {isTravel && (() => {
                                  const travelMethod = getTravelMethod(travelDetail);
                                  const travelMinutes = getTravelDurationMinutes(travelDetail);
                                  const travelDistanceKm = toFiniteNumber(travelDetail?.distanceKm ?? travelDetail?.DistanceKm);
                                  const travelCostForGroup = getTravelGroupCost(costForGroup, travelDetail);
                                  const fromText = getTravelPointName(travelDetail, true) || 'Previous Location';
                                  const toText = getTravelPointName(travelDetail, false) || 'Next Location';

                                  return (
                                    <div className={`${styles.card} ${styles.travelCard}`}>
                                      <div className={styles.travelRoute}>
                                        <div className={styles.travelPoint}>
                                          <div className={styles.dot}></div>
                                          <span>{fromText}</span>
                                        </div>
                                        <div className={styles.travelLine}>
                                          <div className={styles.travelIconWrapper}>
                                          <PaperPlaneRight size={24} weight="bold" color="#D89A00" />
                                          </div>
                                        </div>
                                        <div className={styles.travelPoint}>
                                          <div className={styles.dot}></div>
                                          <span>{toText}</span>
                                        </div>
                                      </div>
                                      <div className={styles.travelMeta}>
                                        <Clock size={16} weight="bold" />
                                        <span>
                                          {travelMinutes ? formatMinutesAsHourMinute(travelMinutes) : ''}
                                          {travelDistanceKm ? ` (${travelDistanceKm.toFixed(travelDistanceKm >= 10 ? 0 : 1)} km)` : ''}
                                          {travelMethod ? ` • ${travelMethod}` : ''}
                                        </span>
                                      </div>
                                      {travelCostForGroup && (
                                        <div className={styles.travelCost}>
                                          <span className={styles.costAmount}>{formatMoney(travelCostForGroup)}</span>
                                        </div>
                                      )}

                                      {transportOptions.length > 0 && (
                                        <div className={styles.transportSection}>
                                          <Collapse
                                            activeKey={showTransportOptionItems ? ['1'] : []}
                                            onChange={(keys) => setShowTransportOptionItems(keys.length > 0)}
                                            className={styles.innerCollapse}
                                            bordered={false}
                                            expandIconPosition="end"
                                            items={[
                                              {
                                                key: '1',
                                                className: styles.innerCollapsePanel,
                                                label: <span className={styles.innerCollapseLabel}>Transport options ({transportOptions.length})</span>,
                                                children: (
                                                  <div className={styles.transportOptionList}>
                                                    {transportOptions.map((option, optionIdx) => {
                                                      const optionMethod = pickFirstText(option?.method, option?.Method, `Option ${optionIdx + 1}`);
                                                      const optionMinutes = toFiniteNumber(option?.estimatedTravelMinutes ?? option?.EstimatedTravelMinutes);
                                                      const optionCost = pickBestMoney(option?.costForGroup, option?.CostForGroup, option?.estimatedTotalCost, option?.EstimatedTotalCost);
                                                      const optionRecommended = Boolean(option?.recommended ?? option?.Recommended);
                                                      return (
                                                        <div key={`${idx}-transport-option-${optionIdx}`} className={`${styles.transportOptionItem} ${styles.transportOptionItemClickable} ${optionRecommended ? styles.transportOptionItemSelected : ''}`} role="button" tabIndex={0} onClick={() => { if (!isDayUpdating) handleSelectTransportOption(dayIdx, idx, optionIdx); }}>
                                                          <div className={styles.transportOptionMain}>
                                                            <span className={styles.transportOptionName}>{optionMethod}</span>
                                                            {optionRecommended && <span className={styles.transportOptionRecommended}>Recommended</span>}
                                                          </div>
                                                          <div className={styles.transportOptionMeta}>
                                                            {optionMinutes != null && optionMinutes > 0 ? formatMinutesAsHourMinute(optionMinutes) : 'N/A'}
                                                            {optionCost ? ` • ${formatMoney(optionCost)}` : ''}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )
                                              }
                                            ]}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {isMeal && (
                                  <div className={`${styles.card} ${styles.mealCard}`}>
                                    <div className={styles.mealTop}>
                                      <div className={styles.mealDetails}>
                                        <div className={styles.visitInfo}>
                                          <h3 className={styles.title}>{title}</h3>
                                          {displayTags.length > 0 && (
                                            <div className={styles.inlineTags}>
                                              {displayTags.map((tagLabel, tagIdx) => (
                                                <span key={`${idx}-tag-${tagIdx}`} className={styles.tag}>{tagLabel}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        {note && <p className={styles.address}>{note}</p>}
                                        {address && <p className={styles.address}>{address}</p>}
                                        {telephone && <p className={styles.address}>Phone: {telephone}</p>}
                                        {displayAmenities.length > 0 && (
                                          <div className={styles.tags} style={{ marginTop: 8 }}>
                                            {displayAmenities.map((amenity, amenityIdx) => (
                                              <Tag key={`${idx}-amenity-${amenityIdx}`} className={styles.customTag}>{amenity}</Tag>
                                            ))}
                                          </div>
                                        )}
                                        {displayCost && (displayCost.amount || displayCost.Amount) > 0 ? (
                                          <div className={styles.costAmount} style={{ marginTop: 8 }}>{formatMoney(displayCost)}</div>
                                        ) : (
                                          <div className={styles.costFree} style={{ marginTop: 8 }}>Free</div>
                                        )}
                                        {renderActions()}
                                      </div>
                                      {mediaUrls.length > 0 && (
                                        <div className={styles.mealImage}>
                                          {mediaUrls.length > 1 ? (
                                            <Carousel autoplay effect="fade" dots={false} className={styles.imageCarousel}>
                                              {mediaUrls.map((url, imgIdx) => (
                                                <div key={imgIdx}>
                                                  <img src={url} alt={`${title} ${imgIdx + 1}`} loading="lazy" className={styles.carouselImage} />
                                                </div>
                                              ))}
                                            </Carousel>
                                          ) : (
                                            <img src={mediaUrls[0]} alt={title} loading="lazy" className={styles.carouselImage} />
                                          )}
                                          {displayScore && (
                                            <div className={styles.mealRating}>
                                              <Star size={14} weight="fill" color="#D89A00" />
                                              <span>{displayScore}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {renderAlternatives()}
                                  </div>
                                )}

                                {isLogistics && (
                                  <div className={`${styles.card} ${styles.logisticsCard}`}>
                                    <div className={styles.logisticsText}>
                                      <h3 className={styles.title}>{title}</h3>
                                      {address && <p className={styles.address}>{address}</p>}
                                      {telephone && <p className={styles.address}>Phone: {telephone}</p>}
                                      {note && <p className={styles.address}>{note}</p>}
                                    </div>
                                    {renderAlternatives()}
                                    {renderActions()}
                                  </div>
                                )}

                                {!isTravel && !isMeal && !isLogistics && (
                                  <div className={`${styles.card} ${styles.visitCard}`}>
                                    <div className={styles.visitTop}>
                                      <div className={styles.visitDetails}>
                                        <div className={styles.visitInfo}>
                                          <h3 className={styles.title}>{title}</h3>
                                          {displayTags.length > 0 && (
                                            <div className={styles.inlineTags}>
                                              {displayTags.map((tagLabel, tagIdx) => (
                                                <span key={`${idx}-tag-${tagIdx}`} className={styles.tag}>{tagLabel}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        {note && <p className={styles.address}>{note}</p>}
                                        {address && <p className={styles.address}>{address}</p>}
                                        {telephone && <p className={styles.address}>Phone: {telephone}</p>}
                                        {displayAmenities.length > 0 && (
                                          <div className={styles.tags} style={{ marginTop: 8 }}>
                                            {displayAmenities.map((amenity, amenityIdx) => (
                                              <Tag key={`${idx}-amenity-${amenityIdx}`} className={styles.customTag}>{amenity}</Tag>
                                            ))}
                                          </div>
                                        )}
                                        {displayCost && (displayCost.amount || displayCost.Amount) > 0 ? (
                                          <div className={styles.costAmount} style={{ marginTop: 8 }}>{formatMoney(displayCost)}</div>
                                        ) : (
                                          <div className={styles.costFree} style={{ marginTop: 8 }}>Free</div>
                                        )}
                                        {renderActions()}
                                      </div>
                                      {mediaUrls.length > 0 && (
                                        <div className={styles.visitImage}>
                                          {mediaUrls.length > 1 ? (
                                            <Carousel autoplay effect="fade" dots={false} className={styles.imageCarousel}>
                                              {mediaUrls.map((url, imgIdx) => (
                                                <div key={imgIdx}>
                                                  <img src={url} alt={`${title} ${imgIdx + 1}`} loading="lazy" className={styles.carouselImage} />
                                                </div>
                                              ))}
                                            </Carousel>
                                          ) : (
                                            <img src={mediaUrls[0]} alt={title} loading="lazy" className={styles.carouselImage} />
                                          )}
                                          {displayScore && (
                                            <div className={styles.visitRating}>
                                              <Star size={14} weight="fill" color="#D89A00" />
                                              <span>{displayScore}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {renderAlternatives()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {accommodations.length > 0 && (
                        <div className={styles.accommodationSection}>
                          <div className={styles.accommodationTitle}>Accommodation Suggestions</div>
                          {accommodations.map((acc, i) => {
                            const name = acc.englishName || acc.EnglishName || acc.name || acc.Name || acc.hotelName || acc.HotelName || 'Hotel';
                            const price = acc.pricePerNight || acc.PricePerNight || acc.estimatedCost || acc.EstimatedCost;
                            const accommodationAmenities = extractAmenityNames(
                              acc.amenities || acc.Amenities || acc.amenityNames || acc.AmenityNames || []
                            ).slice(0, 5);
                            return (
                              <div key={i} className={styles.accommodationItemWrap}>
                                <div className={styles.accommodationItem}>
                                  <span>{name}</span>
                                  <Space>
                                    {price && <Text strong className={styles.costAmount}>{formatMoney(price)}/night</Text>}
                                    <Button type="link" size="small" className={styles.linkButton} onClick={() => handleViewAccommodation(acc)}>Details</Button>
                                  </Space>
                                </div>
                                {accommodationAmenities.length > 0 && (
                                  <div className={styles.accommodationAmenities}>
                                    {accommodationAmenities.map((amenity, amenityIdx) => (
                                      <Tag key={`${i}-acc-amenity-${amenityIdx}`} className={styles.customTag}>{amenity}</Tag>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ),
                },
              ];

              return (
                <Collapse
                  key={dayNum}
                  defaultActiveKey={['1']}
                  className={styles.dayCard}
                  bordered={false}
                  expandIconPosition="end"
                  items={collapseItems}
                />
              );
            })}

            <div className={styles.actionBar}>
              <Button onClick={handleRegenerate} size="large" className={styles.actionBtnSecondary}>
                Regenerate
              </Button>
              <Button type="primary" onClick={() => navigate('/create-trip')} size="large" className={styles.actionBtnPrimary}>
                Edit
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="primary"
          onClick={handleSaveTrip}
          loading={savingTrip}
          size="large"
          className={styles.saveTripFloatingBtn}
        >
          Save Trip
        </Button>

        <Modal
          title="Add Point"
          open={addBetweenModal.open}
          onCancel={handleCloseAddBetweenModal}
          onOk={handleConfirmAddBetween}
          okText="Add To Timeline"
          cancelText="Cancel"
          okButtonProps={{ disabled: !selectedProvinceLocationId, loading: provinceLocationLoading }}
        >
          <div className={styles.addBetweenModalBody}>
            <Text type="secondary" className={styles.addBetweenHint}>
              Select a location in the same province. The system will recalculate route distance, duration, and costs.
            </Text>

            <Select
              showSearch
              allowClear
              className={styles.addBetweenSelect}
              placeholder="Search location in this province"
              searchValue={provinceLocationSearch}
              value={selectedProvinceLocationId}
              onChange={(value) => setSelectedProvinceLocationId(value ?? null)}
              onSearch={handleSearchProvinceLocations}
              filterOption={false}
              loading={provinceLocationLoading}
              options={provinceLocationOptions.map((location) => ({
                label: location.address ? `${location.name} - ${location.address}` : location.name,
                value: location.id,
              }))}
              notFoundContent={provinceLocationLoading ? <Spin size="small" /> : 'No available locations'}
            />
          </div>
        </Modal>

        <LocationDetailModal
          open={locationModal.open}
          locationId={locationModal.locationId}
          currencyCode={tripCurrencyCode}
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
    </ConfigProvider>
  );
};

export default ItineraryResultPage;