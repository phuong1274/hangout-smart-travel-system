import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EnvironmentOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PATHS } from '@/routes/paths';
import {
  estimateLocalTravelApi,
  getLocationTypesApi,
  getLocationsByProvinceApi,
  getProvincesApi,
  getTransportModesApi,
  saveTripApi,
  getTripByIdApi,
} from '../api';
import styles from './ManualTripPage.module.css';

const { Title, Text } = Typography;

const DEFAULT_MAP_CENTER_VN = [16.047079, 108.20623];
const DEFAULT_ACTIVITY_DURATION_MINUTES = 90;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createClientId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toNumberOrDefault = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toPositiveIntOrNull = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
};

const toMoneyAmount = (value) => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const amount = Number(value.amount ?? value.Amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const pickFirstText = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const normalizeTransportOptions = (rawOptions, fallbackCurrency = 'VND') => {
  const source = Array.isArray(rawOptions)
    ? rawOptions
    : (Array.isArray(rawOptions?.transportOptions)
      ? rawOptions.transportOptions
      : (Array.isArray(rawOptions?.TransportOptions)
        ? rawOptions.TransportOptions
        : (Array.isArray(rawOptions?.options)
          ? rawOptions.options
          : (Array.isArray(rawOptions?.Options)
            ? rawOptions.Options
            : (Array.isArray(rawOptions?.$values)
              ? rawOptions.$values
              : (Array.isArray(rawOptions?.items)
                ? rawOptions.items
                : (Array.isArray(rawOptions?.Items)
                  ? rawOptions.Items
                  : (Array.isArray(rawOptions?.data)
                    ? rawOptions.data
                    : (Array.isArray(rawOptions?.Data) ? rawOptions.Data : [])))))))));

  return source
    .map((option, index) => {
      const costSource = option?.costForGroup
        ?? option?.CostForGroup
        ?? option?.estimatedTotalCost
        ?? option?.EstimatedTotalCost
        ?? option?.selectedTotalCost
        ?? option?.SelectedTotalCost
        ?? option?.cost
        ?? option?.Cost;

      const method = pickFirstText(
        option?.method,
        option?.Method,
        option?.name,
        option?.Name,
        option?.mode,
        option?.Mode,
        option?.transportMode,
        option?.TransportMode,
        `Option ${index + 1}`,
      );

      const travelMinutes = Math.max(
        0,
        toNumberOrDefault(
          option?.travelMinutes
          ?? option?.TravelMinutes
          ?? option?.estimatedTravelMinutes
          ?? option?.EstimatedTravelMinutes
          ?? option?.travelTimeMinutes
          ?? option?.TravelTimeMinutes
          ?? option?.durationMinutes
          ?? option?.DurationMinutes,
          0,
        ),
      );

      const costAmount = Math.max(
        0,
        toNumberOrDefault(
          option?.costAmount
          ?? option?.CostAmount,
          toMoneyAmount(costSource),
        ),
      );
      const costCurrency = pickFirstText(
        option?.costCurrency,
        option?.CostCurrency,
        costSource?.currency,
        costSource?.Currency,
        fallbackCurrency,
      ) || fallbackCurrency;

      const recommendedValue = option?.recommended
        ?? option?.Recommended
        ?? option?.isRecommended
        ?? option?.IsRecommended;
      const recommended = typeof recommendedValue === 'string'
        ? recommendedValue.trim().toLowerCase() === 'true'
        : Boolean(recommendedValue);

      return {
        method,
        transportModeId: toPositiveIntOrNull(
          option?.transportModeId
          ?? option?.TransportModeId
          ?? option?.selectedTransportModeId
          ?? option?.SelectedTransportModeId
          ?? option?.modeId
          ?? option?.ModeId,
        ),
        travelMinutes,
        costAmount,
        costCurrency,
        recommended,
        note: pickFirstText(option?.note, option?.Note),
        fromTransitHubName: pickFirstText(option?.fromTransitHubName, option?.FromTransitHubName),
        toTransitHubName: pickFirstText(option?.toTransitHubName, option?.ToTransitHubName),
      };
    })
    .filter((option) => option.method || option.travelMinutes > 0 || option.costAmount > 0 || option.note);
};

const getPreferredTransportOptionIndex = (options, travel) => {
  if (!Array.isArray(options) || options.length === 0) return null;

  if (travel?.isCustomTransport) {
    return null;
  }

  const indexFromDraft = Number(travel?.selectedOptionIndex);
  if (Number.isInteger(indexFromDraft) && indexFromDraft >= 0 && indexFromDraft < options.length) {
    return indexFromDraft;
  }

  const modeId = toPositiveIntOrNull(travel?.transportModeId);
  if (modeId) {
    const byMode = options.findIndex((option) => toPositiveIntOrNull(option.transportModeId) === modeId);
    if (byMode >= 0) return byMode;
  }

  const modeName = String(travel?.transportModeName || '').trim().toLowerCase();
  if (modeName) {
    const byName = options.findIndex((option) => String(option.method || '').trim().toLowerCase() === modeName);
    if (byName >= 0) return byName;
  }

  const recommendedIndex = options.findIndex((option) => option.recommended);
  return recommendedIndex >= 0 ? recommendedIndex : 0;
};

const getActivityDisplayName = (activity, fallbackText = 'Location') => {
  return pickFirstText(
    activity?.destinationName,
    activity?.title,
    activity?.customLocation?.name,
    fallbackText,
  ) || fallbackText;
};

const normalizeTimeOnly = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  return null;
};

const toInputTimeValue = (value, fallback = '08:00') => {
  const normalized = normalizeTimeOnly(value);
  if (!normalized) return fallback;
  return normalized.slice(0, 5);
};

const toMinutesOfDay = (timeStr) => {
  const normalized = normalizeTimeOnly(timeStr);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return ((hours * 60) + minutes + 1440) % 1440;
};

const toTimeOnlyString = (minutesOfDay) => {
  const normalized = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minutes = String(normalized % 60).padStart(2, '0');
  return `${hours}:${minutes}:00`;
};

const addMinutesToTime = (timeStr, minutesToAdd) => {
  const baseMinutes = toMinutesOfDay(timeStr);
  const safeBase = baseMinutes == null ? 8 * 60 : baseMinutes;
  return toTimeOnlyString(safeBase + Math.max(0, Math.round(minutesToAdd || 0)));
};

const durationBetweenTimes = (startTime, endTime) => {
  const start = toMinutesOfDay(startTime);
  const end = toMinutesOfDay(endTime);
  if (start == null || end == null) return DEFAULT_ACTIVITY_DURATION_MINUTES;

  const diff = (end - start + 1440) % 1440;
  return diff > 0 ? diff : DEFAULT_ACTIVITY_DURATION_MINUTES;
};

const formatMoney = (amount, currencyCode = 'VND') => {
  return `${Math.round(Math.max(0, toNumberOrDefault(amount, 0))).toLocaleString('vi-VN')} ${currencyCode}`;
};

const formatMinutes = (minutes) => {
  const safe = Math.max(0, Math.round(toNumberOrDefault(minutes, 0)));
  const hourPart = Math.floor(safe / 60);
  const minutePart = safe % 60;
  return hourPart > 0 ? `${hourPart}h ${minutePart}m` : `${minutePart}m`;
};

const toIsoDateString = (value) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return dayjs().format('YYYY-MM-DD');
  return parsed.format('YYYY-MM-DD');
};

const createDefaultDay = ({ date, index }) => ({
  id: createClientId('day'),
  date,
  dayTitle: `Day ${index + 1}`,
  activities: [],
});

const toTransportEndpointPayload = (activity, fallbackName) => {
  const locationId = toPositiveIntOrNull(activity?.locationId);
  if (locationId) {
    return {
      locationId,
      customTransitHub: null,
    };
  }

  const custom = activity?.customLocation;
  const latitude = toFiniteNumber(custom?.latitude);
  const longitude = toFiniteNumber(custom?.longitude);
  if (latitude == null || longitude == null) {
    return {
      locationId: null,
      customTransitHub: null,
    };
  }

  return {
    locationId: null,
    customTransitHub: {
      name: String(custom?.name || activity?.destinationName || fallbackName || 'Custom point').trim() || 'Custom point',
      latitude,
      longitude,
      address: String(custom?.address || activity?.address || '').trim() || null,
    },
  };
};

