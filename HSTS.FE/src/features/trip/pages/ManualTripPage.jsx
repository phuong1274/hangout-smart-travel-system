import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Collapse,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { MapPinLine, NavigationArrow, Clock as ClockIcon } from '@phosphor-icons/react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDayCard } from '../components/SortableDayCard';
import { SortableActivityCard } from '../components/SortableActivityCard';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PATHS } from '@/routes/paths';
import GoogleMapPicker from '@/components/GoogleMapPicker';
import {
  estimateLocalTravelApi,
  getLocationTypesApi,
  getLocationsByProvinceApi,
  getProvincesApi,
  getTransportModesApi,
  saveTripApi,
  updateSavedTripApi,
  getTripByIdApi,
  getTripDetailApi,
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
  if (travel?.isCustomTransport) return null;

  const indexFromDraft = Number(travel?.selectedOptionIndex);
  if (travel?.selectedOptionIndex != null && Number.isInteger(indexFromDraft) && indexFromDraft >= 0 && indexFromDraft < options.length) {
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
  const userLocation = raw.userLocation || raw.UserLocation || null;
  const totalBudget = toFiniteNumber(
    raw.totalBudget
    ?? raw.TotalBudget
    ?? raw.budgetSummary?.totalBudget
    ?? raw.budgetSummary?.TotalBudget
    ?? raw.BudgetSummary?.totalBudget
    ?? raw.BudgetSummary?.TotalBudget
    ?? raw.tripSummary?.totalBudget
    ?? raw.tripSummary?.TotalBudget,
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
      // Preserve any user-provided start/origin label (e.g. province name) so it can
      // be persisted later when saving the manual trip. This mirrors the
      // Itinerary editor which may persist a user origin into the first travel
      // activity. The value may be just a textual label (no coordinates).
      startingLocation: pickFirstText(raw.startingLocation, raw.StartingLocation) || null,
      userLocation: userLocation
        ? {
            name: pickFirstText(
              userLocation?.name,
              userLocation?.Name,
              userLocation?.locationName,
              userLocation?.LocationName,
            ) || null,
            locationName: pickFirstText(
              userLocation?.locationName,
              userLocation?.LocationName,
              userLocation?.name,
              userLocation?.Name,
            ) || null,
            address: pickFirstText(userLocation?.address, userLocation?.Address) || null,
            latitude: toFiniteNumber(userLocation?.latitude ?? userLocation?.Latitude),
            longitude: toFiniteNumber(userLocation?.longitude ?? userLocation?.Longitude),
          }
        : null,
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
                description: String(customLocation.description || customLocation.Description || '').trim(),
                locationTypeId: toFiniteNumber(
                  customLocation.locationTypeId
                  ?? customLocation.LocationTypeId
                  ?? activity.locationTypeId
                  ?? activity.LocationTypeId,
                ),
              }
            : null;

          const travel = activity.travelFromPrevious || activity.TravelFromPrevious || null;

          return {
            id: activity.id || createClientId(`activity-${dayIndex}-${activityIndex}`),
            sourceType: activity.sourceType || (normalizedCustom ? 'custom' : 'existing'),
            locationId: toFiniteNumber(activity.locationId ?? activity.LocationId) || null,
            locationTypeId: toFiniteNumber(
              activity.locationTypeId
              ?? activity.LocationTypeId
              ?? normalizedCustom?.locationTypeId,
            ) || null,
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

// Converts a saved TripDetail's days (interleaved Travel+Visit) into the builder's
// Visit-only format where travel legs are stored as travelFromPrevious on the next activity.
const convertDetailDaysToBuilderDays = (tripDays) => {
  if (!Array.isArray(tripDays)) return [];
  return tripDays.map((day, dayIndex) => {
    const activities = [];
    let pendingTravel = null;

    (day.activities || []).forEach((act) => {
      if (act.type === 'Travel') {
        pendingTravel = act;
        return;
      }
      const transport = pendingTravel;
      pendingTravel = null;

      activities.push({
        id: createClientId(`activity-${dayIndex}-${activities.length}`),
        sourceType: act.locationId && Number(act.locationId) > 0 ? 'existing' : 'custom',
        locationId: act.locationId && Number(act.locationId) > 0 ? Number(act.locationId) : null,
        locationTypeId: null,
        destinationName: String(act.title || '').trim(),
        title: String(act.title || '').trim(),
        address: '',
        startTime: normalizeTimeOnly(act.startTime),
        endTime: normalizeTimeOnly(act.endTime),
        customLocation: null,
        travelFromPrevious: transport
          ? (() => {
              const savedModeId = toPositiveIntOrNull(transport.transport?.transportModeId);
              const isCustom = savedModeId == null;
              return {
                distanceKm: Math.max(0, toNumberOrDefault(transport.transport?.distanceKm, 0)),
                travelMinutes: Math.max(0, toNumberOrDefault(transport.transport?.travelTimeMinutes, 0)),
                costAmount: Math.max(0, toNumberOrDefault(transport.budget?.estimateCost, 0)),
                costCurrency: 'VND',
                transportModeId: savedModeId,
                transportModeName: String(transport.transport?.transportModeName || '').trim() || null,
                departureTime: normalizeTimeOnly(transport.startTime),
                arrivalTime: normalizeTimeOnly(transport.endTime),
                fromName: transport.transport?.customFromTransitHubName
                  || transport.transport?.yourLocationName
                  || transport.transport?.fromTransitHubName
                  || transport.transport?.fromLocationName
                  || null,
                toName: transport.transport?.customToTransitHubName
                  || transport.transport?.toTransitHubName
                  || transport.transport?.toLocationName
                  || null,
                selectedOptionIndex: null,
                manualCostOverride: isCustom,
                isCustomTransport: isCustom,
                transportOptions: [],
              };
            })()
          : null,
        estimatedCost: Math.max(0, toNumberOrDefault(act.budget?.estimateCost, 0)),
      });
    });

    return {
      id: createClientId(`day-${dayIndex}`),
      date: day.date ? dayjs(day.date).format('YYYY-MM-DD') : dayjs().add(dayIndex, 'day').format('YYYY-MM-DD'),
      dayTitle: String(day.dayTitle || `Day ${dayIndex + 1}`).trim(),
      activities,
    };
  });
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

const buildTravelCacheKey = (fromEndpoint, toEndpoint, groupSize, currencyCode) => {
  const fromKey = fromEndpoint.fromLocationId != null
    ? `L:${fromEndpoint.fromLocationId}`
    : `C:${fromEndpoint.fromLat},${fromEndpoint.fromLng}`;
  const toKey = toEndpoint.toLocationId != null
    ? `L:${toEndpoint.toLocationId}`
    : `C:${toEndpoint.toLat},${toEndpoint.toLng}`;
  return `${fromKey}|${toKey}|${groupSize}|${currencyCode}`;
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
  const [editMode, setEditMode] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [defaultProvinceId, setDefaultProvinceId] = useState(null);
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

  const travelCacheRef = useRef(new Map());
  const [reorderRecalculating, setReorderRecalculating] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
  const [customLocationTypeId, setCustomLocationTypeId] = useState(null);
  const [customDescription, setCustomDescription] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState(null);
  const [customLng, setCustomLng] = useState(null);
  const [customStartTime, setCustomStartTime] = useState('08:00');
  const [customEndTime, setCustomEndTime] = useState('09:30');
  const [customBudget, setCustomBudget] = useState(null);

  const [openTransportOptionIds, setOpenTransportOptionIds] = useState({});
  const [originMapOpen, setOriginMapOpen] = useState(false);

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
    const isEditMode = Boolean(location?.state?.editMode);
    const stateDefaultProvinceId = Number(location?.state?.defaultProvinceId);
    const resolvedTripId = isEditMode
      ? (Number.isFinite(stateTripId) && stateTripId > 0
          ? stateTripId
          : (Number.isFinite(queryTripId) && queryTripId > 0 ? queryTripId : 0))
      : (Number.isFinite(queryTripId) && queryTripId > 0
          ? queryTripId
          : (Number.isFinite(stateTripId) && stateTripId > 0 ? stateTripId : 0));

    setTripId(resolvedTripId > 0 ? resolvedTripId : null);
    setDefaultProvinceId(Number.isFinite(stateDefaultProvinceId) && stateDefaultProvinceId > 0
      ? stateDefaultProvinceId
      : null);
    setEditMode(isEditMode);
    setTransportOptionsBackfilled(false);
  }, [location?.state?.tripId, location?.state?.defaultProvinceId, location?.state?.editMode, searchParams]);

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

      const isEditMode = Boolean(location?.state?.editMode);

      if (!resolvedTripInfo || (isEditMode && resolvedDays.length === 0)) {
        try {
          if (isEditMode) {
            // Edit mode: load full trip detail (includes days/activities)
            const apiTrip = await getTripDetailApi(tripId);
            if (!resolvedTripInfo) {
              resolvedTripInfo = normalizeTripInfo({
                ...apiTrip,
                currencyCode: apiTrip.currency,
                budgetSummary: apiTrip.tripSummary,
              });
            }

            // Reconstruct starting point from the first Travel activity's transport.
            // The starting point is persisted as a CustomFromTransitHub on the
            // first travel leg (starting point -> first location).
            if (!resolvedTripInfo?.startingLocation && !resolvedTripInfo?.userLocation) {
              const firstDayActs = apiTrip.tripDays?.[0]?.activities;
              const firstTravel = firstDayActs?.find((a) => a.type === 'Travel');
              const t = firstTravel?.transport;
              if (t) {
                const originName = t.yourLocationName
                  || t.customFromTransitHubName
                  || t.fromTransitHubName
                  || t.fromLocationName
                  || null;
                const originLat = toFiniteNumber(t.customFromTransitHubLatitude);
                const originLng = toFiniteNumber(t.customFromTransitHubLongitude);
                const originAddress = t.customFromTransitHubAddress || null;
                if (originName || (originLat != null && originLng != null)) {
                  resolvedTripInfo = {
                    ...resolvedTripInfo,
                    startingLocation: originName || 'Your Location',
                    userLocation: (originLat != null && originLng != null)
                      ? {
                          name: originName || 'Your Location',
                          locationName: originName || 'Your Location',
                          address: originAddress,
                          latitude: originLat,
                          longitude: originLng,
                        }
                      : null,
                  };
                }
              }
            }

            if (resolvedDays.length === 0 && Array.isArray(apiTrip.tripDays)) {
              resolvedDays = convertDetailDaysToBuilderDays(apiTrip.tripDays);
            }
          } else {
            const apiTrip = await getTripByIdApi(tripId);
            resolvedTripInfo = normalizeTripInfo(apiTrip);
          }
        } catch {
          if (!cancelled) {
            message.error('Cannot load trip information.');
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
  }, [location?.state?.tripInfo, location?.state?.editMode, tripId]);

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

  const manualOrigin = useMemo(() => {
    const origin = tripInfo?.userLocation || tripInfo?.UserLocation || null;
    const latitude = toFiniteNumber(origin?.latitude ?? origin?.Latitude);
    const longitude = toFiniteNumber(origin?.longitude ?? origin?.Longitude);
    const hasCoordinates = latitude != null && longitude != null;
    return {
      name: pickFirstText(
        hasCoordinates ? 'Your Location' : '',
        hasCoordinates ? 'Your Location' : '',
        tripInfo?.startingLocation,
        tripInfo?.StartingLocation,
      ) || '',
      address: pickFirstText(origin?.address, origin?.Address) || '',
      latitude,
      longitude,
    };
  }, [tripInfo]);

  const updateTripOrigin = useCallback((updater) => {
    setTripInfo((prev) => {
      if (!prev) return prev;
      const currentOrigin = prev?.userLocation || prev?.UserLocation || {};
      const nextOrigin = typeof updater === 'function' ? updater(currentOrigin) : updater;
      return {
        ...prev,
        startingLocation: pickFirstText(nextOrigin?.name, prev?.startingLocation, prev?.StartingLocation) || null,
        userLocation: nextOrigin,
      };
    });
  }, []);

  const getTripOriginEndpoint = useCallback(() => {
    const origin = tripInfo?.userLocation || tripInfo?.UserLocation;
    const fromLat = toFiniteNumber(origin?.latitude ?? origin?.Latitude);
    const fromLng = toFiniteNumber(origin?.longitude ?? origin?.Longitude);
    if (fromLat != null && fromLng != null) {
      return {
        fromLat,
        fromLng,
        fromLabel: 'Your Location',
      };
    }

    const label = pickFirstText(tripInfo?.startingLocation, tripInfo?.StartingLocation);
    return label ? { fromLabel: label } : null;
  }, [tripInfo]);

  // Resolve an origin endpoint for a given day index. Prefer the last activity of
  // the previous day (if available) which contains coordinates or a locationId.
  // Returns null when no usable origin endpoint is found.
  const resolveOriginEndpointForDay = (dayIndex) => {
    if (!Array.isArray(manualDays) || manualDays.length === 0) return null;
    if (dayIndex == null || dayIndex <= 0) return null;
    const prevDay = manualDays[dayIndex - 1];
    const prevLastActivity = prevDay?.activities?.[prevDay.activities.length - 1];
    if (!prevLastActivity) return null;
    // getActivityEndpointForEstimate returns an object with fromLocationId or fromLat/fromLng
    return getActivityEndpointForEstimate(prevLastActivity, 'from');
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
      if (currentIndex < 0) return day;
      // For cross-day first activities (currentIndex === 0), previousActivity is undefined;
      // departureTime and fromName are already captured in travelFromPrevious.
      const previousActivity = currentIndex > 0 ? activities[currentIndex - 1] : undefined;
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
    setExistingProvinceId(defaultProvinceId);
    setExistingLocationId(null);
    setExistingLocations([]);
    setExistingLocationSearch('');
    setExistingStartTime('08:00');
    setExistingEndTime('09:30');
    setExistingBudget(null);

    setCustomName('');
    setCustomLocationTypeId(null);
    setCustomDescription('');
    setCustomAddress('');
    setCustomLat(null);
    setCustomLng(null);
    setCustomStartTime('08:00');
    setCustomEndTime('09:30');
    setCustomBudget(null);
  }, [defaultProvinceId]);

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

  // Recalculates intra-day travel estimates for a list of visit activities.
  // Optional `originEndpoint` allows estimating travel from an external origin
  // (e.g. user start location or previous day's last stop) to the first activity.
  // originEndpoint shape mirrors getActivityEndpointForEstimate output for the
  // "from" side: { fromLocationId } or { fromLat, fromLng }.
  const recalculateDayTravelAndEstimate = useCallback(async (activities, originEndpoint = null) => {
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

    // If an originEndpoint is provided, attempt to estimate a travel leg from
    // that origin to the first activity and set travelFromPrevious on index 0
    // accordingly. This brings parity with ItineraryResultPage which injects
    // an origin→first-stop leg when originEndpoint is available.
    // Only attempt an origin->first-stop estimate if the provided originEndpoint
    // contains a valid endpoint the estimate API can consume: either a
    // fromLocationId or fromLat/fromLng. Textual labels (startingLocation) are
    // not sufficient for estimation and must not trigger the API call.
    const originHasEstimateEndpoint = originEndpoint && (
      originEndpoint.fromLocationId != null || (originEndpoint.fromLat != null && originEndpoint.fromLng != null)
    );

    if (originHasEstimateEndpoint && normalized.length > 0) {
        try {
        const first = normalized[0];
        const toEndpoint = getActivityEndpointForEstimate(first, 'to');
        const hasOriginToFirst = Object.keys({ ...originEndpoint, ...toEndpoint }).length > 0;
          if (hasOriginToFirst) {
          const departureTime = normalizeTimeOnly('08:00:00') || '08:00:00';
          const groupSize = Math.max(1, Math.round(toNumberOrDefault(tripInfo.groupSize, 1)));
          const currencyCode = tripInfo.currencyCode || 'VND';
          const cacheKey = buildTravelCacheKey(originEndpoint, toEndpoint, groupSize, currencyCode);
          const cached = travelCacheRef.current.get(cacheKey);
          const travelLeg = cached
            ? { ...cached, arrivalTime: null, ArrivalTime: null }
            : await estimateLocalTravelApi({ ...originEndpoint, ...toEndpoint, groupSize, departureTime, currencyCode });
          if (!cached) travelCacheRef.current.set(cacheKey, travelLeg);

          const travelMinutesFromLeg = Math.max(0, toNumberOrDefault(travelLeg?.selectedTravelTimeMinutes ?? travelLeg?.SelectedTravelTimeMinutes, 0));
          const distanceKm = Math.max(0, toNumberOrDefault(travelLeg?.distanceKm ?? travelLeg?.DistanceKm, 0));
          const travelCostFromLeg = Math.max(0, toMoneyAmount(travelLeg?.selectedTotalCost ?? travelLeg?.SelectedTotalCost));
          const resolvedTransportModeId = toPositiveIntOrNull(travelLeg?.selectedTransportModeId ?? travelLeg?.SelectedTransportModeId ?? travelLeg?.transportModeId ?? travelLeg?.TransportModeId);
          const normalizedTransportOptions = normalizeTransportOptions(travelLeg?.transportOptions ?? travelLeg?.TransportOptions ?? travelLeg?.options ?? travelLeg?.Options, currencyCode);
          const selectedOptionIndex = getPreferredTransportOptionIndex(normalizedTransportOptions, null);
          const selectedOption = selectedOptionIndex != null ? normalizedTransportOptions[selectedOptionIndex] : null;
          const resolvedTravelMinutes = Math.max(1, toNumberOrDefault(selectedOption?.travelMinutes, travelMinutesFromLeg || 1));
          const autoStart = normalizeTimeOnly(travelLeg?.arrivalTime || travelLeg?.ArrivalTime) || addMinutesToTime(departureTime, resolvedTravelMinutes > 0 ? resolvedTravelMinutes : 20);

          normalized[0] = {
            ...first,
            startTime: autoStart,
            travelFromPrevious: {
              distanceKm,
              travelMinutes: resolvedTravelMinutes,
              costAmount: travelCostFromLeg,
              costCurrency: pickFirstText(selectedOption?.costCurrency, tripInfo.currencyCode, 'VND') || 'VND',
              transportModeId: resolvedTransportModeId,
              transportModeName: pickFirstText(selectedOption?.method) || null,
              departureTime: departureTime,
              arrivalTime: autoStart,
              fromName: String(originEndpoint?.fromLabel || originEndpoint?.fromName || '').trim() || null,
              toName: getActivityDisplayName(first, 'Destination'),
              selectedOptionIndex: selectedOptionIndex,
              manualCostOverride: false,
              isCustomTransport: false,
              transportOptions: normalizedTransportOptions,
            },
            estimatedCost: Math.max(0, toNumberOrDefault(first.estimatedCost, 0)),
          };
        }
      } catch {
        // best-effort; ignore origin estimate failures
      }
    }

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
        const groupSize = Math.max(1, Math.round(toNumberOrDefault(tripInfo.groupSize, 1)));
        const currencyCode = tripInfo.currencyCode || 'VND';
        const cacheKey = buildTravelCacheKey(fromEndpoint, toEndpoint, groupSize, currencyCode);
        const cached = travelCacheRef.current.get(cacheKey);
        const travelLeg = cached
          ? { ...cached, arrivalTime: null, ArrivalTime: null }
          : await estimateLocalTravelApi({
              ...fromEndpoint,
              ...toEndpoint,
              groupSize,
              departureTime,
              currencyCode,
            });
        if (!cached) travelCacheRef.current.set(cacheKey, travelLeg);

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
          currencyCode,
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
          currencyCode,
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

  const recalculateFirstManualDayFromOrigin = useCallback(async (nextTripInfo) => {
    if (!Array.isArray(manualDays) || manualDays.length === 0) return;
    const firstDay = manualDays[0];
    if (!firstDay || !Array.isArray(firstDay.activities) || firstDay.activities.length === 0) return;

    const origin = nextTripInfo?.userLocation || nextTripInfo?.UserLocation;
    const fromLat = toFiniteNumber(origin?.latitude ?? origin?.Latitude);
    const fromLng = toFiniteNumber(origin?.longitude ?? origin?.Longitude);
    const label = pickFirstText(
      fromLat != null && fromLng != null ? 'Your Location' : '',
      fromLat != null && fromLng != null ? 'Your Location' : '',
      nextTripInfo?.startingLocation,
      nextTripInfo?.StartingLocation,
    );
    const originEndpoint = fromLat != null && fromLng != null
      ? { fromLat, fromLng, fromLabel: label || 'Your Location' }
      : (label ? { fromLabel: label } : null);

    try {
      const recalculated = await recalculateDayTravelAndEstimate(firstDay.activities, originEndpoint);
      setManualDays((prev) => prev.map((day, index) => (
        index === 0 ? { ...day, activities: recalculated } : day
      )));
    } catch {
      message.error('Unable to recalculate the first day after updating origin.');
    }
  }, [manualDays, recalculateDayTravelAndEstimate]);

  const handleManualOriginMapConfirm = useCallback(async (lat, lng) => {
    const nextTripInfo = {
      ...tripInfo,
      startingLocation: pickFirstText(tripInfo?.startingLocation, tripInfo?.StartingLocation, 'Your Location'),
      userLocation: {
        ...(tripInfo?.userLocation || tripInfo?.UserLocation || {}),
        name: 'Your Location',
        locationName: 'Your Location',
        address: manualOrigin.address || null,
        latitude: lat,
        longitude: lng,
      },
    };
    setTripInfo(nextTripInfo);
    await recalculateFirstManualDayFromOrigin(nextTripInfo);
    message.success('Trip origin updated on the map.');
  }, [manualOrigin.address, manualOrigin.name, recalculateFirstManualDayFromOrigin, tripInfo]);

  // Estimates the travel leg from the last activity of the previous day to the first
  // activity of the current day. Returns an updated version of `toActivity` with
  // `travelFromPrevious` populated (or the original if estimation fails/has no endpoints).
  const estimateCrossDayTravel = useCallback(async (fromActivity, toActivity, existingTravel = null) => {
    if (!tripInfo) return toActivity;

    const fromEndpoint = getActivityEndpointForEstimate(fromActivity, 'from');
    const toEndpoint = getActivityEndpointForEstimate(toActivity, 'to');
    const hasEndpoint = Object.keys({ ...fromEndpoint, ...toEndpoint }).length > 0;
    if (!hasEndpoint) return toActivity;

    try {
      const departureTime = normalizeTimeOnly(fromActivity.endTime) || '08:00:00';
      const groupSize = Math.max(1, Math.round(toNumberOrDefault(tripInfo.groupSize, 1)));
      const currencyCode = tripInfo.currencyCode || 'VND';
      const cacheKey = buildTravelCacheKey(fromEndpoint, toEndpoint, groupSize, currencyCode);
      const cached = travelCacheRef.current.get(cacheKey);
      const travelLeg = cached
        ? { ...cached }
        : await estimateLocalTravelApi({ ...fromEndpoint, ...toEndpoint, groupSize, departureTime, currencyCode });
      if (!cached) travelCacheRef.current.set(cacheKey, travelLeg);

      const travelMinutesFromLeg = Math.max(0, toNumberOrDefault(
        travelLeg?.selectedTravelTimeMinutes ?? travelLeg?.SelectedTravelTimeMinutes, 0));
      const distanceKm = Math.max(0, toNumberOrDefault(travelLeg?.distanceKm ?? travelLeg?.DistanceKm, 0));
      const travelCostFromLeg = Math.max(0, toMoneyAmount(travelLeg?.selectedTotalCost ?? travelLeg?.SelectedTotalCost));
      const transportModeIdFromLeg = toPositiveIntOrNull(
        travelLeg?.selectedTransportModeId ?? travelLeg?.SelectedTransportModeId
        ?? travelLeg?.transportModeId ?? travelLeg?.TransportModeId);

      const normalizedTransportOptions = normalizeTransportOptions(
        travelLeg?.transportOptions ?? travelLeg?.TransportOptions
        ?? travelLeg?.options ?? travelLeg?.Options,
        currencyCode,
      );
      // Prefer restoring saved selection (by transportModeId/name) over just picking the recommended one
      const travelHint = existingTravel && !existingTravel.isCustomTransport ? existingTravel : null;
      const selectedOptionIndex = getPreferredTransportOptionIndex(normalizedTransportOptions, travelHint);
      const selectedOption = selectedOptionIndex != null ? normalizedTransportOptions[selectedOptionIndex] : null;

      const resolvedTravelMinutes = Math.max(1, toNumberOrDefault(selectedOption?.travelMinutes, travelMinutesFromLeg || 1));
      const autoStart = normalizeTimeOnly(travelLeg?.arrivalTime || travelLeg?.ArrivalTime)
        || addMinutesToTime(departureTime, resolvedTravelMinutes > 0 ? resolvedTravelMinutes : 20);
      const desiredDuration = durationBetweenTimes(toActivity.startTime, toActivity.endTime);
      const autoEnd = addMinutesToTime(autoStart, desiredDuration);

      const hasManualCostOverride = Boolean(travelHint?.manualCostOverride);
      const optionCost = Math.max(0, toNumberOrDefault(selectedOption?.costAmount, travelCostFromLeg));
      const resolvedCostAmount = hasManualCostOverride && travelHint?.costAmount != null
        ? Math.max(0, toNumberOrDefault(travelHint.costAmount, optionCost))
        : optionCost;
      const resolvedTransportModeId = toPositiveIntOrNull(selectedOption?.transportModeId) || transportModeIdFromLeg;
      const resolvedTransportModeName = pickFirstText(
        selectedOption?.method,
        resolvedTransportModeId ? transportModeNameById.get(resolvedTransportModeId) : '',
        travelLeg?.selectedMethod,
        travelLeg?.SelectedMethod,
      ) || null;
      const resolvedCurrency = pickFirstText(selectedOption?.costCurrency, currencyCode, 'VND') || 'VND';

      return {
        ...toActivity,
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
          fromName: getActivityDisplayName(fromActivity, 'Previous'),
          toName: getActivityDisplayName(toActivity, 'Destination'),
          selectedOptionIndex,
          manualCostOverride: false,
          isCustomTransport: false,
          transportOptions: normalizedTransportOptions,
        },
      };
    } catch {
      return toActivity;
    }
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

      // Resolve origin endpoint: prefer previous day's last activity (coordinates)
      // so we can estimate cross-day travel. If not available and the trip has a
      // textual startingLocation, pass it as a fromLabel so the first-leg's
      // fromName will reflect the user's provided origin even if no estimate
      // is possible.
      const originEndpointForAdd = (dayIndex > 0 && manualDays[dayIndex - 1]?.activities?.length > 0)
        ? getActivityEndpointForEstimate(manualDays[dayIndex - 1].activities.at(-1), 'from')
        : getTripOriginEndpoint();

      let recalculated = await recalculateDayTravelAndEstimate([...(day.activities || []), appended], originEndpointForAdd);

      // If this is the first location added to a non-first day, estimate travel from
      // the last activity of the previous day.
      if (recalculated.length > 0 && dayIndex > 0 && day.activities.length === 0) {
        const prevDay = manualDays[dayIndex - 1];
        const prevLastActivity = prevDay?.activities?.[prevDay.activities.length - 1];
        if (prevLastActivity) {
          recalculated = [
            await estimateCrossDayTravel(prevLastActivity, recalculated[0]),
            ...recalculated.slice(1),
          ];
        }
      }

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
    if (!Number.isFinite(Number(customLocationTypeId)) || Number(customLocationTypeId) <= 0) {
      message.warning('Please select location type.');
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
        locationTypeId: Number(customLocationTypeId),
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
          description: String(customDescription || '').trim(),
          locationTypeId: Number(customLocationTypeId),
        },
        travelFromPrevious: null,
        estimatedCost: Math.max(0, toNumberOrDefault(customBudget, 0)),
      };

      const originEndpointForAdd = (dayIndex > 0 && manualDays[dayIndex - 1]?.activities?.length > 0)
        ? getActivityEndpointForEstimate(manualDays[dayIndex - 1].activities.at(-1), 'from')
        : getTripOriginEndpoint();

      let recalculated = await recalculateDayTravelAndEstimate([...(day.activities || []), appended], originEndpointForAdd);

      // If this is the first location added to a non-first day, estimate travel from
      // the last activity of the previous day.
      if (recalculated.length > 0 && dayIndex > 0 && day.activities.length === 0) {
        const prevDay = manualDays[dayIndex - 1];
        const prevLastActivity = prevDay?.activities?.[prevDay.activities.length - 1];
        if (prevLastActivity) {
          recalculated = [
            await estimateCrossDayTravel(prevLastActivity, recalculated[0]),
            ...recalculated.slice(1),
          ];
        }
      }

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
      const originEndpointForRemove = (dayIndex > 0 && manualDays[dayIndex - 1]?.activities?.length > 0)
        ? getActivityEndpointForEstimate(manualDays[dayIndex - 1].activities.at(-1), 'from')
        : getTripOriginEndpoint();

      const recalculated = await recalculateDayTravelAndEstimate(nextActivities, originEndpointForRemove);
      setManualDays((prev) => prev.map((item, index) => (
        index === dayIndex ? { ...item, activities: recalculated } : item
      )));
    } catch {
      message.error('Unable to recalculate estimates after removing location.');
    } finally {
      setAddingLocation(false);
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const type = active.data.current?.type;
    if (type === 'day') {
      const day = manualDays.find((d) => d.id === active.id);
      setActiveDragItem(day ? { type: 'day', label: day.dayTitle || `Day ${manualDays.indexOf(day) + 1}` } : null);
    } else if (type === 'activity') {
      const dayId = active.data.current?.dayId;
      const day = manualDays.find((d) => d.id === dayId);
      const activity = day?.activities?.find((a) => a.id === active.id);
      setActiveDragItem(activity ? { type: 'activity', label: activity.destinationName || activity.title || 'Activity' } : null);
    }
  };

  // Shared helper: reorder activities within a day by index and recalculate travel.
  const reorderActivitiesInDay = useCallback(async (dayIdx, oldIdx, newIdx) => {
    const day = manualDays[dayIdx];
    if (!day || oldIdx === newIdx) return;

    const reordered = arrayMove(day.activities, oldIdx, newIdx);

    // Anchor the new first activity's start time to the day's original anchor time so
    // the whole day schedule doesn't shift when activities are reordered.
    const anchorStartTime = normalizeTimeOnly(day.activities[0]?.startTime);
    if (anchorStartTime && reordered.length > 0) {
      const newFirst = reordered[0];
      const visitDuration = durationBetweenTimes(newFirst.startTime, newFirst.endTime);
      reordered[0] = {
        ...newFirst,
        startTime: anchorStartTime,
        endTime: addMinutesToTime(anchorStartTime, Math.max(30, visitDuration)),
        travelFromPrevious: null,
      };
    }

    setReorderRecalculating(true);
    try {
      const originEndpointForReorder = (dayIdx > 0 && manualDays[dayIdx - 1]?.activities?.length > 0)
        ? getActivityEndpointForEstimate(manualDays[dayIdx - 1].activities.at(-1), 'from')
        : getTripOriginEndpoint();

      let recalculated = await recalculateDayTravelAndEstimate(reordered, originEndpointForReorder);

      // If the first activity of a non-first day changed, re-estimate cross-day travel.
      if (dayIdx > 0 && recalculated.length > 0 && (oldIdx === 0 || newIdx === 0)) {
        const prevDay = manualDays[dayIdx - 1];
        const prevLastActivity = prevDay?.activities?.[prevDay.activities.length - 1];
        if (prevLastActivity) {
          recalculated = [
            await estimateCrossDayTravel(prevLastActivity, recalculated[0]),
            ...recalculated.slice(1),
          ];
        }
      }

      setManualDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, activities: recalculated } : d)));
    } catch {
      message.error('Unable to recalculate travel estimates after reordering.');
    } finally {
      setReorderRecalculating(false);
    }
  }, [manualDays, recalculateDayTravelAndEstimate, estimateCrossDayTravel]);

  const moveDayUp = useCallback((dayId) => {
    setManualDays((prev) => {
      const idx = prev.findIndex((d) => d.id === dayId);
      if (idx <= 0) return prev;
      return arrayMove(prev, idx, idx - 1);
    });
  }, []);

  const moveDayDown = useCallback((dayId) => {
    setManualDays((prev) => {
      const idx = prev.findIndex((d) => d.id === dayId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      return arrayMove(prev, idx, idx + 1);
    });
  }, []);

  const moveActivityUp = useCallback(async (dayId, activityId) => {
    const dayIdx = manualDays.findIndex((d) => d.id === dayId);
    if (dayIdx === -1) return;
    const day = manualDays[dayIdx];
    const actIdx = day.activities.findIndex((a) => a.id === activityId);
    if (actIdx <= 0) return;
    await reorderActivitiesInDay(dayIdx, actIdx, actIdx - 1);
  }, [manualDays, reorderActivitiesInDay]);

  const moveActivityDown = useCallback(async (dayId, activityId) => {
    const dayIdx = manualDays.findIndex((d) => d.id === dayId);
    if (dayIdx === -1) return;
    const day = manualDays[dayIdx];
    const actIdx = day.activities.findIndex((a) => a.id === activityId);
    if (actIdx < 0 || actIdx >= day.activities.length - 1) return;
    await reorderActivitiesInDay(dayIdx, actIdx, actIdx + 1);
  }, [manualDays, reorderActivitiesInDay]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || active.id === over.id) return;

    const type = active.data.current?.type;

    if (type === 'day') {
      // When dragging a day, over.id may resolve to an activity inside the target day
      // (because activity cards have more DOM area). Resolve to the parent day ID.
      const overDayId = over.data.current?.type === 'activity'
        ? over.data.current?.dayId
        : over.id;
      setManualDays((prev) => {
        const oldIdx = prev.findIndex((d) => d.id === active.id);
        const newIdx = prev.findIndex((d) => d.id === overDayId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        return arrayMove(prev, oldIdx, newIdx);
      });
      return;
    }

    if (type === 'activity') {
      const dayId = active.data.current?.dayId;
      const dayIdx = manualDays.findIndex((d) => d.id === dayId);
      if (dayIdx === -1) return;
      const day = manualDays[dayIdx];
      const oldIdx = day.activities.findIndex((a) => a.id === active.id);
      const newIdx = day.activities.findIndex((a) => a.id === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      await reorderActivitiesInDay(dayIdx, oldIdx, newIdx);
    }
  };

  useEffect(() => {
    if (transportOptionsBackfilled || !tripInfo || !Array.isArray(manualDays) || manualDays.length === 0) {
      return;
    }

    const currencyCode = tripInfo.currencyCode || 'VND';

    // Days that need intra-day travel backfill (activities[>0] with travelFromPrevious but no options)
    const daysNeedingIntraDayBackfill = manualDays
      .map((day, dayIndex) => ({ day, dayIndex }))
      .filter(({ day }) => (day.activities || []).some((activity, activityIndex) => {
        if (activityIndex <= 0 || !activity?.travelFromPrevious) return false;
        if (activity.travelFromPrevious.isCustomTransport) return false;
        const options = normalizeTransportOptions(
          activity?.travelFromPrevious?.transportOptions
          ?? activity?.travelFromPrevious?.TransportOptions,
          currencyCode,
        );
        return options.length === 0;
      }));

    // Days whose first activity (non-first day) has travelFromPrevious set but no transport options fetched yet
    const daysNeedingCrossDayIntraDayBackfill = manualDays
      .map((day, dayIndex) => ({ day, dayIndex }))
      .filter(({ day, dayIndex }) => {
        if (dayIndex === 0) return false;
        const firstActivity = day.activities?.[0];
        if (!firstActivity?.travelFromPrevious) return false;
        if (firstActivity.travelFromPrevious.isCustomTransport) return false;
        const options = normalizeTransportOptions(
          firstActivity.travelFromPrevious.transportOptions
          ?? firstActivity.travelFromPrevious.TransportOptions,
          currencyCode,
        );
        return options.length === 0;
      });

    // Days whose first activity is missing cross-day travel entirely (non-first days with activities)
    const daysNeedingCrossDayBackfill = manualDays
      .map((day, dayIndex) => ({ day, dayIndex }))
      .filter(({ day, dayIndex }) => {
        if (dayIndex === 0) return false;
        const firstActivity = day.activities?.[0];
        if (!firstActivity || firstActivity.travelFromPrevious != null) return false;
        const prevDay = manualDays[dayIndex - 1];
        return prevDay?.activities?.length > 0;
      });

    const daysNeedingBackfill = [
      ...daysNeedingIntraDayBackfill,
      ...daysNeedingCrossDayIntraDayBackfill.filter(
        ({ dayIndex }) => !daysNeedingIntraDayBackfill.some((d) => d.dayIndex === dayIndex),
      ),
      ...daysNeedingCrossDayBackfill.filter(
        ({ dayIndex }) => !daysNeedingIntraDayBackfill.some((d) => d.dayIndex === dayIndex)
          && !daysNeedingCrossDayIntraDayBackfill.some((d) => d.dayIndex === dayIndex),
      ),
    ];

    if (daysNeedingBackfill.length === 0) {
      setTransportOptionsBackfilled(true);
      return;
    }

    let cancelled = false;

    const backfill = async () => {
      try {
        const updates = await Promise.all(daysNeedingBackfill.map(async ({ dayIndex, day }) => {
          // Preserve existing cross-day travelFromPrevious before recalculate strips it
          const originalFirstTravel = dayIndex > 0 ? (day.activities?.[0]?.travelFromPrevious ?? null) : null;
          let nextActivities = await recalculateDayTravelAndEstimate(day.activities || []);
          
          // Also apply cross-day travel for the first activity if it's a non-first day
          if (dayIndex > 0 && nextActivities.length > 0 && nextActivities[0].travelFromPrevious == null) {
            const prevDay = manualDays[dayIndex - 1];
            const prevLastActivity = prevDay?.activities?.[prevDay.activities.length - 1];
            if (prevLastActivity) {
              nextActivities = [
                await estimateCrossDayTravel(prevLastActivity, nextActivities[0], originalFirstTravel),
                ...nextActivities.slice(1),
              ];
            }
          }
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
  }, [manualDays, recalculateDayTravelAndEstimate, estimateCrossDayTravel, transportOptionsBackfilled, tripInfo]);

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

      for (let activityIndex = 0; activityIndex < day.activities.length; activityIndex += 1) {
        const activity = day.activities[activityIndex];
        const customLocation = activity?.customLocation || null;
        if (!customLocation) continue;

        const resolvedCustomLocationTypeId = toPositiveIntOrNull(
          customLocation.locationTypeId
          ?? customLocation.LocationTypeId
          ?? activity.locationTypeId
          ?? activity.LocationTypeId,
        );
        if (!resolvedCustomLocationTypeId) {
          message.error(`Day ${dayIndex + 1}: custom location "${getActivityDisplayName(activity, `Location ${activityIndex + 1}`)}" requires location type.`);
          return;
        }
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

        const isCrossDayFirst = activityIndex === 0 && dayIndex > 0;
        const isFirstActivityOfTrip = activityIndex === 0 && dayIndex === 0;
        const previousActivity = activityIndex > 0
          ? sourceActivities[activityIndex - 1]
          : (isCrossDayFirst ? manualDays[dayIndex - 1]?.activities?.at(-1) : null);

        if (activity.travelFromPrevious) {
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
          const fromLabel = activity.travelFromPrevious.fromName || `Start ${activityIndex}`;
           const fromEndpoint = toTransportEndpointPayload(previousActivity, fromLabel);
           const toEndpoint = toTransportEndpointPayload(activity, name || `Destination ${activityIndex + 1}`);

           const transportPayload = {
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
           };

           // If the saved trip has a textual startingLocation (e.g. province name)
           // and the computed fromEndpoint does not reference a known locationId,
           // preserve that startingLocation into the first travel's customFromTransitHub
           // so backend and other flows can record the user-provided origin label.
            if ((tripInfo?.startingLocation || tripInfo?.userLocation || tripInfo?.UserLocation) && (activityIndex === 0 || isCrossDayFirst) && !fromEndpoint.locationId) {
              transportPayload.customFromTransitHub = transportPayload.customFromTransitHub || {};
              transportPayload.customFromTransitHub.name = pickFirstText(
                tripInfo?.userLocation?.name,
                tripInfo?.userLocation?.locationName,
                tripInfo?.UserLocation?.name,
                tripInfo?.UserLocation?.LocationName,
                tripInfo?.startingLocation,
                tripInfo?.StartingLocation,
              ) || 'Your location';
              const originLat = toFiniteNumber(tripInfo?.userLocation?.latitude ?? tripInfo?.UserLocation?.latitude ?? tripInfo?.UserLocation?.Latitude);
              const originLng = toFiniteNumber(tripInfo?.userLocation?.longitude ?? tripInfo?.UserLocation?.longitude ?? tripInfo?.UserLocation?.Longitude);
              if (originLat != null && originLng != null) {
                transportPayload.customFromTransitHub.latitude = originLat;
                transportPayload.customFromTransitHub.longitude = originLng;
              }
              const originAddress = pickFirstText(
                tripInfo?.userLocation?.address,
                tripInfo?.UserLocation?.address,
                tripInfo?.UserLocation?.Address,
              );
              if (originAddress) {
                transportPayload.customFromTransitHub.address = originAddress;
              }
            }

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
            transport: transportPayload,
            budget: {
              estimateCost: travelCostAmount,
            },
          });
        } else if (isFirstActivityOfTrip && !activity.travelFromPrevious
          && (tripInfo?.startingLocation || tripInfo?.userLocation || tripInfo?.UserLocation)
        ) {
          // No travel estimate (textual starting location, no coords) but the trip
          // has a starting point — create a minimal travel activity so the origin
          // label is persisted via customFromTransitHub.
          const originName = pickFirstText(
            tripInfo?.userLocation?.name,
            tripInfo?.userLocation?.locationName,
            tripInfo?.UserLocation?.name,
            tripInfo?.UserLocation?.LocationName,
            tripInfo?.startingLocation,
            tripInfo?.StartingLocation,
          ) || 'Your location';
          const originLat = toFiniteNumber(
            tripInfo?.userLocation?.latitude ?? tripInfo?.UserLocation?.latitude ?? tripInfo?.UserLocation?.Latitude,
          );
          const originLng = toFiniteNumber(
            tripInfo?.userLocation?.longitude ?? tripInfo?.UserLocation?.longitude ?? tripInfo?.UserLocation?.Longitude,
          );
          const originAddress = pickFirstText(
            tripInfo?.userLocation?.address,
            tripInfo?.UserLocation?.address,
            tripInfo?.UserLocation?.Address,
          );

          mappedActivities.push({
            type: 2,
            title: `Move to ${name || 'Location 1'}`,
            startTime: visitStartTime || '08:00:00',
            endTime: visitStartTime || '08:00:00',
            locationId: null,
            customLocationId: null,
            customLocation: null,
            transport: {
              transportModeId: null,
              distanceKm: 0,
              travelTimeMinutes: 0,
              fromLocationId: null,
              toLocationId: toPositiveIntOrNull(activity.locationId) || null,
              customFromTransitHub: {
                name: originName,
                ...(originLat != null && originLng != null ? {
                  latitude: originLat,
                  longitude: originLng,
                  address: originAddress || null,
                } : {}),
              },
              customToTransitHub: null,
            },
            budget: { estimateCost: 0 },
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
            ? (() => {
                const resolvedCustomLocationTypeId = toPositiveIntOrNull(
                  activity.customLocation.locationTypeId
                  ?? activity.customLocation.LocationTypeId
                  ?? activity.locationTypeId,
                );
                return {
                  name: String(activity.customLocation.name || name).trim(),
                  latitude: toNumberOrDefault(activity.customLocation.latitude, 0),
                  longitude: toNumberOrDefault(activity.customLocation.longitude, 0),
                  address: String(activity.customLocation.address || activity.address || '').trim() || null,
                  description: String(activity.customLocation.description || activity.customLocation.Description || '').trim() || null,
                  locationTypeId: resolvedCustomLocationTypeId,
                };
              })()
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
      if (editMode) {
        await updateSavedTripApi(tripId, payload);
        clearDraftStorage(tripId);
        message.success('Trip updated successfully.');
        navigate(PATHS.TRIP_DETAIL.replace(':id', String(tripId)));
      } else {
        const result = await saveTripApi(payload);
        clearDraftStorage(tripId);
        message.success('Manual trip saved successfully.');
        const savedTripId = Number(result?.tripId ?? result?.TripId ?? result?.id ?? result?.Id);
        if (Number.isFinite(savedTripId) && savedTripId > 0) {
          navigate(PATHS.TRIP_DETAIL.replace(':id', String(savedTripId)));
        } else {
          navigate(PATHS.TRIP_DETAIL.replace(':id', String(tripId)));
        }
      }
    } catch (error) {
      const responseData = error?.response?.data;
      const errorMessage = responseData?.detail || responseData?.title || responseData?.message || (editMode ? 'Cannot update trip.' : 'Cannot save manual trip.');
      message.error(errorMessage);
    } finally {
      setSavingTrip(false);
    }
  };

  return (
    <div className={styles.appWrapper}>
      <div className={styles.floatingCircle1} />
      <div className={styles.floatingCircle2} />
      <div className={styles.content}>
        {!tripId && (
          <Alert
            type="warning"
            showIcon
            message="Trip not found"
            description="Please start from Manual Trip Setup to create a trip first."
            className={styles.tripAlert}
          />
        )}

        {loadingTrip && (
          <Card bordered={false} className={styles.loadingCard}>
            <Spin tip="Loading trip information..." style={{ display: 'flex', justifyContent: 'center' }} />
          </Card>
        )}

        {tripId && tripInfo && (
          <>
            <Card bordered={false} className={styles.headerCard}>
              <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col flex="auto">
                  <Title level={3} style={{ color: 'white', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {editMode ? `Editing: ${tripInfo.tripName}` : tripInfo.tripName}
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
              <Title level={3} style={{ marginTop: 0, marginBottom: 2 }}>
                {editMode ? 'Edit Itinerary' : 'Manual Day & Location Builder'}
              </Title>
              <Text type="secondary">
                {editMode
                  ? 'Modify days and locations below. Changes will overwrite the existing itinerary when saved.'
                  : 'Flow independent from Itinerary screen. Add each day and each location, estimate updates automatically.'}
              </Text>

              <Card bordered={false} className={styles.originCard}>
                <div className={styles.originHeaderRow}>
                  <div>
                    <Text strong>Trip origin</Text>
                    <div className={styles.originSubtext}>This origin is used for the first travel leg and stays outside the draggable location list.</div>
                  </div>
                  <Space wrap>
                    <Button onClick={() => setOriginMapOpen(true)}>Pick on Map</Button>
                  </Space>
                </div>
                <div className={styles.originMetaRow}>
                  <Tag color={manualOrigin.latitude != null && manualOrigin.longitude != null ? 'processing' : 'default'}>
                    {manualOrigin.latitude != null && manualOrigin.longitude != null
                      ? `${manualOrigin.latitude.toFixed(6)}, ${manualOrigin.longitude.toFixed(6)}`
                      : 'Pick on Map to set origin coordinates'}
                  </Tag>
                </div>
              </Card>

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
                  className={styles.emptyState}
                >
                  <Button type="primary" icon={<PlusOutlined />} onClick={addDay}>
                    Add First Day
                  </Button>
                </Empty>
              )}

              {manualDays.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                <SortableContext items={manualDays.map((d) => d.id)} strategy={verticalListSortingStrategy}>
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

                    const collapseItems = [
                      {
                        key: '1',
                        label: (
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Space>
                              <span style={{ fontWeight: 600, color: '#1A535C' }}>{day.dayTitle || `Day ${dayIndex + 1}`}</span>
                              <Tag color="cyan" style={{ margin: 0 }}>{formatMoney(dayEstimate, tripInfo.currencyCode)}</Tag>
                            </Space>
                          </div>
                        ),
                        extra: (
                          <Space onClick={(e) => e.stopPropagation()}>
                            <Button type="text" className={styles.btnSm} icon={<ArrowUpOutlined />} onClick={() => moveDayUp(day.id)} disabled={dayIndex === 0 || reorderRecalculating} title="Move day up" style={{ color: '#8c8c8c' }} />
                            <Button type="text" className={styles.btnSm} icon={<ArrowDownOutlined />} onClick={() => moveDayDown(day.id)} disabled={dayIndex === manualDays.length - 1 || reorderRecalculating} title="Move day down" style={{ color: '#8c8c8c' }} />
                            <Button type="dashed" className={styles.btnSm} icon={<PlusOutlined />} onClick={() => openAddLocationModal(day.id)}>Add Location</Button>
                            <Button danger type="text" className={styles.btnSm} icon={<DeleteOutlined />} onClick={() => removeDay(day.id)} disabled={manualDays.length <= 1}>Remove Day</Button>
                          </Space>
                        ),
                        children: (
                          <>
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
                                style={{ marginTop: 24, marginBottom: 4 }}
                              >
                                <Button icon={<PlusOutlined />} onClick={() => openAddLocationModal(day.id)}>
                                  Add First Location
                                </Button>
                              </Empty>
                            )}

                            {(day.activities || []).length > 0 && (
                              <div className={styles.activityList}>
                                <SortableContext
                                  items={(day.activities || []).map((a) => a.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className={styles.timeline} style={{ marginTop: 24 }}>
                                    {(day.activities || []).map((activity, activityIndex) => {
                                      const isLastActivity = activityIndex === (day.activities || []).length - 1;
                                      const isFirstActivity = activityIndex === 0;
                                      const previousActivity = activityIndex > 0 ? day.activities?.[activityIndex - 1] : null;
                                      const travelFromPrevious = activity.travelFromPrevious || null;
                                      const isTransportOptionsOpen = openTransportOptionIds[activity.id] ?? true;
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
                                          {travelFromPrevious && (
                                            <div className={styles.timelineItem}>
                                              <div className={styles.timelineLine} />
                                              <div className={styles.timelineTime}>
                                                <span className={styles.timelineTimeStart}>{toInputTimeValue(travelFromPrevious.departureTime)}</span>
                                                <span className={styles.timelineTimeEnd}>{toInputTimeValue(travelFromPrevious.arrivalTime)}</span>
                                                <span className={styles.timelineDuration}>{formatMinutes(travelFromPrevious.travelMinutes)}</span>
                                              </div>
                                              <div className={styles.timelineIcon} style={{ background: 'rgba(255, 230, 109, 0.3)' }}>
                                                <NavigationArrow size={24} weight="bold" color="#D89A00" />
                                              </div>
                                              <div className={styles.timelineContent}>
                                                <div className={`${styles.card} ${styles.travelCard}`}>
                                                  <div className={styles.travelRoute}>
                                                    <div className={styles.travelPoint}>
                                                      <div className={styles.dot}></div>
                                                      <span>{fromLabel}</span>
                                                    </div>
                                                    <div className={styles.travelLine}>
                                                      <div className={styles.travelIconWrapper}>
                                                        <NavigationArrow size={24} weight="bold" color="#D89A00" />
                                                      </div>
                                                    </div>
                                                    <div className={styles.travelPoint}>
                                                      <div className={styles.dot}></div>
                                                      <span>{toLabel}</span>
                                                    </div>
                                                  </div>

                                                  <div className={styles.travelMetaLine}>
                                                    <div className={styles.travelMeta}>
                                                      <ClockIcon size={16} weight="bold" />
                                                      <Text style={{ color: '#D89A00', fontWeight: 600 }}>
                                                        {formatMinutes(travelFromPrevious.travelMinutes)}
                                                        {travelFromPrevious.distanceKm > 0 ? ` • ${travelFromPrevious.distanceKm.toFixed(travelFromPrevious.distanceKm >= 10 ? 0 : 1)} km` : ''}
                                                        {selectedTransportLabel ? ` • ${selectedTransportLabel}` : ''}
                                                      </Text>
                                                    </div>
                                                  </div>

                                                  <div className={styles.travelCost}>
                                                    <span className={styles.costAmount}>{formatMoney(travelFromPrevious.costAmount, travelFromPrevious.costCurrency || tripInfo.currencyCode)}</span>
                                                  </div>

                                                  {hasTransportOptions && (
                                                    <div className={styles.transportOptionsSection}>
                                                      <Collapse
                                                        activeKey={isTransportOptionsOpen ? ['1'] : []}
                                                        onChange={(keys) => setOpenTransportOptionIds((prev) => ({
                                                          ...prev,
                                                          [activity.id]: keys.length > 0,
                                                        }))}
                                                        className={styles.innerCollapse}
                                                        bordered={false}
                                                        expandIconPosition="end"
                                                        items={[
                                                          {
                                                            key: '1',
                                                            className: styles.innerCollapsePanel,
                                                            label: <span className={styles.innerCollapseLabel}>Transport options ({transportOptions.length + 1})</span>,
                                                            children: (
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
                                                            )
                                                          }
                                                        ]}
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          <SortableActivityCard
                                            id={activity.id}
                                            dayId={day.id}
                                            disabled={reorderRecalculating || addingLocation}
                                          >
                                            {({ dragHandle: activityDragHandle }) => (
                                              <div className={styles.timelineItem}>
                                                {!isLastActivity && <div className={styles.timelineLine} />}
                                                <div className={styles.timelineTime}>
                                                  <span className={styles.timelineTimeStart}>{toInputTimeValue(activity.startTime)}</span>
                                                  <span className={styles.timelineTimeEnd}>{toInputTimeValue(activity.endTime)}</span>
                                                </div>
                                                <div className={styles.timelineIcon} style={{ background: 'rgba(78, 205, 196, 0.2)' }}>
                                                  <MapPinLine size={24} weight="bold" color="#24A096" />
                                                </div>

                                                <div className={styles.timelineContent}>
                                                  <div className={`${styles.card} ${styles.visitCard}`} style={{ position: 'relative' }}>
                                                    <div className={styles.cardFloatingActions}>
                                                      <Space size={4}>
                                                        <Button
                                                          type="text"
                                                          size="small"
                                                          icon={<ArrowUpOutlined />}
                                                          onClick={() => moveActivityUp(day.id, activity.id)}
                                                          disabled={isFirstActivity || reorderRecalculating}
                                                          title="Move up"
                                                          style={{ color: '#8c8c8c' }}
                                                        />
                                                        <Button
                                                          type="text"
                                                          size="small"
                                                          icon={<ArrowDownOutlined />}
                                                          onClick={() => moveActivityDown(day.id, activity.id)}
                                                          disabled={isLastActivity || reorderRecalculating}
                                                          title="Move down"
                                                          style={{ color: '#8c8c8c' }}
                                                        />
                                                        <Button
                                                          danger
                                                          type="text"
                                                          size="small"
                                                          icon={<DeleteOutlined />}
                                                          onClick={() => removeActivity(day.id, activity.id)}
                                                          loading={addingLocation}
                                                          disabled={reorderRecalculating}
                                                          style={{ fontWeight: 600 }}
                                                        >
                                                          Remove
                                                        </Button>
                                                      </Space>
                                                    </div>

                                                    <div className={styles.visitTop}>
                                                      <div className={styles.visitDetails}>
                                                        <div className={styles.visitInfo}>
                                                          <div className={styles.dragHandleWrapper}>
                                                            {activityDragHandle}
                                                          </div>
                                                          <h3 className={styles.title}>{activity.destinationName || `Location ${activityIndex + 1}`}</h3>
                                                        </div>
                                                        <p className={styles.address}>{activity.address || '-'}</p>

                                                        <div className={styles.activityConfigGrid} style={{ marginTop: 12 }}>
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
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </SortableActivityCard>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                </SortableContext>

                                <Button
                                  type="dashed"
                                  icon={<PlusOutlined />}
                                  onClick={() => openAddLocationModal(day.id)}
                                  style={{ marginLeft: 32 }}
                                >
                                  Add Location
                                </Button>
                              </div>
                            )}
                          </>
                        )
                      }
                    ];

                    return (
                      <SortableDayCard key={day.id} id={day.id} disabled={reorderRecalculating || addingLocation}>
                        {({ dragHandle }) => (
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 12, left: -28, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              {dragHandle}
                            </div>
                            <Collapse
                              defaultActiveKey={['1']}
                              className={styles.dayCard}
                              bordered={false}
                              expandIconPosition="end"
                              items={collapseItems}
                            />
                          </div>
                        )}
                      </SortableDayCard>
                    );
                  })}
                </Space>
                </SortableContext>
                <DragOverlay>
                  {activeDragItem && (
                    <div style={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: 6, padding: '8px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', opacity: 0.95 }}>
                      {activeDragItem.type === 'day' ? '📅' : '📍'} {activeDragItem.label}
                    </div>
                  )}
                </DragOverlay>
                </DndContext>
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
              {editMode && (
                <Button
                  onClick={() => navigate(PATHS.TRIP_DETAIL.replace(':id', String(tripId)))}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingTrip}
                onClick={handleSaveManualTrip}
              >
                {editMode ? 'Save Changes' : 'Save Manual Trip'}
              </Button>
            </div>

            <GoogleMapPicker
              open={originMapOpen}
              onClose={() => setOriginMapOpen(false)}
              onConfirm={handleManualOriginMapConfirm}
              initialLat={manualOrigin.latitude}
              initialLng={manualOrigin.longitude}
            />
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
        rootClassName={styles.tropicalModal}
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
                <span className={styles.editTimelineLabel}>Location type</span>
                <Select
                  showSearch
                  allowClear
                  className={styles.editTimelineInput}
                  placeholder="Select location type"
                  value={customLocationTypeId}
                  onChange={(value) => setCustomLocationTypeId(value ?? null)}
                  loading={loadingLocationTypes}
                  optionFilterProp="label"
                  options={locationTypes.map((typeOption) => ({
                    label: typeOption.name,
                    value: typeOption.id,
                  }))}
                  notFoundContent={loadingLocationTypes ? <Spin size="small" /> : 'No location types'}
                />
              </div>

              <div className={styles.editTimelineField}>
                <span className={styles.editTimelineLabel}>Description</span>
                <Input
                  className={styles.editTimelineInput}
                  placeholder="Describe this custom location"
                  value={customDescription}
                  onChange={(event) => setCustomDescription(event?.target?.value || '')}
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
                      attribution='© <a href="https://www.google.com/maps">Google Maps</a>'
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
                disabled={!customLocationTypeId}
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
