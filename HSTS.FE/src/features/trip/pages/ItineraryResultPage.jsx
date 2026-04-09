import React, { useState, useCallback, useEffect } from 'react';
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
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTripPlanner } from '../hooks/useTripPlanner';
import {
  getLocationByIdApi,
  getProvincesApi,
  estimateLocalTravelApi,
  getLocationsByProvinceApi,
} from '../api';
import LocationDetailModal from '../components/LocationDetailModal';
import TransportDetailModal from '../components/TransportDetailModal';
import AccommodationDetailModal from '../components/AccommodationDetailModal';
import styles from './ItineraryResultPage.module.css';

const { Title, Text } = Typography;

// EventType → badge + color mapping
const EVENT_BADGES = {
  travel: { badge: 'TR', bg: '#e6f4ff' },
  visit: { badge: 'VS', bg: '#f6ffed' },
  meal: { badge: 'ML', bg: '#fff7e6' },
  'check-in': { badge: 'IN', bg: '#f9f0ff' },
  'check-out': { badge: 'OUT', bg: '#f5f5f5' },
  'luggage-refresh': { badge: 'LG', bg: '#fff0f6' },
};

const EVENT_DEFAULT_TITLES = {
  travel: 'Move',
  visit: 'Visit',
  meal: 'Meal',
  'check-in': 'Check-in',
  'check-out': 'Check-out',
  'luggage-refresh': 'Luggage Refresh',
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

const getTravelRouteText = (travelDetail) => {
  if (!travelDetail) return '';

  const fromName = pickFirstText(
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
    travelDetail.fromTransitHubId != null ? `Hub #${travelDetail.fromTransitHubId}` : '',
    travelDetail.FromTransitHubId != null ? `Hub #${travelDetail.FromTransitHubId}` : '',
    travelDetail.fromProvinceId != null ? `Province #${travelDetail.fromProvinceId}` : '',
    travelDetail.FromProvinceId != null ? `Province #${travelDetail.FromProvinceId}` : '',
  );
  const toName = pickFirstText(
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
    travelDetail.toTransitHubId != null ? `Hub #${travelDetail.toTransitHubId}` : '',
    travelDetail.ToTransitHubId != null ? `Hub #${travelDetail.ToTransitHubId}` : '',
    travelDetail.toProvinceId != null ? `Province #${travelDetail.toProvinceId}` : '',
    travelDetail.ToProvinceId != null ? `Province #${travelDetail.ToProvinceId}` : '',
  );

  if (fromName && toName) return `From ${fromName} to ${toName}`;
  if (fromName) return `From ${fromName}`;
  if (toName) return `To ${toName}`;
  return '';
};

const getTransportOptionRouteText = (option) => {
  if (!option) return '';

  const fromName = pickFirstText(
    option.fromTransitHubName,
    option.FromTransitHubName,
    option.fromProvinceName,
    option.FromProvinceName,
    option.fromLocationName,
    option.FromLocationName,
    option.fromName,
    option.FromName,
    option.from,
    option.From,
    option.fromTransitHubId != null ? `Hub #${option.fromTransitHubId}` : '',
    option.FromTransitHubId != null ? `Hub #${option.FromTransitHubId}` : '',
  );
  const toName = pickFirstText(
    option.toTransitHubName,
    option.ToTransitHubName,
    option.toProvinceName,
    option.ToProvinceName,
    option.toLocationName,
    option.ToLocationName,
    option.toName,
    option.ToName,
    option.to,
    option.To,
    option.toTransitHubId != null ? `Hub #${option.toTransitHubId}` : '',
    option.ToTransitHubId != null ? `Hub #${option.ToTransitHubId}` : '',
  );

  if (fromName && toName) return `${fromName} -> ${toName}`;
  if (fromName) return `From ${fromName}`;
  if (toName) return `To ${toName}`;
  return '';
};

const formatMoney = (moneyDto) => {
  if (!moneyDto) return null;
  const amount = moneyDto.amount ?? moneyDto.Amount ?? 0;
  const currency = moneyDto.currency || moneyDto.Currency || 'VND';
  return `${amount.toLocaleString()} ${currency}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Handle TimeOnly format "HH:mm:ss" or "HH:mm"
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

const getTimelineItemCostAmount = (item) => {
  if (!item) return 0;

  const travelDetail = item.locationToLocationTravel || item.LocationToLocationTravel;
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

const updateDayEstimatedCost = (day, timelineKey, currencyCode) => {
  if (!day || !timelineKey) return;
  const timeline = Array.isArray(day[timelineKey]) ? day[timelineKey] : [];
  const estimatedAmount = timeline.reduce((sum, item) => sum + getTimelineItemCostAmount(item), 0);
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
  const estimatedTotal = days.reduce((sum, day) => {
    const money = normalizeMoney(
      day?.estimatedCost
      || day?.EstimatedCost
      || day?.estimatedDayCost
      || day?.EstimatedDayCost,
      currencyCode,
    );
    return sum + (money?.amount || 0);
  }, 0);

  const estimatedMoney = { amount: Math.round(estimatedTotal), currency: currencyCode };
  const usable = normalizeMoney(summary?.usableBudget || summary?.UsableBudget, currencyCode);
  const remainingMoney = usable
    ? { amount: Math.round(usable.amount - estimatedMoney.amount), currency: usable.currency || currencyCode }
    : null;

  if ('estimatedTotalCost' in summary) summary.estimatedTotalCost = estimatedMoney;
  if ('EstimatedTotalCost' in summary) summary.EstimatedTotalCost = estimatedMoney;
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

const ItineraryResultPage = () => {
  const navigate = useNavigate();
  const { itinerary, clearItinerary, updateItinerary } = useTripPlanner();
  const [provinceNameById, setProvinceNameById] = useState(new Map());
  const [locationNameById, setLocationNameById] = useState(new Map());
  const [locationMediaById, setLocationMediaById] = useState(new Map());
  const [locationTelephoneById, setLocationTelephoneById] = useState(new Map());
  const [locationAmenitiesById, setLocationAmenitiesById] = useState(new Map());
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
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
        // Ignore and keep backend-provided day titles as fallback.
      }
    };

    loadProvinceNames();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLocationMetadata = async () => {
      const days = itinerary?.days || itinerary?.Days || [];
      const timelineItems = days.flatMap((day) => (day.timeline || day.Timeline || []));
      const directLocationIds = timelineItems
        .map((item) => Number(item.locationId || item.LocationId))
        .filter((id) => Number.isFinite(id) && id > 0);
      const alternativeLocationIds = timelineItems
        .flatMap((item) => (item.alternatives || item.Alternatives || []))
        .map((alternative) => Number(alternative?.locationId || alternative?.LocationId))
        .filter((id) => Number.isFinite(id) && id > 0);
      const locationIds = [...new Set([...directLocationIds, ...alternativeLocationIds])];

      if (locationIds.length === 0) {
        if (mounted) {
          setLocationNameById(new Map());
          setLocationMediaById(new Map());
          setLocationTelephoneById(new Map());
          setLocationAmenitiesById(new Map());
        }
        return;
      }

      try {
        const entries = await Promise.all(locationIds.map(async (id) => {
          try {
            const data = await getLocationByIdApi(id);
            const mediaUrls = extractMediaUrls(data);
            const telephone = pickFirstText(data?.telephone, data?.Telephone);
            const amenities = extractAmenityNames(
              data?.amenityNames
              || data?.AmenityNames
              || data?.amenities
              || data?.Amenities
              || []
            );
            return [id, { name: getEnglishPreferredName(data), mediaUrls, telephone, amenities }];
          } catch {
            return [id, { name: null, mediaUrls: [], telephone: '', amenities: [] }];
          }
        }));

        if (!mounted) return;

        const nameMap = new Map();
        const mediaMap = new Map();
        const telephoneMap = new Map();
        const amenitiesMap = new Map();
        entries.forEach(([id, payload]) => {
          if (payload?.name) nameMap.set(id, payload.name);
          if (Array.isArray(payload?.mediaUrls) && payload.mediaUrls.length > 0) {
            mediaMap.set(id, payload.mediaUrls);
          }
          if (payload?.telephone) telephoneMap.set(id, payload.telephone);
          if (Array.isArray(payload?.amenities) && payload.amenities.length > 0) {
            amenitiesMap.set(id, payload.amenities);
          }
        });
        setLocationNameById(nameMap);
        setLocationMediaById(mediaMap);
        setLocationTelephoneById(telephoneMap);
        setLocationAmenitiesById(amenitiesMap);
      } catch {
        if (mounted) {
          setLocationNameById(new Map());
          setLocationMediaById(new Map());
          setLocationTelephoneById(new Map());
          setLocationAmenitiesById(new Map());
        }
      }
    };

    loadLocationMetadata();
    return () => {
      mounted = false;
    };
  }, [itinerary]);

  const handleViewLocation = useCallback((locationId) => {
    setLocationModal({ open: true, locationId });
  }, []);

  const handleViewAccommodation = useCallback((data) => {
    setAccommodationModal({ open: true, data });
  }, []);

  const recalculateDayTimeline = useCallback(async (draftItinerary, dayIndex) => {
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
      day[timelineKey] = sourceTimeline.filter((item) => !isTravelEvent(item));
      return draftItinerary;
    }

    if (locationIndexes.length === 1) {
      day[timelineKey] = sourceTimeline.filter((item) => !isTravelEvent(item));
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
    const beforeSegment = sourceTimeline.slice(0, firstLocationIndex).filter((item) => !isTravelEvent(item));
    const afterSegment = sourceTimeline.slice(lastLocationIndex + 1).filter((item) => !isTravelEvent(item));

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
      ) || `Location #${altLocationId}`;

      const replacedItem = {
        ...anchorItem,
        eventType: sourceEventType || anchorItem?.eventType || anchorItem?.EventType || 'visit',
        title: sourceEventType === 'meal' ? `Meal at ${altName}` : `Visit ${altName}`,
        locationName: altName,
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
        alternatives: (anchorItem?.alternatives || anchorItem?.Alternatives || [])
          .filter((item) => Number(item?.locationId ?? item?.LocationId) !== altLocationId),
      };

      timeline[timelineIndex] = replacedItem;
      day[timelineKey] = timeline;

      await recalculateDayTimeline(draft, dayIndex);
      updateItinerary(draft);
      message.success('Main location replaced and timeline recalculated.');
    } catch {
      message.error('Unable to replace location and recalculate timeline.');
    } finally {
      setRecalculatingDayNumber(null);
    }
  }, [itinerary, recalculateDayTimeline, updateItinerary]);

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
      message.warning('Please select a location to add between two main points.');
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
        note: 'Inserted between two main locations',
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
      message.success('Location inserted between two main points and timeline recalculated.');

      setAddBetweenModal({ open: false, dayIndex: null, insertAfterIndex: null, provinceId: null });
      setProvinceLocationOptions([]);
      setSelectedProvinceLocationId(null);
      setProvinceLocationSearch('');
    } catch {
      message.error('Unable to add location between two points.');
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

      timeline.splice(timelineIndex, 1);
      day[timelineKey] = timeline;

      await recalculateDayTimeline(draft, dayIndex);
      updateItinerary(draft);
      message.success('Location removed and timeline recalculated.');
    } catch {
      message.error('Unable to remove location and recalculate timeline.');
    } finally {
      setRecalculatingDayNumber(null);
    }
  }, [itinerary, recalculateDayTimeline, updateItinerary]);

  const handleRegenerate = () => {
    clearItinerary();
    navigate('/create-trip');
  };

  if (!itinerary) {
    return (
      <div className={styles.itineraryPage}>
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <Empty description="No itinerary has been generated yet" />
            <Button type="primary" onClick={() => navigate('/create-trip')} style={{ marginTop: 16 }}>
              Create New Itinerary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const days = itinerary.days || itinerary.Days || [];
  const budgetSummary = itinerary.budgetSummary || itinerary.BudgetSummary;
  const startDate = itinerary.startDate || itinerary.StartDate;
  const endDate = itinerary.endDate || itinerary.EndDate;
  const groupSize = itinerary.groupSize || itinerary.GroupSize;
  const budgetLevel = itinerary.budgetLevel || itinerary.BudgetLevel;

  const budgetMainItems = budgetSummary
    ? [
      {
        key: 'totalBudget',
        label: 'Total Budget',
        value: formatMoney(budgetSummary.totalBudget || budgetSummary.TotalBudget),
        className: styles.budgetValue,
      },
      {
        key: 'usableBudget',
        label: 'Usable',
        value: formatMoney(budgetSummary.usableBudget || budgetSummary.UsableBudget),
        className: styles.budgetValue,
      },
      {
        key: 'estimatedTotal',
        label: 'Estimated Total',
        value: formatMoney(budgetSummary.estimatedTotalCost || budgetSummary.EstimatedTotalCost),
        className: styles.budgetValue,
      },
      {
        key: 'remainingBudget',
        label: 'Remaining',
        value: formatMoney(budgetSummary.remainingBudget || budgetSummary.RemainingBudget),
        className: `${styles.budgetValue} ${styles.budgetPositive}`,
      },
    ]
    : [];

  const budgetDetailItems = budgetSummary
    ? [
      {
        key: 'contingency',
        label: 'Contingency',
        value: formatMoney(budgetSummary.contingencyFund || budgetSummary.ContingencyFund),
      },
      {
        key: 'transport',
        label: 'Transport',
        value: formatMoney(budgetSummary.estimatedTransportCost || budgetSummary.EstimatedTransportCost),
      },
      {
        key: 'accommodation',
        label: 'Accommodation',
        value: formatMoney(budgetSummary.estimatedAccommodationCost || budgetSummary.EstimatedAccommodationCost),
      },
      {
        key: 'activities',
        label: 'Activities',
        value: formatMoney(budgetSummary.estimatedActivityCost || budgetSummary.EstimatedActivityCost),
      },
    ]
    : [];

  return (
    <div className={styles.itineraryPage}>
      <div className={styles.container}>

        {/* Header */}
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

        {/* Budget Summary */}
        {budgetSummary && (
          <Card
            className={styles.budgetCard}
            title={(
              <div className={styles.budgetCardHeader}>
                <span>Budget Summary</span>
                <Button
                  type="link"
                  size="small"
                  className={styles.budgetToggleBtn}
                  onClick={() => setShowBudgetDetails((prev) => !prev)}
                >
                  {showBudgetDetails ? 'Hide details' : 'Show details'}
                </Button>
              </div>
            )}
            size="small"
          >
            <div className={styles.budgetGrid}>
              {budgetMainItems.map((item) => (
                <div key={item.key} className={styles.budgetItem}>
                  <span className={styles.budgetLabel}>{item.label}</span>
                  <span className={item.className}>{item.value}</span>
                </div>
              ))}

              {showBudgetDetails && budgetDetailItems.map((item) => (
                <div key={item.key} className={styles.budgetItem}>
                  <span className={styles.budgetLabel}>{item.label}</span>
                  <span className={`${styles.budgetValue} ${styles.budgetNegative}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Day-by-Day Itinerary */}
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

          return (
            <Card key={dayNum} className={styles.dayCard} bordered={false} bodyStyle={{ padding: 0 }}>
              {/* Day Header */}
              <div className={styles.dayHeader}>
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

              {/* Timeline */}
              <div className={styles.timeline}>
                {timeline.map((item, idx) => {
                  const eventType = item.eventType || item.EventType || 'visit';
                  const eventConfig = EVENT_BADGES[eventType] || EVENT_BADGES.visit;
                  const startTime = item.startTime || item.StartTime;
                  const endTime = item.endTime || item.EndTime;
                  const startTimeLabel = formatTime(startTime);
                  const endTimeLabel = formatTime(endTime);
                  const locationId = item.locationId || item.LocationId;
                  const locationIdNum = Number(locationId);
                  const rawTitle = item.title || item.Title || '';
                  const isTravel = eventType === 'travel';
                  const travelDetail = item.locationToLocationTravel || item.LocationToLocationTravel
                    || item.transitHubToLocationTravel || item.TransitHubToLocationTravel
                    || item.locationToTransitHubTravel || item.LocationToTransitHubTravel
                    || item.provinceToProvinceTravel || item.ProvinceToProvinceTravel;
                  const transportOptions = isTravel ? getTransportOptions(travelDetail) : [];
                  const itemLocationName = pickFirstText(item.locationName, item.LocationName);
                  const locationName = locationNameById.get(Number(locationId));
                  const travelRouteText = isTravel ? getTravelRouteText(travelDetail) : '';
                  const fallbackEventTitle = EVENT_DEFAULT_TITLES[eventType] || 'Activity';
                  const translatedTitle = translateTitleToEnglish(rawTitle);
                  const forceEnglishTitle = eventType === 'travel'
                    || eventType === 'check-in'
                    || eventType === 'luggage-refresh';
                  const travelPreferredTitle = travelRouteText || translatedTitle || fallbackEventTitle;
                  const title = itemLocationName
                    || locationName
                    || (forceEnglishTitle
                      ? (isTravel ? travelPreferredTitle : fallbackEventTitle)
                      : (translatedTitle || fallbackEventTitle));
                  const tagIds = item.tagIds || item.TagIds || [];
                  const tagNames = item.tagNames || item.TagNames || [];
                  const normalizedTagNames = Array.isArray(tagNames)
                    ? tagNames
                      .map((tag) => String(tag || '').trim())
                      .filter(Boolean)
                    : [];
                  const displayTags = normalizedTagNames.length > 0
                    ? normalizedTagNames.slice(0, 3)
                    : (Array.isArray(tagIds)
                      ? tagIds.slice(0, 3).map((tagId) => `Tag #${tagId}`)
                      : []);
                  const costForGroup = item.costForGroup || item.CostForGroup;
                  const ticketCost = item.ticketCost || item.TicketCost;
                  const rawNote = item.note || item.Note || '';
                  const alternatives = item.alternatives || item.Alternatives || [];
                  const travelMethod = isTravel ? getTravelMethod(travelDetail) : '';
                  const travelMinutes = isTravel ? getTravelDurationMinutes(travelDetail) : null;
                  const travelDistanceKm = isTravel
                    ? toFiniteNumber(travelDetail?.distanceKm ?? travelDetail?.DistanceKm)
                    : null;
                  const travelCostForGroup = isTravel
                    ? getTravelGroupCost(costForGroup, travelDetail)
                    : costForGroup;
                  const travelMetaParts = [];
                  if (travelMethod) travelMetaParts.push(travelMethod);
                  if (travelDistanceKm != null && travelDistanceKm > 0) {
                    travelMetaParts.push(`${travelDistanceKm.toFixed(travelDistanceKm >= 10 ? 0 : 1)} km`);
                  }
                  if (travelMinutes != null && travelMinutes > 0) {
                    travelMetaParts.push(formatMinutesAsHourMinute(travelMinutes));
                  }
                  const travelMetaText = travelMetaParts.join(' • ');
                  const address = pickFirstText(item.address, item.Address);
                  const telephone = pickFirstText(
                    item.telephone,
                    item.Telephone,
                    Number.isFinite(locationIdNum) ? locationTelephoneById.get(locationIdNum) : '',
                  );
                  const itemAmenities = extractAmenityNames(
                    item.amenityNames
                    || item.AmenityNames
                    || item.amenities
                    || item.Amenities
                    || []
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
                  const cleanedNote = String(rawNote)
                    .replace(/score\s*:\s*[0-9]+(?:[.,][0-9]+)?/gi, '')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                  const note = translateNoteToEnglish(cleanedNote, eventType);
                  const canRemoveLocation = isEditableLocationEvent(item);
                  const canAddBetweenMain = canRemoveLocation && findNextPrimaryLocationIndex(timeline, idx) >= 0;

                  return (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineTime}>
                        <span className={styles.timelineTimeStart}>{startTimeLabel}</span>
                        {endTimeLabel && <span className={styles.timelineTimeEnd}>{endTimeLabel}</span>}
                      </div>
                      <div
                        className={styles.timelineIcon}
                        style={{ background: eventConfig.bg }}
                      >
                        {eventConfig.badge}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>{title}</div>
                        {isTravel && travelRouteText && title !== travelRouteText && (
                          <div className={styles.timelineRoute}>{travelRouteText}</div>
                        )}
                        {isTravel && travelMetaText && (
                          <div className={styles.timelineTransportMeta}>{travelMetaText}</div>
                        )}
                        {!isTravel && displayScore && (
                          <div className={styles.timelineScore}>
                            <span className={styles.timelineScoreBadge}>Score</span>
                            <span className={styles.timelineScoreValue}>{displayScore}</span>
                          </div>
                        )}
                        {note && <div className={styles.timelineNote}>{note}</div>}
                        {!isTravel && address && (
                          <div className={styles.timelineAddress} title={address}>{address}</div>
                        )}
                        {!isTravel && telephone && (
                          <div className={styles.timelineTelephone}>Phone: {telephone}</div>
                        )}
                        {!isTravel && displayAmenities.length > 0 && (
                          <div className={styles.timelineAmenities}>
                            {displayAmenities.map((amenity, amenityIdx) => (
                              <Tag key={`${idx}-amenity-${amenityIdx}`} color="green" style={{ fontSize: 11 }}>
                                {amenity}
                              </Tag>
                            ))}
                          </div>
                        )}
                        {!isTravel && mediaUrls.length > 0 && (
                          <div className={styles.timelineMedia}>
                            {mediaUrls.slice(0, 3).map((url, imgIdx) => (
                              <a
                                key={`${idx}-media-${imgIdx}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.timelineMediaLink}
                              >
                                <img
                                  src={url}
                                  alt={`${title} ${imgIdx + 1}`}
                                  className={styles.timelineMediaImage}
                                  loading="lazy"
                                />
                              </a>
                            ))}
                            {mediaUrls.length > 3 && (
                              <span className={styles.timelineMediaMore}>+{mediaUrls.length - 3} more</span>
                            )}
                          </div>
                        )}

                        {isTravel && showTransportOptionItems && transportOptions.length > 0 && (
                          <>
                            <div className={styles.inlineToggleRow}>
                              <span className={styles.inlineToggleLabel}>Transport options ({transportOptions.length})</span>
                              <Button
                                type="link"
                                size="small"
                                disabled={isDayUpdating}
                                style={{ padding: 0, height: 'auto', fontSize: 11 }}
                                onClick={() => setShowTransportOptionItems(false)}
                              >
                                Hide
                              </Button>
                            </div>
                            <div className={styles.transportOptionList}>
                              {transportOptions.map((option, optionIdx) => {
                                const optionMethod = pickFirstText(
                                  option?.method,
                                  option?.Method,
                                  `Option ${optionIdx + 1}`,
                                );
                                const optionMinutes = toFiniteNumber(
                                  option?.estimatedTravelMinutes ?? option?.EstimatedTravelMinutes,
                                );
                                const optionCost = pickBestMoney(
                                  option?.costForGroup,
                                  option?.CostForGroup,
                                  option?.estimatedTotalCost,
                                  option?.EstimatedTotalCost,
                                );
                                const optionRecommended = Boolean(option?.recommended ?? option?.Recommended);
                                const optionRouteText = getTransportOptionRouteText(option);

                                return (
                                  <div
                                    key={`${idx}-transport-option-${optionIdx}`}
                                    className={`${styles.transportOptionItem} ${styles.transportOptionItemClickable} ${optionRecommended ? styles.transportOptionItemSelected : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      if (!isDayUpdating) {
                                        handleSelectTransportOption(dayIdx, idx, optionIdx);
                                      }
                                    }}
                                    onKeyDown={(event) => {
                                      if (isDayUpdating) return;
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleSelectTransportOption(dayIdx, idx, optionIdx);
                                      }
                                    }}
                                  >
                                    <div className={styles.transportOptionMain}>
                                      <span className={styles.transportOptionName}>{optionMethod}</span>
                                      {optionRecommended && (
                                        <span className={styles.transportOptionRecommended}>Recommended</span>
                                      )}
                                    </div>
                                    {optionRouteText && (
                                      <div className={styles.transportOptionRoute}>{optionRouteText}</div>
                                    )}
                                    <div className={styles.transportOptionMeta}>
                                      {optionMinutes != null && optionMinutes > 0 ? formatMinutesAsHourMinute(optionMinutes) : 'N/A'}
                                      {optionCost ? ` • ${formatMoney(optionCost)}` : ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {isTravel && !showTransportOptionItems && transportOptions.length > 0 && (
                          <div className={styles.collapsedHint}>
                            <span>Transport options hidden ({transportOptions.length})</span>
                            <Button
                              type="link"
                              size="small"
                              disabled={isDayUpdating}
                              style={{ padding: 0, height: 'auto', fontSize: 11 }}
                              onClick={() => setShowTransportOptionItems(true)}
                            >
                              Show
                            </Button>
                          </div>
                        )}

                        {/* Tags */}
                        {displayTags.length > 0 && (
                          <div className={styles.timelineTags}>
                            {displayTags.map((tagLabel, tagIdx) => (
                              <Tag key={`${idx}-tag-${tagIdx}`} color="blue" style={{ fontSize: 11 }}>
                                {tagLabel}
                              </Tag>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className={styles.timelineActions}>
                          {locationId && !isTravel && (
                            <Button
                              type="link"
                              size="small"
                              disabled={isDayUpdating}
                              style={{ padding: 0, height: 'auto', fontSize: 12 }}
                              onClick={() => handleViewLocation(locationId)}
                            >
                              View Details
                            </Button>
                          )}
                          {canAddBetweenMain && (
                            <Button
                              type="link"
                              size="small"
                              disabled={isDayUpdating}
                              style={{ padding: 0, height: 'auto', fontSize: 12 }}
                              onClick={() => handleOpenAddBetweenPicker(dayIdx, idx, currentProvinceId)}
                            >
                              Add Between Main Points
                            </Button>
                          )}
                          {canRemoveLocation && (
                            <Popconfirm
                              title="Remove this location?"
                              description="Timeline and travel estimate will be recalculated."
                              okText="Remove"
                              cancelText="Cancel"
                              onConfirm={() => handleRemoveLocation(dayIdx, idx)}
                            >
                              <Button
                                type="link"
                                size="small"
                                danger
                                disabled={isDayUpdating}
                                style={{ padding: 0, height: 'auto', fontSize: 12 }}
                              >
                                Remove
                              </Button>
                            </Popconfirm>
                          )}
                        </div>

                        {showAlternativeItems && alternatives.length > 0 && (
                          <>
                            <div className={styles.inlineToggleRow}>
                              <span className={styles.inlineToggleLabel}>Alternative options ({alternatives.length})</span>
                              <Button
                                type="link"
                                size="small"
                                disabled={isDayUpdating}
                                style={{ padding: 0, height: 'auto', fontSize: 11 }}
                                onClick={() => setShowAlternativeItems(false)}
                              >
                                Hide
                              </Button>
                            </div>
                            <div className={styles.alternativeList}>
                              {alternatives.map((alternative, altIdx) => {
                              const altLocationId = alternative.locationId || alternative.LocationId;
                              const altLocationIdNum = Number(altLocationId);
                              const fallbackAltName = Number.isFinite(altLocationIdNum)
                                ? locationNameById.get(altLocationIdNum)
                                : '';
                              const altName = alternative.locationName || alternative.LocationName || fallbackAltName || `Location ${altIdx + 1}`;
                              const altScore = alternative.score ?? alternative.Score;
                              const altScoreLabel = formatScoreLabel(altScore);
                              const altTelephone = pickFirstText(
                                alternative.telephone,
                                alternative.Telephone,
                                Number.isFinite(altLocationIdNum) ? locationTelephoneById.get(altLocationIdNum) : '',
                              );
                              const altAmenitiesFromAlternative = extractAmenityNames(
                                alternative.amenityNames
                                || alternative.AmenityNames
                                || alternative.amenities
                                || alternative.Amenities
                                || []
                              );
                              const altAmenitiesFallback = Number.isFinite(altLocationIdNum)
                                ? (locationAmenitiesById.get(altLocationIdNum) || [])
                                : [];
                              const altAmenities = (altAmenitiesFromAlternative.length > 0
                                ? altAmenitiesFromAlternative
                                : altAmenitiesFallback).slice(0, 5);
                              const altMediaUrls = (() => {
                                const fromAlternative = extractMediaUrls(
                                  alternative.mediaUrls
                                  || alternative.MediaUrls
                                  || alternative.images
                                  || alternative.Images
                                  || alternative.medias
                                  || alternative.Medias
                                  || []
                                );
                                if (fromAlternative.length > 0) return fromAlternative;
                                if (Number.isFinite(altLocationIdNum)) {
                                  return locationMediaById.get(altLocationIdNum) || [];
                                }
                                return [];
                              })();

                                return (
                                  <div
                                    key={`${idx}-alt-${altLocationId || altIdx}`}
                                    className={styles.alternativeItem}
                                  >
                                  <div className={styles.alternativeMain}>
                                    <span className={styles.alternativeName}>{altName}</span>
                                  </div>
                                  {altTelephone && (
                                    <div className={styles.timelineTelephone}>Phone: {altTelephone}</div>
                                  )}
                                  {altAmenities.length > 0 && (
                                    <div className={styles.timelineAmenities}>
                                      {altAmenities.map((amenity, amenityIdx) => (
                                        <Tag
                                          key={`${idx}-alt-${altLocationId || altIdx}-amenity-${amenityIdx}`}
                                          color="green"
                                          style={{ fontSize: 11 }}
                                        >
                                          {amenity}
                                        </Tag>
                                      ))}
                                    </div>
                                  )}
                                  {altMediaUrls.length > 0 && (
                                    <div className={styles.timelineMedia}>
                                      {altMediaUrls.slice(0, 3).map((url, mediaIdx) => (
                                        <a
                                          key={`${idx}-alt-${altLocationId || altIdx}-media-${mediaIdx}`}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={styles.timelineMediaLink}
                                        >
                                          <img
                                            src={url}
                                            alt={`${altName} ${mediaIdx + 1}`}
                                            className={styles.timelineMediaImage}
                                            loading="lazy"
                                          />
                                        </a>
                                      ))}
                                      {altMediaUrls.length > 3 && (
                                        <span className={styles.timelineMediaMore}>+{altMediaUrls.length - 3} more</span>
                                      )}
                                    </div>
                                  )}
                                  <div className={styles.alternativeActions}>
                                    {altScoreLabel && (
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        Score: {altScoreLabel}
                                      </Text>
                                    )}
                                    {altLocationId && (
                                      <Button
                                        type="link"
                                        size="small"
                                        disabled={isDayUpdating}
                                        style={{ padding: 0, height: 'auto', fontSize: 11 }}
                                        onClick={() => handleReplaceAlternative(dayIdx, idx, alternative, eventType)}
                                      >
                                        Replace Main
                                      </Button>
                                    )}
                                    {altLocationId && (
                                      <Button
                                        type="link"
                                        size="small"
                                        disabled={isDayUpdating}
                                        style={{ padding: 0, height: 'auto', fontSize: 11 }}
                                        onClick={() => handleViewLocation(altLocationId)}
                                      >
                                        View
                                      </Button>
                                    )}
                                  </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {!showAlternativeItems && alternatives.length > 0 && (
                          <div className={styles.collapsedHint}>
                            <span>Alternative options hidden ({alternatives.length})</span>
                            <Button
                              type="link"
                              size="small"
                              disabled={isDayUpdating}
                              style={{ padding: 0, height: 'auto', fontSize: 11 }}
                              onClick={() => setShowAlternativeItems(true)}
                            >
                              Show
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className={styles.timelineCost}>
                        {travelCostForGroup ? (
                          <div className={styles.costAmount}>{formatMoney(travelCostForGroup)}</div>
                        ) : ticketCost && (ticketCost.amount || ticketCost.Amount) > 0 ? (
                          <div className={styles.costAmount}>{formatMoney(ticketCost)}</div>
                        ) : isTravel ? (
                          <div className={styles.costUnknown}>N/A</div>
                        ) : (
                          <div className={styles.costFree}>Free</div>
                        )}
                        <div className={styles.timelineDuration}>
                          {getDurationStr(startTime, endTime)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Accommodation Recommendations */}
              {accommodations.length > 0 && (
                <div className={styles.accommodationSection}>
                  <div className={styles.accommodationTitle}>Accommodation Suggestions</div>
                  {accommodations.map((acc, i) => {
                    const name = acc.englishName || acc.EnglishName || acc.name || acc.Name || acc.hotelName || acc.HotelName || 'Hotel';
                    const price = acc.pricePerNight || acc.PricePerNight || acc.estimatedCost || acc.EstimatedCost;
                    const accommodationAmenities = extractAmenityNames(
                      acc.amenities
                      || acc.Amenities
                      || acc.amenityNames
                      || acc.AmenityNames
                      || []
                    ).slice(0, 5);
                    return (
                      <div key={i} className={styles.accommodationItemWrap}>
                        <div className={styles.accommodationItem}>
                          <span>{name}</span>
                          <Space>
                            {price && <Text strong>{formatMoney(price)}/night</Text>}
                            <Button
                              type="link"
                              size="small"
                              onClick={() => handleViewAccommodation(acc)}
                            >
                              Details
                            </Button>
                          </Space>
                        </div>
                        {accommodationAmenities.length > 0 && (
                          <div className={styles.accommodationAmenities}>
                            {accommodationAmenities.map((amenity, amenityIdx) => (
                              <Tag key={`${i}-acc-amenity-${amenityIdx}`} color="green" style={{ fontSize: 11 }}>
                                {amenity}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Day Summary */}
              <div className={styles.daySummary}>
                <div className={styles.daySummaryItem}>
                  <Text type="secondary">Estimated Cost:</Text>
                  <Text strong>{formatMoney(estimatedCost) || `0 ${itineraryCurrencyCode}`}</Text>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Action Bar */}
        <div className={styles.actionBar}>
          <Button onClick={handleRegenerate}>
            Regenerate
          </Button>
          <Button onClick={() => navigate('/create-trip')}>
            Edit
          </Button>
        </div>
      </div>

      <Modal
        title="Add Location Between Two Main Points"
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
  );
};

export default ItineraryResultPage;