const normalizeTripInfo = (raw) => {
  if (!raw) return null;

  const startDate = raw.startDate || raw.StartDate || null;
  const endDate = raw.endDate || raw.EndDate || null;
  const totalBudget = toFiniteNumber(
    raw.totalBudget
    ?? raw.TotalBudget
    ?? raw.budgetSummary?.totalBudget
    ?? raw.budgetSummary?.TotalBudget
    ?? raw.BudgetSummary?.totalBudget
    ?? raw.BudgetSummary?.TotalBudget,
  );

  return {
    id: raw.id || raw.Id || null,
    tripName: String(raw.tripName || raw.TripName || 'Untitled Trip').trim(),
    description: String(raw.description || raw.Description || '').trim(),
    startDate: startDate ? dayjs(startDate).format('YYYY-MM-DD') : null,
    endDate: endDate ? dayjs(endDate).format('YYYY-MM-DD') : null,
    groupSize: Math.max(1, Math.round(toNumberOrDefault(raw.groupSize || raw.GroupSize, 1))),
    currencyCode: String(raw.currency || raw.currencyCode || raw.Currency || raw.CurrencyCode || 'VND').trim() || 'VND',
    totalBudget: totalBudget != null && totalBudget >= 0 ? totalBudget : null,
  };
};

const normalizeDraftDays = (rawDays) => {
  if (!Array.isArray(rawDays) || rawDays.length === 0) return [];

  return rawDays.map((day, dayIndex) => ({
    id: day.id || createClientId(`day-${dayIndex}`),
    date: day.date ? dayjs(day.date).format('YYYY-MM-DD') : dayjs().add(dayIndex, 'day').format('YYYY-MM-DD'),
    dayTitle: String(day.dayTitle || `Day ${dayIndex + 1}`).trim(),
    activities: Array.isArray(day.activities)
      ? day.activities.map((activity, activityIndex) => {
          const customLocation = activity.customLocation || activity.CustomLocation || null;
          const normalizedCustom = customLocation
            ? {
                name: String(customLocation.name || customLocation.Name || activity.destinationName || '').trim(),
                latitude: toFiniteNumber(customLocation.latitude ?? customLocation.Latitude),
                longitude: toFiniteNumber(customLocation.longitude ?? customLocation.Longitude),
                address: String(customLocation.address || customLocation.Address || activity.address || '').trim(),
              }
            : null;

          const travel = activity.travelFromPrevious || activity.TravelFromPrevious || null;

          return {
            id: activity.id || createClientId(`activity-${dayIndex}-${activityIndex}`),
            sourceType: activity.sourceType || (normalizedCustom ? 'custom' : 'existing'),
            locationId: toFiniteNumber(activity.locationId ?? activity.LocationId) || null,
            locationTypeId: toFiniteNumber(activity.locationTypeId ?? activity.LocationTypeId) || null,
            destinationName: String(activity.destinationName || activity.locationName || activity.LocationName || activity.title || '').trim(),
            title: String(activity.title || '').trim(),
            address: String(activity.address || activity.Address || normalizedCustom?.address || '').trim(),
            startTime: normalizeTimeOnly(activity.startTime || activity.StartTime),
            endTime: normalizeTimeOnly(activity.endTime || activity.EndTime),
            customLocation: normalizedCustom,
            travelFromPrevious: travel
              ? {
                  distanceKm: Math.max(0, toNumberOrDefault(travel.distanceKm ?? travel.DistanceKm, 0)),
                  travelMinutes: Math.max(0, toNumberOrDefault(travel.travelMinutes ?? travel.TravelMinutes, 0)),
                  costAmount: Math.max(0, toNumberOrDefault(travel.costAmount ?? travel.CostAmount, 0)),
                  costCurrency: String(travel.costCurrency || travel.CostCurrency || 'VND').trim() || 'VND',
                  transportModeId: toPositiveIntOrNull(travel.transportModeId ?? travel.TransportModeId),
                  transportModeName: String(travel.transportModeName || travel.TransportModeName || travel.selectedMethod || travel.SelectedMethod || travel.mode || travel.Mode || '').trim() || null,
                  departureTime: normalizeTimeOnly(travel.departureTime || travel.DepartureTime),
                  arrivalTime: normalizeTimeOnly(travel.arrivalTime || travel.ArrivalTime),
                  fromName: String(travel.fromName || travel.FromName || '').trim() || null,
                  toName: String(travel.toName || travel.ToName || '').trim() || null,
                  selectedOptionIndex: Number.isInteger(Number(travel.selectedOptionIndex))
                    ? Number(travel.selectedOptionIndex)
                    : null,
                  manualCostOverride: Boolean(travel.manualCostOverride),
                  isCustomTransport: Boolean(travel.isCustomTransport),
                  transportOptions: normalizeTransportOptions(
                    travel.transportOptions || travel.TransportOptions || [],
                    String(travel.costCurrency || travel.CostCurrency || 'VND').trim() || 'VND',
                  ),
                }
              : null,
            estimatedCost: Math.max(0, toNumberOrDefault(activity.estimatedCost, 0)),
          };
        })
      : [],
  }));
};

const getDraftStorageKey = (tripId) => `manual-trip-draft-${tripId}`;

const loadDraftFromStorage = (tripId) => {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const saveDraftToStorage = (tripId, payload) => {
  try {
    localStorage.setItem(getDraftStorageKey(tripId), JSON.stringify(payload));
  } catch {
  }
};

const clearDraftStorage = (tripId) => {
  try {
    localStorage.removeItem(getDraftStorageKey(tripId));
  } catch {
  }
};

const getActivityEndpointForEstimate = (activity, side) => {
  const activityLocationId = toFiniteNumber(activity?.locationId);
  if (activityLocationId && activityLocationId > 0) {
    return side === 'from' ? { fromLocationId: activityLocationId } : { toLocationId: activityLocationId };
  }

  const custom = activity?.customLocation;
  const latitude = toFiniteNumber(custom?.latitude);
  const longitude = toFiniteNumber(custom?.longitude);
  if (latitude == null || longitude == null) return {};

  return side === 'from'
    ? { fromLat: latitude, fromLng: longitude }
    : { toLat: latitude, toLng: longitude };
};

const CustomLocationMapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(event) {
      onPick(event?.latlng?.lat, event?.latlng?.lng);
    },
  });
  return null;
};

const CustomLocationMapInvalidate = ({ activeKey }) => {
  const map = useMap();

  useEffect(() => {
    const timers = [120, 300, 520].map((delay) => setTimeout(() => map.invalidateSize(), delay));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [activeKey, map]);

  return null;
};

const ManualTripPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loadingTrip, setLoadingTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [manualTotalBudget, setManualTotalBudget] = useState(null);
  const [manualDays, setManualDays] = useState([]);
  const [transportOptionsBackfilled, setTransportOptionsBackfilled] = useState(false);

  const [locationTypes, setLocationTypes] = useState([]);
  const [loadingLocationTypes, setLoadingLocationTypes] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [transportModes, setTransportModes] = useState([]);
  const [, setLoadingTransportModes] = useState(false);

  const [addLocationModal, setAddLocationModal] = useState({ open: false, dayId: null });
  const [addingLocation, setAddingLocation] = useState(false);
  const [loadingExistingLocations, setLoadingExistingLocations] = useState(false);
  const [existingLocations, setExistingLocations] = useState([]);
  const [existingLocationSearch, setExistingLocationSearch] = useState('');

  const [existingLocationTypeId, setExistingLocationTypeId] = useState(null);
  const [existingProvinceId, setExistingProvinceId] = useState(null);
  const [existingLocationId, setExistingLocationId] = useState(null);
  const [existingStartTime, setExistingStartTime] = useState('08:00');
  const [existingEndTime, setExistingEndTime] = useState('09:30');
  const [existingBudget, setExistingBudget] = useState(null);

  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState(null);
  const [customLng, setCustomLng] = useState(null);
  const [customStartTime, setCustomStartTime] = useState('08:00');
  const [customEndTime, setCustomEndTime] = useState('09:30');
  const [customBudget, setCustomBudget] = useState(null);

  const customLatValue = toFiniteNumber(customLat);
  const customLngValue = toFiniteNumber(customLng);
  const hasCustomCoordinates = customLatValue != null
    && customLngValue != null
    && customLatValue >= -90
    && customLatValue <= 90
    && customLngValue >= -180
    && customLngValue <= 180;
  const customMapCenter = hasCustomCoordinates ? [customLatValue, customLngValue] : DEFAULT_MAP_CENTER_VN;
  const customMapActiveKey = `${addLocationModal.open ? 'open' : 'closed'}-${addLocationModal.dayId || 'x'}-${hasCustomCoordinates ? 'picked' : 'empty'}`;

  useEffect(() => {
    const queryTripId = Number(searchParams.get('tripId'));
    const stateTripId = Number(location?.state?.tripId);
    const resolvedTripId = Number.isFinite(queryTripId) && queryTripId > 0
      ? queryTripId
      : (Number.isFinite(stateTripId) && stateTripId > 0 ? stateTripId : 0);

    setTripId(resolvedTripId > 0 ? resolvedTripId : null);
    setTransportOptionsBackfilled(false);
  }, [location?.state?.tripId, searchParams]);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const hydrate = async () => {
      setLoadingTrip(true);

      const stateTripInfo = normalizeTripInfo(location?.state?.tripInfo);
      const draft = loadDraftFromStorage(tripId);
      const draftTripInfo = normalizeTripInfo(draft?.tripInfo);
      const draftBudget = toFiniteNumber(draft?.totalBudget);

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
        setManualTotalBudget(
          draftBudget != null && draftBudget >= 0
            ? draftBudget
            : (resolvedTripInfo?.totalBudget != null && resolvedTripInfo.totalBudget >= 0 ? resolvedTripInfo.totalBudget : null),
        );
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
      totalBudget: manualTotalBudget,
      days: manualDays,
      updatedAt: new Date().toISOString(),
    });
  }, [tripId, tripInfo, manualTotalBudget, manualDays]);

  useEffect(() => {
    let mounted = true;

    const loadTypes = async () => {
      setLoadingLocationTypes(true);
      try {
        const response = await getLocationTypesApi();
        const items = Array.isArray(response) ? response : response?.items || response?.Items || [];
        if (!mounted) return;

        const next = items
          .map((item) => {
            const id = Number(item?.id ?? item?.Id);
            if (!Number.isFinite(id) || id <= 0) return null;
            const name = String(item?.name || item?.Name || item?.englishName || item?.EnglishName || `Location Type #${id}`).trim();
            return { id, name };
          })
          .filter(Boolean);

        setLocationTypes(next);
      } catch {
        if (mounted) {
          setLocationTypes([]);
        }
      } finally {
        if (mounted) {
          setLoadingLocationTypes(false);
        }
      }
    };

    loadTypes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTransportModes = async () => {
      setLoadingTransportModes(true);
      try {
        const response = await getTransportModesApi({ pageIndex: 1, pageSize: 500 });
        const items = Array.isArray(response)
          ? response
          : response?.items || response?.Items || response?.data || response?.Data || [];

        if (!mounted) return;

        const next = items
          .map((item) => {
            const id = toPositiveIntOrNull(item?.id ?? item?.Id);
            if (!id) return null;
            const name = String(item?.name || item?.Name || item?.method || item?.Method || `Mode #${id}`).trim();
            return { id, name };
          })
          .filter(Boolean);

        setTransportModes(next);
      } catch {
        if (mounted) {
          setTransportModes([]);
        }
      } finally {
        if (mounted) {
          setLoadingTransportModes(false);
        }
      }
    };

    loadTransportModes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAllProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const response = await getProvincesApi();
        const items = Array.isArray(response) ? response : response?.items || response?.Items || [];
        if (!mounted) return;

        const next = items
          .map((item) => {
            const id = Number(item?.id ?? item?.Id);
            if (!Number.isFinite(id) || id <= 0) return null;

            const englishName = String(item?.englishName || item?.EnglishName || '').trim();
            const localName = String(item?.name || item?.Name || '').trim();
            return {
              id,
              name: englishName || localName || `Province #${id}`,
            };
          })
          .filter(Boolean);

        setProvinces(next);
      } catch {
        if (mounted) {
          setProvinces([]);
        }
      } finally {
        if (mounted) {
          setLoadingProvinces(false);
        }
      }
    };

    loadAllProvinces();

    return () => {
      mounted = false;
    };
  }, []);

  const totalActivityEstimated = useMemo(() => {
    return manualDays.reduce((sum, day) => {
      const dayCost = (day.activities || []).reduce(
        (daySum, activity) => daySum + Math.max(0, toNumberOrDefault(activity.estimatedCost, 0)),
        0,
      );
      return sum + dayCost;
    }, 0);
  }, [manualDays]);

  const totalTransportEstimated = useMemo(() => {
    return manualDays.reduce((sum, day) => {
      const dayTransport = (day.activities || []).reduce(
        (daySum, activity) => daySum + Math.max(0, toNumberOrDefault(activity.travelFromPrevious?.costAmount, 0)),
        0,
      );
      return sum + dayTransport;
    }, 0);
  }, [manualDays]);

  const totalEstimated = useMemo(
    () => Math.max(0, totalActivityEstimated + totalTransportEstimated),
    [totalActivityEstimated, totalTransportEstimated],
  );

  const transportModeNameById = useMemo(() => {
    const map = new Map();
    transportModes.forEach((mode) => {
      map.set(mode.id, mode.name);
    });
    return map;
  }, [transportModes]);

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
    setManualDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, [field]: value } : day)));
  };

  const updateActivityField = (dayId, activityId, updater) => {
    setManualDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        activities: (day.activities || []).map((activity) => {
          if (activity.id !== activityId) return activity;
          return updater(activity);
        }),
      };
    }));
  };

  const updateActivityBudget = (dayId, activityId, value) => {
    const normalizedBudget = value == null ? 0 : Math.max(0, toNumberOrDefault(value, 0));
    updateActivityField(dayId, activityId, (activity) => ({
      ...activity,
      estimatedCost: normalizedBudget,
    }));
  };

  const selectActivityTransportOption = (dayId, activityId, optionIndex) => {
    setManualDays((prev) => prev.map((day) => {
      if (day.id !== dayId) return day;

      const activities = Array.isArray(day.activities) ? [...day.activities] : [];
      const currentIndex = activities.findIndex((activity) => activity.id === activityId);
      if (currentIndex <= 0) return day;

      const previousActivity = activities[currentIndex - 1];
      const currentActivity = activities[currentIndex];
      const travel = currentActivity?.travelFromPrevious;
      const options = normalizeTransportOptions(
        travel?.transportOptions ?? travel?.TransportOptions,
        tripInfo?.currencyCode || 'VND',
      );
      const selectedOption = options[optionIndex];
      if (!travel || !selectedOption) return day;

      const preservedVisitDuration = durationBetweenTimes(currentActivity.startTime, currentActivity.endTime);
      const departureTime = normalizeTimeOnly(travel.departureTime)
        || normalizeTimeOnly(previousActivity?.endTime)
        || '08:00:00';
      const nextTravelMinutes = Math.max(
        1,
        toNumberOrDefault(selectedOption.travelMinutes, toNumberOrDefault(travel.travelMinutes, 1)),
      );
      const arrivalTime = addMinutesToTime(departureTime, nextTravelMinutes);

      activities[currentIndex] = {
        ...currentActivity,
        startTime: arrivalTime,
        endTime: addMinutesToTime(arrivalTime, preservedVisitDuration),
        travelFromPrevious: {
          ...travel,
          selectedOptionIndex: optionIndex,
          travelMinutes: nextTravelMinutes,
          costAmount: Math.max(0, toNumberOrDefault(selectedOption.costAmount, travel.costAmount)),
          costCurrency: String(selectedOption.costCurrency || travel.costCurrency || tripInfo?.currencyCode || 'VND').trim() || 'VND',
          transportModeId: toPositiveIntOrNull(selectedOption.transportModeId) || toPositiveIntOrNull(travel.transportModeId),
          transportModeName: String(
            selectedOption.method
            || (toPositiveIntOrNull(selectedOption.transportModeId)
              ? transportModeNameById.get(toPositiveIntOrNull(selectedOption.transportModeId))
              : '')
            || travel.transportModeName
            || '',
          ).trim() || null,
          departureTime,
          arrivalTime,
          manualCostOverride: false,
          isCustomTransport: false,
          fromName: getActivityDisplayName(previousActivity, 'Previous Location'),
          toName: getActivityDisplayName(currentActivity, 'Next Location'),
        },
      };

      return {
        ...day,
        activities,
      };
    }));
  };

  const selectCustomTransportOption = (dayId, activityId) => {
    updateActivityField(dayId, activityId, (activity) => {
      const travel = activity?.travelFromPrevious;
      if (!travel) return activity;
      return {
        ...activity,
        travelFromPrevious: {
          ...travel,
          selectedOptionIndex: null,
          transportModeId: null,
          transportModeName: String(travel.transportModeName || '').trim() || 'Custom',
          manualCostOverride: true,
          isCustomTransport: true,
        },
      };
    });
  };

  const updateCustomTransportInput = (dayId, activityId, patch) => {
    updateActivityField(dayId, activityId, (activity) => {
      const travel = activity?.travelFromPrevious;
      if (!travel) return activity;

      const nextMethod = patch?.method != null
        ? String(patch.method)
        : String(travel.transportModeName || '');
      const nextCost = patch?.cost != null
        ? Math.max(0, toNumberOrDefault(patch.cost, 0))
        : Math.max(0, toNumberOrDefault(travel.costAmount, 0));

      return {
        ...activity,
        travelFromPrevious: {
          ...travel,
          selectedOptionIndex: null,
          transportModeId: null,
          transportModeName: nextMethod,
          costAmount: nextCost,
          manualCostOverride: true,
          isCustomTransport: true,
        },
      };
    });
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

  const resetAddLocationModal = useCallback(() => {
    setExistingLocationTypeId(null);
    setExistingProvinceId(null);
    setExistingLocationId(null);
    setExistingLocations([]);
    setExistingLocationSearch('');
    setExistingStartTime('08:00');
    setExistingEndTime('09:30');
    setExistingBudget(null);

    setCustomName('');
    setCustomAddress('');
    setCustomLat(null);
    setCustomLng(null);
    setCustomStartTime('08:00');
    setCustomEndTime('09:30');
    setCustomBudget(null);
  }, []);

  const openAddLocationModal = (dayId) => {
    const targetDay = manualDays.find((day) => day.id === dayId);
    const lastActivity = targetDay?.activities?.[targetDay.activities.length - 1];

    const nextStart = toInputTimeValue(lastActivity?.endTime, '08:00');
    const nextEnd = toInputTimeValue(addMinutesToTime(`${nextStart}:00`, DEFAULT_ACTIVITY_DURATION_MINUTES), '09:30');

    resetAddLocationModal();
    setExistingStartTime(nextStart);
    setExistingEndTime(nextEnd);
    setCustomStartTime(nextStart);
    setCustomEndTime(nextEnd);

    setAddLocationModal({ open: true, dayId });
  };

  const closeAddLocationModal = () => {
    setAddLocationModal({ open: false, dayId: null });
    resetAddLocationModal();
  };

  const loadExistingLocations = useCallback(async (provinceId, locationTypeId, searchTerm = '') => {
    const normalizedProvinceId = Number(provinceId);
    const normalizedTypeId = Number(locationTypeId);

    if (!Number.isFinite(normalizedProvinceId) || normalizedProvinceId <= 0) {
      setExistingLocations([]);
      return;
    }

    if (!Number.isFinite(normalizedTypeId) || normalizedTypeId <= 0) {
      setExistingLocations([]);
      return;
    }

    setLoadingExistingLocations(true);
    try {
      const response = await getLocationsByProvinceApi({
        provinceId: normalizedProvinceId,
        locationTypeId: normalizedTypeId,
        searchTerm: searchTerm || undefined,
        pageSize: 300,
      });

      const items = Array.isArray(response?.items) ? response.items : [];
      const options = items
        .map((item) => {
          const id = Number(item?.id ?? item?.Id);
          if (!Number.isFinite(id) || id <= 0) return null;

          const englishName = String(item?.englishName || item?.EnglishName || '').trim();
          const localName = String(item?.name || item?.Name || '').trim();
          const address = String(item?.address || item?.Address || '').trim();

          return {
            id,
            name: englishName || localName || `Location #${id}`,
            address,
            latitude: toFiniteNumber(item?.latitude ?? item?.Latitude),
            longitude: toFiniteNumber(item?.longitude ?? item?.Longitude),
          };
        })
        .filter(Boolean);

      setExistingLocations(options);
    } catch {
      setExistingLocations([]);
      message.error('Cannot load existing locations.');
    } finally {
      setLoadingExistingLocations(false);
    }
  }, []);

  const recalculateDayTravelAndEstimate = useCallback(async (activities) => {
    if (!tripInfo) return activities;

    const normalized = activities.map((activity, index) => {
      if (index === 0) {
        return {
          ...activity,
          travelFromPrevious: null,
          estimatedCost: Math.max(0, toNumberOrDefault(activity.estimatedCost, 0)),
        };
      }

      return { ...activity };
    });

    for (let index = 1; index < normalized.length; index += 1) {
      const previous = normalized[index - 1];
      const current = normalized[index];
      const fromEndpoint = getActivityEndpointForEstimate(previous, 'from');
      const toEndpoint = getActivityEndpointForEstimate(current, 'to');
      const hasEndpoint = Object.keys({ ...fromEndpoint, ...toEndpoint }).length > 0;
      const previousTravel = current.travelFromPrevious || null;
      const currentBudget = Math.max(0, toNumberOrDefault(current.estimatedCost, 0));

      if (!hasEndpoint) {
        normalized[index] = {
          ...current,
          travelFromPrevious: previousTravel,
          estimatedCost: currentBudget,
        };
        continue;
      }

      try {
        const departureTime = normalizeTimeOnly(previous.endTime) || '08:00:00';
        const travelLeg = await estimateLocalTravelApi({
          ...fromEndpoint,
          ...toEndpoint,
          groupSize: Math.max(1, Math.round(toNumberOrDefault(tripInfo.groupSize, 1))),
          departureTime,
          currencyCode: tripInfo.currencyCode || 'VND',
        });

        const travelMinutesFromLeg = Math.max(
          0,
          toNumberOrDefault(
            travelLeg?.selectedTravelTimeMinutes ?? travelLeg?.SelectedTravelTimeMinutes,
            0,
          ),
        );
        const distanceKm = Math.max(0, toNumberOrDefault(travelLeg?.distanceKm ?? travelLeg?.DistanceKm, 0));
        const travelCostFromLeg = Math.max(
          0,
          toMoneyAmount(travelLeg?.selectedTotalCost ?? travelLeg?.SelectedTotalCost),
        );
        const transportModeIdFromLeg = toPositiveIntOrNull(
          travelLeg?.selectedTransportModeId
          ?? travelLeg?.SelectedTransportModeId
          ?? travelLeg?.transportModeId
          ?? travelLeg?.TransportModeId,
        );

        const normalizedTransportOptions = normalizeTransportOptions(
          travelLeg?.transportOptions
          ?? travelLeg?.TransportOptions
          ?? travelLeg?.options
          ?? travelLeg?.Options,
          tripInfo.currencyCode || 'VND',
        );
        const isCustomTransport = Boolean(previousTravel?.isCustomTransport);
        const selectedOptionIndex = getPreferredTransportOptionIndex(normalizedTransportOptions, previousTravel);
        const selectedOption = selectedOptionIndex != null ? normalizedTransportOptions[selectedOptionIndex] : null;

        const desiredDuration = durationBetweenTimes(current.startTime, current.endTime);
        const resolvedTravelMinutes = Math.max(
          1,
          toNumberOrDefault(selectedOption?.travelMinutes, travelMinutesFromLeg || 1),
        );
        const autoStart = normalizeTimeOnly(travelLeg?.arrivalTime || travelLeg?.ArrivalTime)
          || addMinutesToTime(departureTime, resolvedTravelMinutes > 0 ? resolvedTravelMinutes : 20);
        const autoEnd = addMinutesToTime(autoStart, desiredDuration);

        const hasManualCostOverride = Boolean(previousTravel?.manualCostOverride);
        const optionCost = Math.max(0, toNumberOrDefault(selectedOption?.costAmount, travelCostFromLeg));
        const resolvedCostAmount = hasManualCostOverride && previousTravel?.costAmount != null
          ? Math.max(0, toNumberOrDefault(previousTravel.costAmount, optionCost))
          : optionCost;

        const resolvedTransportModeId = isCustomTransport
          ? null
          : (
            toPositiveIntOrNull(selectedOption?.transportModeId)
            || toPositiveIntOrNull(previousTravel?.transportModeId)
            || transportModeIdFromLeg
          );
        const resolvedTransportModeName = isCustomTransport
          ? (pickFirstText(previousTravel?.transportModeName, 'Custom') || 'Custom')
          : (pickFirstText(
            selectedOption?.method,
            resolvedTransportModeId ? transportModeNameById.get(resolvedTransportModeId) : '',
            previousTravel?.transportModeName,
            travelLeg?.selectedMethod,
            travelLeg?.SelectedMethod,
            travelLeg?.mode,
            travelLeg?.Mode,
          ) || null);
        const resolvedCurrency = pickFirstText(
          selectedOption?.costCurrency,
          previousTravel?.costCurrency,
          tripInfo.currencyCode,
          'VND',
        ) || 'VND';

        normalized[index] = {
          ...current,
          startTime: autoStart,
          endTime: autoEnd,
          travelFromPrevious: {
            distanceKm,
            travelMinutes: resolvedTravelMinutes,
            costAmount: resolvedCostAmount,
            costCurrency: resolvedCurrency,
            transportModeId: resolvedTransportModeId,
            transportModeName: resolvedTransportModeName,
            departureTime,
            arrivalTime: autoStart,
            fromName: getActivityDisplayName(previous, `Location ${index}`),
            toName: getActivityDisplayName(current, `Location ${index + 1}`),
            selectedOptionIndex: isCustomTransport ? null : selectedOptionIndex,
            manualCostOverride: hasManualCostOverride,
            isCustomTransport,
            transportOptions: normalizedTransportOptions,
          },
          estimatedCost: currentBudget,
        };
      } catch {
        normalized[index] = {
          ...current,
          travelFromPrevious: previousTravel,
          estimatedCost: currentBudget,
        };
      }
    }

    return normalized;
  }, [tripInfo, transportModeNameById]);

  const addExistingLocationToDay = async () => {
    if (!addLocationModal.dayId) return;
    if (!Number.isFinite(Number(existingLocationTypeId)) || Number(existingLocationTypeId) <= 0) {
      message.warning('Please select location type.');
      return;
    }
    if (!Number.isFinite(Number(existingProvinceId)) || Number(existingProvinceId) <= 0) {
      message.warning('Please select province.');
      return;
    }
    if (!Number.isFinite(Number(existingLocationId)) || Number(existingLocationId) <= 0) {
      message.warning('Please select location.');
      return;
    }

    const picked = existingLocations.find((item) => item.id === Number(existingLocationId));
    if (!picked) {
      message.warning('Selected location is not available.');
      return;
    }

    const normalizedStart = normalizeTimeOnly(existingStartTime);
    const normalizedEnd = normalizeTimeOnly(existingEndTime);
    if (!normalizedStart || !normalizedEnd) {
      message.warning('Please enter valid start and end time.');
      return;
    }

    const duration = durationBetweenTimes(normalizedStart, normalizedEnd);

    setAddingLocation(true);
    try {
      const dayIndex = manualDays.findIndex((day) => day.id === addLocationModal.dayId);
      if (dayIndex < 0) return;

      const day = manualDays[dayIndex];
      const appended = {
        id: createClientId('activity'),
        sourceType: 'existing',
        locationId: picked.id,
        locationTypeId: Number(existingLocationTypeId),
        destinationName: picked.name,
        title: `Visit ${picked.name}`,
        address: picked.address || '',
        startTime: normalizedStart,
        endTime: addMinutesToTime(normalizedStart, duration),
        customLocation: null,
        travelFromPrevious: null,
        estimatedCost: Math.max(0, toNumberOrDefault(existingBudget, 0)),
      };

      const recalculated = await recalculateDayTravelAndEstimate([...(day.activities || []), appended]);

      setManualDays((prev) => prev.map((item, index) => (
        index === dayIndex ? { ...item, activities: recalculated } : item
      )));

      message.success('Location added. Estimate was recalculated automatically.');
      closeAddLocationModal();
    } catch {
      message.error('Unable to add existing location.');
    } finally {
      setAddingLocation(false);
    }
  };

  const addCustomLocationToDay = async () => {
    if (!addLocationModal.dayId) return;

    const normalizedName = String(customName || '').trim();
    if (!normalizedName) {
      message.warning('Please enter custom location name.');
      return;
    }

    if (!hasCustomCoordinates) {
      message.warning('Please pick custom location on map.');
      return;
    }

    const normalizedStart = normalizeTimeOnly(customStartTime);
    const normalizedEnd = normalizeTimeOnly(customEndTime);
    if (!normalizedStart || !normalizedEnd) {
      message.warning('Please enter valid start and end time.');
      return;
    }

    const duration = durationBetweenTimes(normalizedStart, normalizedEnd);

    setAddingLocation(true);
    try {
      const dayIndex = manualDays.findIndex((day) => day.id === addLocationModal.dayId);
      if (dayIndex < 0) return;

      const day = manualDays[dayIndex];
      const appended = {
        id: createClientId('activity'),
        sourceType: 'custom',
        locationId: null,
        locationTypeId: null,
        destinationName: normalizedName,
        title: `Visit ${normalizedName}`,
        address: String(customAddress || '').trim(),
        startTime: normalizedStart,
        endTime: addMinutesToTime(normalizedStart, duration),
        customLocation: {
          name: normalizedName,
          latitude: customLatValue,
          longitude: customLngValue,
          address: String(customAddress || '').trim(),
        },
        travelFromPrevious: null,
        estimatedCost: Math.max(0, toNumberOrDefault(customBudget, 0)),
      };

      const recalculated = await recalculateDayTravelAndEstimate([...(day.activities || []), appended]);

      setManualDays((prev) => prev.map((item, index) => (
        index === dayIndex ? { ...item, activities: recalculated } : item
      )));

      message.success('Custom location added. Estimate was recalculated automatically.');
      closeAddLocationModal();
    } catch {
      message.error('Unable to add custom location.');
    } finally {
      setAddingLocation(false);
    }
  };

  const removeActivity = async (dayId, activityId) => {
    const dayIndex = manualDays.findIndex((day) => day.id === dayId);
    if (dayIndex < 0) return;

    const day = manualDays[dayIndex];
    const nextActivities = (day.activities || []).filter((activity) => activity.id !== activityId);

    setAddingLocation(true);
    try {
      const recalculated = await recalculateDayTravelAndEstimate(nextActivities);
      setManualDays((prev) => prev.map((item, index) => (
        index === dayIndex ? { ...item, activities: recalculated } : item
      )));
    } catch {
      message.error('Unable to recalculate estimates after removing location.');
    } finally {
      setAddingLocation(false);
    }
  };

  useEffect(() => {
    if (transportOptionsBackfilled || !tripInfo || !Array.isArray(manualDays) || manualDays.length === 0) {
      return;
    }

    const currencyCode = tripInfo.currencyCode || 'VND';
    const daysNeedingBackfill = manualDays
      .map((day, dayIndex) => ({ day, dayIndex }))
      .filter(({ day }) => (day.activities || []).some((activity, activityIndex) => {
        if (activityIndex <= 0 || !activity?.travelFromPrevious) return false;
        const options = normalizeTransportOptions(
          activity?.travelFromPrevious?.transportOptions
          ?? activity?.travelFromPrevious?.TransportOptions,
          currencyCode,
        );
        return options.length === 0;
      }));

    if (daysNeedingBackfill.length === 0) {
      setTransportOptionsBackfilled(true);
      return;
    }

    let cancelled = false;

    const backfill = async () => {
      try {
        const updates = await Promise.all(daysNeedingBackfill.map(async ({ dayIndex, day }) => {
          const nextActivities = await recalculateDayTravelAndEstimate(day.activities || []);
          return { dayIndex, nextActivities };
        }));

        if (cancelled) return;

        setManualDays((prev) => prev.map((day, dayIndex) => {
          const update = updates.find((item) => item.dayIndex === dayIndex);
          if (!update) return day;
          return {
            ...day,
            activities: update.nextActivities,
          };
        }));
      } finally {
        if (!cancelled) {
          setTransportOptionsBackfilled(true);
        }
      }
    };

    backfill();

    return () => {
      cancelled = true;
    };
  }, [manualDays, recalculateDayTravelAndEstimate, transportOptionsBackfilled, tripInfo]);

  const handlePickCustomLocationOnMap = (latitude, longitude) => {
    const safeLat = toFiniteNumber(latitude);
    const safeLng = toFiniteNumber(longitude);
    if (safeLat == null || safeLng == null) return;
    if (safeLat < -90 || safeLat > 90 || safeLng < -180 || safeLng > 180) return;
    setCustomLat(safeLat);
    setCustomLng(safeLng);
  };

  const handleUseCurrentLocationForCustom = () => {
    if (!navigator?.geolocation) {
      message.error('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomLat(position.coords.latitude);
        setCustomLng(position.coords.longitude);
      },
      () => message.error('Unable to get your current location.'),
    );
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
        message.error(`Day ${dayIndex + 1}: please add at least one location.`);
        return;
      }
    }

    const mappedDays = manualDays.map((day, dayIndex) => {
      const sourceActivities = Array.isArray(day.activities) ? day.activities : [];
      const mappedActivities = [];

      sourceActivities.forEach((activity, activityIndex) => {
        const name = String(activity.destinationName || activity.title || '').trim();
        const visitEstimateCost = Math.max(0, Math.round(toNumberOrDefault(activity.estimatedCost, 0)));
        const visitStartTime = normalizeTimeOnly(activity.startTime);
        const visitEndTime = normalizeTimeOnly(activity.endTime);

        if (activityIndex > 0 && activity.travelFromPrevious) {
          const previousActivity = sourceActivities[activityIndex - 1];
          const travelMethodText = String(activity.travelFromPrevious.transportModeName || '').trim();
          const travelMinutes = Math.max(1, Math.round(toNumberOrDefault(activity.travelFromPrevious.travelMinutes, 1)));
          const travelDistanceKm = Math.max(0, toNumberOrDefault(activity.travelFromPrevious.distanceKm, 0));
          const travelCostAmount = Math.max(0, Math.round(toNumberOrDefault(activity.travelFromPrevious.costAmount, 0)));
          const travelStartTime = normalizeTimeOnly(activity.travelFromPrevious.departureTime)
            || normalizeTimeOnly(previousActivity?.endTime)
            || visitStartTime
            || '08:00:00';
          const travelEndTime = normalizeTimeOnly(activity.travelFromPrevious.arrivalTime)
            || visitStartTime
            || addMinutesToTime(travelStartTime, travelMinutes);
          const fromEndpoint = toTransportEndpointPayload(previousActivity, `Start ${activityIndex}`);
          const toEndpoint = toTransportEndpointPayload(activity, name || `Destination ${activityIndex + 1}`);

          mappedActivities.push({
            type: 2,
            title: travelMethodText
              ? `Move to ${name || `Location ${activityIndex + 1}`} by ${travelMethodText}`
              : `Move to ${name || `Location ${activityIndex + 1}`}`,
            startTime: travelStartTime,
            endTime: travelEndTime,
            locationId: null,
            customLocationId: null,
            customLocation: null,
            transport: {
              transportModeId: toPositiveIntOrNull(activity.travelFromPrevious.transportModeId),
              distanceKm: travelDistanceKm,
              travelTimeMinutes: travelMinutes,
              fromLocationId: fromEndpoint.locationId,
              toLocationId: toEndpoint.locationId,
              fromTransitHubId: null,
              toTransitHubId: null,
              customFromTransitHubId: null,
              customToTransitHubId: null,
              customFromTransitHub: fromEndpoint.customTransitHub,
              customToTransitHub: toEndpoint.customTransitHub,
            },
            budget: {
              estimateCost: travelCostAmount,
            },
          });
        }

        mappedActivities.push({
          type: 3,
          title: String(activity.title || name).trim(),
          startTime: visitStartTime,
          endTime: visitEndTime,
          locationId: toPositiveIntOrNull(activity.locationId),
          customLocationId: null,
          customLocation: activity.customLocation
            ? {
                name: String(activity.customLocation.name || name).trim(),
                latitude: toNumberOrDefault(activity.customLocation.latitude, 0),
                longitude: toNumberOrDefault(activity.customLocation.longitude, 0),
                address: String(activity.customLocation.address || activity.address || '').trim() || null,
              }
            : null,
          transport: null,
          budget: {
            estimateCost: visitEstimateCost,
          },
        });
      });

      const dayEstimatedCost = mappedActivities.reduce(
        (sum, activity) => sum + Math.max(0, toNumberOrDefault(activity?.budget?.estimateCost, 0)),
        0,
      );

      return {
        dayNumber: dayIndex + 1,
        date: toIsoDateString(day.date),
        dayTitle: String(day.dayTitle || `Day ${dayIndex + 1}`).trim(),
        weatherSummary: null,
        estimatedCost: Math.round(dayEstimatedCost),
        activities: mappedActivities,
      };
    });

    const estimatedTransportCost = mappedDays.reduce((sum, day) => {
      const dayTransportCost = (day.activities || []).reduce((activitySum, activity) => {
        if (Math.round(toNumberOrDefault(activity?.type, 0)) !== 2) return activitySum;
        return activitySum + Math.max(0, toNumberOrDefault(activity?.budget?.estimateCost, 0));
      }, 0);
      return sum + dayTransportCost;
    }, 0);

    const estimatedActivityCost = mappedDays.reduce((sum, day) => {
      const dayActivityCost = (day.activities || []).reduce((activitySum, activity) => {
        if (Math.round(toNumberOrDefault(activity?.type, 0)) === 2) return activitySum;
        return activitySum + Math.max(0, toNumberOrDefault(activity?.budget?.estimateCost, 0));
      }, 0);
      return sum + dayActivityCost;
    }, 0);

    const estimatedTotalCost = Math.round(Math.max(0, estimatedTransportCost + estimatedActivityCost));
    const requestedBudget = toFiniteNumber(manualTotalBudget);
    const totalBudget = requestedBudget != null && requestedBudget >= 0
      ? Math.round(requestedBudget)
      : estimatedTotalCost;
    const usableBudget = totalBudget;
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
        estimatedTransportCost: Math.round(estimatedTransportCost),
        estimatedActivityCost: Math.round(estimatedActivityCost),
        estimatedMealCost: 0,
        estimatedTotalCost,
        remainingBudget,
        contingencyFund: null,
      },
    };

    setSavingTrip(true);
    try {
      const result = await saveTripApi(payload);
      clearDraftStorage(tripId);
      message.success('Manual trip saved successfully.');
      const savedTripId = Number(result?.tripId ?? result?.TripId ?? result?.id ?? result?.Id);
      if (Number.isFinite(savedTripId) && savedTripId > 0) {
        navigate(PATHS.TRIP_DETAIL.replace(':id', String(savedTripId)));
      } else {
        navigate(PATHS.TRIP_DETAIL.replace(':id', String(tripId)));
      }
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
          <Card bordered={false} className={styles.loadingCard}>
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
                      {Math.round(totalEstimated).toLocaleString()} {tripInfo.currencyCode}
                    </div>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                      Activities: {formatMoney(totalActivityEstimated, tripInfo.currencyCode)}
                    </Text>
                    <br />
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                      Transport: {formatMoney(totalTransportEstimated, tripInfo.currencyCode)}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card bordered={false} className={styles.builderCard}>
              <Title level={3} style={{ marginTop: 0, marginBottom: 2 }}>Manual Day & Location Builder</Title>
              <Text type="secondary">Flow independent from Itinerary screen. Add each day and each location, estimate updates automatically.</Text>

              <div className={styles.optionalBudgetRow}>
                <Text strong>Trip budget (optional)</Text>
                <InputNumber
                  min={0}
                  style={{ width: 260 }}
                  placeholder={`e.g. 10000000 ${tripInfo.currencyCode}`}
                  value={manualTotalBudget}
                  onChange={(value) => {
                    const normalized = toFiniteNumber(value);
                    if (normalized == null || normalized < 0) {
                      setManualTotalBudget(null);
                      return;
                    }
                    setManualTotalBudget(normalized);
                  }}
                />
              </div>

              {!manualDays.length && (
                <Empty
                  description="No day added yet"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className={styles.emptyState}
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={addDay}>
                    Add First Day
                  </Button>
                </Empty>
              )}

              {manualDays.length > 0 && (
                <Space direction="vertical" size="large" className={styles.dayList}>
                  {manualDays.map((day, dayIndex) => {
                    const dayActivityEstimate = (day.activities || []).reduce(
                      (sum, activity) => sum + Math.max(0, toNumberOrDefault(activity.estimatedCost, 0)),
                      0,
                    );
                    const dayTransportEstimate = (day.activities || []).reduce(
                      (sum, activity) => sum + Math.max(0, toNumberOrDefault(activity.travelFromPrevious?.costAmount, 0)),
                      0,
                    );
                    const dayEstimate = dayActivityEstimate + dayTransportEstimate;

                    return (
                      <Card
                        key={day.id}
                        size="small"
                        className={styles.dayCard}
                        title={(
                          <Space>
                            <span>{`Day ${dayIndex + 1}`}</span>
                            <Tag color="cyan">{formatMoney(dayEstimate, tripInfo.currencyCode)}</Tag>
                          </Space>
                        )}
                        extra={(
                          <Space>
                            <Button type="dashed" icon={<PlusOutlined />} onClick={() => openAddLocationModal(day.id)}>
                              Add Location
                            </Button>
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() => removeDay(day.id)}
                              disabled={manualDays.length <= 1}
                            >
                              Remove Day
                            </Button>
                          </Space>
                        )}
                      >
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            <Text>Date</Text>
                            <DatePicker
                              style={{ width: '100%', marginTop: 6 }}
                              value={day.date ? dayjs(day.date) : null}
                              disabledDate={dayDateDisabled}
                              onChange={(value) => updateDayField(day.id, 'date', value ? value.format('YYYY-MM-DD') : '')}
                            />
                          </Col>
                          <Col xs={24} md={12}>
                            <Text>Day Title</Text>
                            <Input
                              style={{ marginTop: 6 }}
                              value={day.dayTitle}
                              onChange={(event) => updateDayField(day.id, 'dayTitle', event.target.value)}
                            />
                          </Col>
                        </Row>

                        {(day.activities || []).length === 0 && (
                          <Empty
                            description="No location in this day"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            style={{ marginTop: 24, marginBottom: 4 }}
                          >
                            <Button icon={<PlusOutlined />} onClick={() => openAddLocationModal(day.id)}>
                              Add First Location
                            </Button>
                          </Empty>
                        )}

                        {(day.activities || []).length > 0 && (
                          <Space direction="vertical" size="middle" className={styles.activityList}>
                            {(day.activities || []).map((activity, activityIndex) => {
                              const previousActivity = activityIndex > 0 ? day.activities?.[activityIndex - 1] : null;
                              const travelFromPrevious = activity.travelFromPrevious || null;
                              const transportOptions = normalizeTransportOptions(
                                travelFromPrevious?.transportOptions ?? travelFromPrevious?.TransportOptions,
                                tripInfo.currencyCode || 'VND',
                              );
                              const hasTransportOptions = transportOptions.length > 0;
                              const isCustomTransport = Boolean(travelFromPrevious?.isCustomTransport);
                              const selectedTransportOptionIndex = getPreferredTransportOptionIndex(transportOptions, travelFromPrevious);
                              const selectedTransportLabel = String(
                                (isCustomTransport ? (travelFromPrevious?.transportModeName || 'Custom') : '')
                                || travelFromPrevious?.transportModeName
                                || (toPositiveIntOrNull(travelFromPrevious?.transportModeId)
                                  ? (transportModeNameById.get(toPositiveIntOrNull(travelFromPrevious?.transportModeId)) || '')
                                  : '')
                                || '',
                              ).trim();
                              const fromLabel = pickFirstText(
                                travelFromPrevious?.fromName,
                                getActivityDisplayName(previousActivity, `Location ${activityIndex}`),
                                'Previous Location',
                              );
                              const toLabel = pickFirstText(
                                travelFromPrevious?.toName,
                                getActivityDisplayName(activity, `Location ${activityIndex + 1}`),
                                'Next Location',
                              );

                              return (
                                <React.Fragment key={activity.id}>
                                  {activityIndex > 0 && travelFromPrevious && (
                                    <div className={styles.betweenTravelCard}>
                                      <div className={styles.travelInfoBox}>
                                        <div className={styles.travelRoute}>
                                          <div className={styles.travelPoint}>
                                            <span className={styles.travelDot} />
                                            <span>{fromLabel}</span>
                                          </div>
                                          <div className={styles.travelRouteConnector} />
                                          <div className={styles.travelPoint}>
                                            <span className={styles.travelDot} />
                                            <span>{toLabel}</span>
                                          </div>
                                        </div>

                                        <div className={styles.travelMetaLine}>
                                          <Text>
                                            {formatMinutes(travelFromPrevious.travelMinutes)}
                                            {travelFromPrevious.distanceKm > 0 ? ` • ${travelFromPrevious.distanceKm.toFixed(travelFromPrevious.distanceKm >= 10 ? 0 : 1)} km` : ''}
                                            {selectedTransportLabel ? ` • ${selectedTransportLabel}` : ''}
                                            {' • '}
                                            {formatMoney(travelFromPrevious.costAmount, travelFromPrevious.costCurrency || tripInfo.currencyCode)}
                                          </Text>
                                        </div>

                                        {hasTransportOptions && (
                                          <div className={styles.transportOptionsSection}>
                                            <Text className={styles.transportOptionsTitle}>
                                              Transport options ({transportOptions.length + 1})
                                            </Text>
                                            <div className={styles.transportOptionList}>
                                              {transportOptions.map((option, optionIndex) => {
                                                const optionSelected = selectedTransportOptionIndex === optionIndex;
                                                return (
                                                  <button
                                                    key={`${activity.id}-transport-option-${optionIndex}`}
                                                    type="button"
                                                    className={`${styles.transportOptionItem} ${optionSelected ? styles.transportOptionItemSelected : ''}`}
                                                    onClick={() => selectActivityTransportOption(day.id, activity.id, optionIndex)}
                                                    disabled={addingLocation}
                                                  >
                                                    <div className={styles.transportOptionMain}>
                                                      <span className={styles.transportOptionName}>{option.method || `Option ${optionIndex + 1}`}</span>
                                                      {option.recommended && <span className={styles.transportOptionRecommended}>Recommended</span>}
                                                    </div>
                                                    <span className={styles.transportOptionMeta}>
                                                      {option.travelMinutes > 0 ? formatMinutes(option.travelMinutes) : 'N/A'}
                                                      {' • '}
                                                      {formatMoney(option.costAmount, option.costCurrency || tripInfo.currencyCode)}
                                                    </span>
                                                    {option.note && (
                                                      <span className={styles.transportOptionNote}>{option.note}</span>
                                                    )}
                                                  </button>
                                                );
                                              })}

                                              <button
                                                type="button"
                                                className={`${styles.transportOptionItem} ${isCustomTransport ? styles.transportOptionItemSelected : ''}`}
                                                onClick={() => selectCustomTransportOption(day.id, activity.id)}
                                                disabled={addingLocation}
                                              >
                                                <div className={styles.transportOptionMain}>
                                                  <span className={styles.transportOptionName}>Custom</span>
                                                  {isCustomTransport && <span className={styles.transportOptionRecommended}>Selected</span>}
                                                </div>
                                                <span className={styles.transportOptionMeta}>Enter your own transport method and cost</span>
                                              </button>

                                              {isCustomTransport && (
                                                <div className={styles.customTransportEditor}>
                                                  <div className={styles.customTransportGrid}>
                                                    <div className={styles.editTimelineField}>
                                                      <span className={styles.editTimelineLabel}>Custom transport</span>
                                                      <Input
                                                        placeholder="e.g. Private motorbike"
                                                        value={String(travelFromPrevious?.transportModeName || '')}
                                                        onChange={(event) => updateCustomTransportInput(day.id, activity.id, { method: event?.target?.value || '' })}
                                                      />
                                                    </div>
                                                    <div className={styles.editTimelineField}>
                                                      <span className={styles.editTimelineLabel}>Custom transport cost</span>
                                                      <InputNumber
                                                        min={0}
                                                        style={{ width: '100%' }}
                                                        value={toNumberOrDefault(travelFromPrevious?.costAmount, 0)}
                                                        onChange={(value) => updateCustomTransportInput(day.id, activity.id, { cost: value == null ? 0 : value })}
                                                        placeholder={`0 ${tripInfo.currencyCode}`}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <Card
                                    size="small"
                                    type="inner"
                                    className={styles.activityCard}
                                    title={(
                                      <Space>
                                        <EnvironmentOutlined />
                                        <span>{activity.destinationName || `Location ${activityIndex + 1}`}</span>
                                        <Tag color={activity.sourceType === 'custom' ? 'gold' : 'blue'}>
                                          {activity.sourceType === 'custom' ? 'Custom' : 'Existing'}
                                        </Tag>
                                      </Space>
                                    )}
                                    extra={(
                                      <Button
                                        danger
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => removeActivity(day.id, activity.id)}
                                        loading={addingLocation}
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  >
                                    <div className={styles.activityMetaRow}>
                                      <Text strong>{toInputTimeValue(activity.startTime)} - {toInputTimeValue(activity.endTime)}</Text>
                                      <Text>{activity.address || '-'}</Text>
                                    </div>

                                    <div className={styles.activityConfigGrid}>
                                      <div className={styles.editTimelineField}>
                                        <span className={styles.editTimelineLabel}>Location budget (optional)</span>
                                        <InputNumber
                                          min={0}
                                          style={{ width: '100%' }}
                                          value={toNumberOrDefault(activity.estimatedCost, 0)}
                                          onChange={(value) => updateActivityBudget(day.id, activity.id, value)}
                                          placeholder={`0 ${tripInfo.currencyCode}`}
                                        />
                                      </div>
                                    </div>
                                  </Card>
                                </React.Fragment>
                              );
                            })}

                            <Button
                              type="dashed"
                              icon={<PlusOutlined />}
                              onClick={() => openAddLocationModal(day.id)}
                            >
                              Add Location
                            </Button>
                          </Space>
                        )}
                      </Card>
                    );
                  })}
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

            <div className={styles.footerActions}>
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

      <Modal
        title="Add Location"
        open={addLocationModal.open}
        onCancel={closeAddLocationModal}
        width="min(1100px, 94vw)"
        footer={null}
        destroyOnClose
        rootClassName={styles.pageShell}
      >
        <div className={styles.addBetweenModalBody}>
          <Text type="secondary" className={styles.addBetweenHint}>
            Choose one flow below. Existing and custom flows are independent and estimate will be recalculated automatically.
          </Text>

          <div className={styles.addBetweenSplitLayout}>
            <div className={styles.addBetweenPanel}>
              <span className={styles.addBetweenPanelTitle}>Existing Location</span>
              <Text type="secondary" className={styles.addBetweenPanelHint}>
                Select location type, province, location and time before adding.
              </Text>

              <span className={styles.editTimelineLabel}>Location Type</span>
              <Select
                showSearch
                allowClear
                className={styles.addBetweenSelect}
                placeholder="Select location type"
                value={existingLocationTypeId}
                onChange={async (value) => {
                  setExistingLocationTypeId(value ?? null);
                  setExistingLocationId(null);
                  setExistingLocationSearch('');
                  if (existingProvinceId && value) {
                    await loadExistingLocations(existingProvinceId, value, '');
                  } else {
                    setExistingLocations([]);
                  }
                }}
                loading={loadingLocationTypes}
                optionFilterProp="label"
                options={locationTypes.map((type) => ({ label: type.name, value: type.id }))}
                notFoundContent={loadingLocationTypes ? <Spin size="small" /> : 'No location types'}
              />

              <span className={styles.editTimelineLabel}>Province</span>
              <Select
                showSearch
                allowClear
                className={styles.addBetweenSelect}
                placeholder="Select province"
                value={existingProvinceId}
                onChange={async (value) => {
                  setExistingProvinceId(value ?? null);
                  setExistingLocationId(null);
                  setExistingLocationSearch('');
                  if (value && existingLocationTypeId) {
                    await loadExistingLocations(value, existingLocationTypeId, '');
                  } else {
                    setExistingLocations([]);
                  }
                }}
                loading={loadingProvinces}
                optionFilterProp="label"
                options={provinces.map((province) => ({ label: province.name, value: province.id }))}
                notFoundContent={loadingProvinces ? <Spin size="small" /> : 'No provinces'}
              />

              <span className={styles.editTimelineLabel}>Location</span>
              <Select
                showSearch
                allowClear
                className={styles.addBetweenSelect}
                placeholder={existingLocationTypeId && existingProvinceId ? 'Search location' : 'Select type + province first'}
                searchValue={existingLocationSearch}
                value={existingLocationId}
                onChange={(value) => setExistingLocationId(value ?? null)}
                onSearch={async (searchTerm) => {
                  setExistingLocationSearch(searchTerm);
                  if (existingProvinceId && existingLocationTypeId) {
                    await loadExistingLocations(existingProvinceId, existingLocationTypeId, searchTerm);
                  }
                }}
                filterOption={false}
                loading={loadingExistingLocations}
                disabled={!existingLocationTypeId || !existingProvinceId}
                options={existingLocations.map((locationOption) => ({
                  label: locationOption.address ? `${locationOption.name} - ${locationOption.address}` : locationOption.name,
                  value: locationOption.id,
                }))}
                notFoundContent={loadingExistingLocations ? <Spin size="small" /> : 'No available locations'}
              />

              <div className={styles.customLocationTimelineGrid}>
                <div className={styles.editTimelineField}>
                  <span className={styles.editTimelineLabel}>Start time</span>
                  <Input
                    type="time"
                    className={styles.editTimelineInput}
                    value={existingStartTime}
                    onChange={(event) => setExistingStartTime(event?.target?.value || '')}
                  />
                </div>

                <div className={styles.editTimelineField}>
                  <span className={styles.editTimelineLabel}>End time</span>
                  <Input
                    type="time"
                    className={styles.editTimelineInput}
                    value={existingEndTime}
                    onChange={(event) => setExistingEndTime(event?.target?.value || '')}
                  />
                </div>
              </div>

              <div className={styles.editTimelineField}>
                <span className={styles.editTimelineLabel}>Location budget (optional)</span>
                <InputNumber
                  min={0}
                  className={styles.editTimelineInput}
                  style={{ width: '100%' }}
                  value={existingBudget}
                  onChange={(value) => setExistingBudget(value == null ? null : Math.max(0, toNumberOrDefault(value, 0)))}
                  placeholder={`0 ${tripInfo?.currencyCode || 'VND'}`}
                />
              </div>

              <Button
                type="primary"
                className={styles.addBetweenPrimaryAction}
                onClick={addExistingLocationToDay}
                disabled={!existingLocationTypeId || !existingProvinceId || !existingLocationId}
                loading={addingLocation}
              >
                Add To Timeline
              </Button>
            </div>

            <div className={styles.addBetweenPanel}>
              <span className={styles.addBetweenPanelTitle}>Custom Location</span>
              <Text type="secondary" className={styles.addBetweenPanelHint}>
                Pick your own point on map and define timeline. Estimate is recalculated from API automatically.
              </Text>

              <div className={styles.editTimelineField}>
                <span className={styles.editTimelineLabel}>Name</span>
                <Input
                  className={styles.editTimelineInput}
                  placeholder="e.g. Secret sunset viewpoint"
                  value={customName}
                  onChange={(event) => setCustomName(event?.target?.value || '')}
                />
              </div>

              <div className={styles.editTimelineField}>
                <span className={styles.editTimelineLabel}>Address (optional)</span>
                <Input
                  className={styles.editTimelineInput}
                  placeholder="Address or short note"
                  value={customAddress}
                  onChange={(event) => setCustomAddress(event?.target?.value || '')}
                />
              </div>

              <Card className={styles.customLocationMapCard} title={<span className={styles.customLocationMapHeader}>Where are you starting from?</span>}>
                <div className={styles.customLocationMapWrap}>
                  <MapContainer
                    center={customMapCenter}
                    zoom={hasCustomCoordinates ? 14 : 12}
                    style={{ width: '100%', height: 180, borderRadius: 12 }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                      attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                      maxZoom={20}
                    />
                    {hasCustomCoordinates && <Marker position={[customLatValue, customLngValue]} />}
                    <CustomLocationMapClickHandler onPick={handlePickCustomLocationOnMap} />
                    <CustomLocationMapInvalidate activeKey={customMapActiveKey} />
                  </MapContainer>
                </div>

                <Button
                  type="dashed"
                  block
                  className={styles.customLocationCurrentBtn}
                  onClick={handleUseCurrentLocationForCustom}
                >
                  Use My Current Location
                </Button>
              </Card>

              <span className={styles.customLocationCoordinates}>
                Picked: {hasCustomCoordinates
                  ? `${customLatValue.toFixed(6)}, ${customLngValue.toFixed(6)}`
                  : '0.000000, 0.000000'}
              </span>
              <Text type="secondary" className={styles.customLocationHint}>
                Click on map to pick location for custom point.
              </Text>

              <div className={styles.customLocationTimelineGrid}>
                <div className={styles.editTimelineField}>
                  <span className={styles.editTimelineLabel}>Start time</span>
                  <Input
                    type="time"
                    className={styles.editTimelineInput}
                    value={customStartTime}
                    onChange={(event) => setCustomStartTime(event?.target?.value || '')}
                  />
                </div>

                <div className={styles.editTimelineField}>
                  <span className={styles.editTimelineLabel}>End time</span>
                  <Input
                    type="time"
                    className={styles.editTimelineInput}
                    value={customEndTime}
                    onChange={(event) => setCustomEndTime(event?.target?.value || '')}
                  />
                </div>
              </div>

              <div className={styles.editTimelineField}>
                <span className={styles.editTimelineLabel}>Location budget (optional)</span>
                <InputNumber
                  min={0}
                  className={styles.editTimelineInput}
                  style={{ width: '100%' }}
                  value={customBudget}
                  onChange={(value) => setCustomBudget(value == null ? null : Math.max(0, toNumberOrDefault(value, 0)))}
                  placeholder={`0 ${tripInfo?.currencyCode || 'VND'}`}
                />
              </div>

              <Button
                type="primary"
                className={styles.customLocationAddButton}
                loading={addingLocation}
                onClick={addCustomLocationToDay}
              >
                Add Custom Location
              </Button>
            </div>
          </div>

          <div className={styles.addBetweenFooterActions}>
            <Button onClick={closeAddLocationModal}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManualTripPage;