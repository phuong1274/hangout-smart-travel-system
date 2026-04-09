import React, { useState, useCallback, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Space, ConfigProvider, Collapse, Radio } from 'antd';
import { 
  Car, 
  Van, 
  Motorcycle, 
  PersonSimpleWalk, 
  AirplaneTilt, 
  Bus, 
  Train, 
  NavigationArrow, 
  MapPinLine, 
  ForkKnife, 
  SignIn, 
  SignOut, 
  SuitcaseRolling 
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useTripPlanner } from '../hooks/useTripPlanner';
import { getLocationByIdApi, getProvincesApi } from '../api';
import LocationDetailModal from '../components/LocationDetailModal';
import TransportDetailModal from '../components/TransportDetailModal';
import AccommodationDetailModal from '../components/AccommodationDetailModal';
import styles from '../styles/ItineraryResultPage.module.css';

const { Title, Text } = Typography;

const EVENT_BADGES = {
  travel: { badge: <NavigationArrow weight="duotone" />, bg: '#CCF2F0' },
  visit: { badge: <MapPinLine weight="duotone" />, bg: '#FFD8D8' },
  meal: { badge: <ForkKnife weight="duotone" />, bg: '#FFF4CC' },
  'check-in': { badge: <SignIn weight="duotone" />, bg: '#E8F8F5' },
  'check-out': { badge: <SignOut weight="duotone" />, bg: '#F2F4F4' },
  'luggage-refresh': { badge: <SuitcaseRolling weight="duotone" />, bg: '#FDEBD0' },
};

const getTransportIcon = (methodName) => {
  const name = String(methodName || '').toLowerCase();
  
  if (name.includes('plane')) return <AirplaneTilt weight="duotone" />;
  if (name.includes('train')) return <Train weight="duotone" />;
  if (name.includes('bus')) return <Bus weight="duotone" />;
  if (name.includes('4-seater')) return <Car weight="duotone" />;
  if (name.includes('7-seater')) return <Van weight="duotone" />;
  if (name.includes('grab')) return <Motorcycle weight="duotone" />;
  if (name.includes('walk')) return <PersonSimpleWalk weight="duotone" />;
  
  return <NavigationArrow weight="duotone" />;
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
    travelDetail.FromProvinceId != null ? `Province #${travelDetail.FromProvinceId}` : '',
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

const isIntercityTravel = (travelDetail) => {
  if (!travelDetail) return false;
  const distance = Number(travelDetail.distanceKm ?? travelDetail.DistanceKm);
  return Number.isFinite(distance) && distance >= 100;
};

const formatMoney = (moneyDto) => {
  if (!moneyDto) return null;
  const amount = moneyDto.amount ?? moneyDto.Amount ?? 0;
  const currency = moneyDto.currency || moneyDto.Currency || 'VND';
  const roundedAmount = Math.round(amount);
  return `${roundedAmount.toLocaleString()} ${currency}`;
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

const getTravelMethod = (travelDetail) => {
  return pickFirstText(
    travelDetail?.selectedMethod,
    travelDetail?.SelectedMethod,
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

  return null;
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
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      return String(item?.url || item?.Url || item?.mediaUrl || item?.MediaUrl || '').trim();
    })
    .filter(Boolean);
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

const getCardStyle = (type, stylesObj) => {
  if (type === 'visit') return stylesObj.cardVisit;
  if (type === 'meal') return stylesObj.cardMeal;
  if (type === 'travel') return stylesObj.cardTravel;
  if (['check-in', 'check-out', 'luggage-refresh'].includes(type)) return stylesObj.cardLogistics;
  return stylesObj.cardVisit;
};

const ItineraryResultPage = () => {
  const navigate = useNavigate();
  const { itinerary, clearItinerary } = useTripPlanner();
  const [provinceNameById, setProvinceNameById] = useState(new Map());
  const [locationNameById, setLocationNameById] = useState(new Map());
  const [locationMediaById, setLocationMediaById] = useState(new Map());
  const [locationTelephoneById, setLocationTelephoneById] = useState(new Map());
  const [locationAmenitiesById, setLocationAmenitiesById] = useState(new Map());
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  const [selectedTransports, setSelectedTransports] = useState({});
  const [expandedAlts, setExpandedAlts] = useState({});

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
            const mediaUrls = extractMediaUrls(
              data?.mediaLinks 
              || data?.mediaUrls
              || data?.MediaUrls
              || data?.images
              || data?.Images
              || data?.medias
              || data?.Medias
              || []
            );
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

  const handleViewTransport = useCallback((item) => {
    const travelData = item.locationToLocationTravel || item.LocationToLocationTravel
      || item.transitHubToLocationTravel || item.TransitHubToLocationTravel
      || item.locationToTransitHubTravel || item.LocationToTransitHubTravel
      || item.provinceToProvinceTravel || item.ProvinceToProvinceTravel;
    setTransportModal({ open: true, data: { ...item, travelDetail: travelData } });
  }, []);

  const handleViewAccommodation = useCallback((data) => {
    setAccommodationModal({ open: true, data });
  }, []);

  const handleTransportChange = useCallback((itemKey, optionIdx) => {
    setSelectedTransports((prev) => ({ ...prev, [itemKey]: optionIdx }));
  }, []);

  const handleToggleAlts = useCallback((itemKey) => {
    setExpandedAlts((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  }, []);

  const handleRegenerate = () => {
    clearItinerary();
    navigate('/create-trip');
  };

  const themeConfig = {
    token: {
      colorPrimary: '#FF6B6B',
      colorTextBase: '#1A535C',
      colorBgBase: '#FFFFFF',
      fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
      borderRadius: 16,
    },
    components: {
      Button: {
        colorPrimary: '#FFE66D',
        colorTextLightSolid: '#1A535C',
        borderRadius: 8,
        controlHeight: 44,
        fontWeight: 600,
      },
      Card: {
        colorBgContainer: '#FFFFFF',
        borderRadiusOuter: 20,
        boxShadow: '0 8px 24px rgba(26, 83, 92, 0.08)',
      },
      Tag: {
        borderRadiusSM: 8,
      },
      Radio: {
        colorPrimary: '#FF6B6B',
      }
    }
  };

  if (!itinerary) {
    return (
      <ConfigProvider theme={themeConfig}>
        <div className={styles.itineraryPage}>
          <div className={styles.container}>
            <div className={styles.emptyState}>
              <Empty description={<span className={styles.emptyText}>No itinerary has been generated yet</span>} />
              <Button type="primary" onClick={() => navigate('/create-trip')} className={styles.ctaButton}>
                Create New Itinerary
              </Button>
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
    <ConfigProvider theme={themeConfig}>
      <div className={styles.itineraryPage}>
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

          {days.map((day, idx) => {
            const dayNum = day.dayNumber || day.DayNumber;
            const rawDayTitle = day.dayTitle || day.DayTitle || `Day ${dayNum}`;
            const date = day.date || day.Date;
            const weather = day.weatherSummary || day.WeatherSummary;
            const timeline = day.timeline || day.Timeline || [];
            const estimatedCost = day.estimatedDayCost || day.EstimatedDayCost;
            const accommodations = day.accommodationRecommendations || day.AccommodationRecommendations || [];

            const currentProvinceId = Number(day.provinceId || day.ProvinceId);
            const currentProvinceName = provinceNameById.get(currentProvinceId);
            const prevDay = idx > 0 ? days[idx - 1] : null;
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
              <Card 
                key={dayNum} 
                className={styles.dayCard} 
                bordered={false} 
                bodyStyle={{ padding: 0 }}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className={styles.dayHeader}>
                  <div className={styles.dayTitle}>{dayTitle}</div>
                  <div className={styles.dayMeta}>
                    {date && <span className={styles.dayDate}>{date}</span>}
                    {weather && (
                      <span className={styles.dayWeather} title={weather}>
                        <span className={styles.dayWeatherLabel}>Weather</span>
                        <span className={styles.dayWeatherValue}>{weather}</span>
                      </span>
                    )}
                  </div>
                </div>

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

                    const transportOptions = isTravel ? getTransportOptions(travelDetail) : [];
                    const itemKey = `day-${dayNum}-idx-${idx}`;
                    let defaultOptIdx = 0;
                    if (transportOptions.length > 0) {
                      const recIdx = transportOptions.findIndex((o) => Boolean(o?.recommended ?? o?.Recommended));
                      if (recIdx !== -1) defaultOptIdx = recIdx;
                    }
                    const activeTransportIdx = selectedTransports[itemKey] ?? defaultOptIdx;
                    const activeTransport = transportOptions[activeTransportIdx] || null;

                    let displayTravelMethod = isTravel ? getTravelMethod(travelDetail) : '';
                    let displayTravelMinutes = isTravel ? getTravelDurationMinutes(travelDetail) : null;
                    let displayTravelDistanceKm = isTravel ? toFiniteNumber(travelDetail?.distanceKm ?? travelDetail?.DistanceKm) : null;
                    const defaultCostForGroup = isTravel ? pickBestMoney(item.costForGroup, item.CostForGroup, travelDetail?.selectedTotalCost, travelDetail?.SelectedTotalCost) : (item.costForGroup || item.CostForGroup);
                    let displayTravelCost = defaultCostForGroup;

                    if (isTravel && activeTransport) {
                      displayTravelMethod = pickFirstText(activeTransport.method, activeTransport.Method) || displayTravelMethod;
                      displayTravelMinutes = toFiniteNumber(activeTransport.estimatedTravelMinutes ?? activeTransport.EstimatedTravelMinutes) || displayTravelMinutes;
                      displayTravelCost = pickBestMoney(activeTransport.costForGroup, activeTransport.CostForGroup, activeTransport.estimatedTotalCost, activeTransport.EstimatedTotalCost) || displayTravelCost;
                      displayTravelDistanceKm = toFiniteNumber(activeTransport.distanceKm ?? activeTransport.DistanceKm) || displayTravelDistanceKm;
                    }

                    const travelMetaParts = [];
                    if (displayTravelMethod) travelMetaParts.push(displayTravelMethod);
                    if (displayTravelDistanceKm != null && displayTravelDistanceKm > 0) {
                      travelMetaParts.push(`${displayTravelDistanceKm.toFixed(displayTravelDistanceKm >= 10 ? 0 : 1)} km`);
                    }
                    if (displayTravelMinutes != null && displayTravelMinutes > 0) {
                      travelMetaParts.push(formatMinutesAsHourMinute(displayTravelMinutes));
                    }
                    const travelMetaText = travelMetaParts.join(' • ');

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
                    
                    const ticketCost = item.ticketCost || item.TicketCost;
                    const rawNote = item.note || item.Note || '';
                    const alternatives = item.alternatives || item.Alternatives || [];
                    const hasManyAlts = alternatives.length > 10;
                    const isAltExpanded = expandedAlts[itemKey] || false;
                    const displayAlts = (hasManyAlts && !isAltExpanded) ? alternatives.slice(0, 10) : alternatives;
                    
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
                    
                    // --- ĐÃ SỬA: ƯU TIÊN LẤY ẢNH TỪ DATA FETCH BẰNG FALLBACK LOGIC ---
                    const mediaUrls = extractMediaUrls(item.mediaUrls || item.MediaUrls || []);
                    const firstMediaUrl = mediaUrls.length > 0 
                      ? mediaUrls[0] 
                      : (Number.isFinite(locationIdNum) ? (locationMediaById.get(locationIdNum)?.[0] || null) : null);

                    const scoreValue = item.score ?? item.Score ?? item.rating ?? item.Rating;
                    const displayScore = formatScoreLabel(scoreValue);
                    const cleanedNote = String(rawNote)
                      .replace(/score\s*:\s*[0-9]+(?:[.,][0-9]+)?/gi, '')
                      .replace(/\s{2,}/g, ' ')
                      .trim();
                    const note = translateNoteToEnglish(cleanedNote, eventType);

                    return (
                      <div key={idx} className={styles.timelineItem}>
                        <div className={styles.timelineTime}>
                          <span className={styles.timelineTimeStart}>{startTimeLabel}</span>
                          {endTimeLabel && <span className={styles.timelineTimeEnd}>{endTimeLabel}</span>}
                        </div>
                        <div
                          className={styles.timelineIcon}
                          style={{ background: eventConfig.bg, color: '#1A535C' }}
                        >
                          {eventConfig.badge}
                        </div>
                        <div className={`${styles.timelineContent} ${styles.timelineCardBase} ${getCardStyle(eventType, styles)}`}>
                          
                          {isTravel && transportOptions.length > 0 ? (
                            <Collapse 
                              ghost 
                              expandIconPosition="end"
                              className={styles.travelCollapseWrap}
                              items={[{
                                key: '1',
                                label: (
                                  <div className={styles.travelHeaderWrap}>
                                    <div className={styles.timelineCardHeader}>
                                      <div className={styles.timelineTitle}>
                                        <span>{title}</span>
                                        {displayTags.length > 0 && (
                                          <div className={styles.titleTags}>
                                            {displayTags.map((tagLabel, tagIdx) => (
                                              <Tag key={`${idx}-tag-${tagIdx}`} className={styles.tropicalTagPrimary}>
                                                {tagLabel}
                                              </Tag>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className={styles.timelineCost}>
                                        {displayTravelCost ? (
                                          <div className={styles.costAmount}>{formatMoney(displayTravelCost)}</div>
                                        ) : (
                                          <div className={styles.costUnknown}>N/A</div>
                                        )}
                                        <div className={styles.timelineDuration}>
                                          {displayTravelMinutes ? formatMinutesAsHourMinute(displayTravelMinutes) : getDurationStr(startTime, endTime)}
                                        </div>
                                      </div>
                                    </div>
                                    {travelMetaText && (
                                      <div className={styles.timelineTransportMeta}>{travelMetaText}</div>
                                    )}
                                  </div>
                                ),
                                children: (
                                  <Radio.Group 
                                    value={activeTransportIdx}
                                    onChange={(e) => handleTransportChange(itemKey, e.target.value)}
                                    className={styles.transportRadioGroup}
                                  >
                                    {transportOptions.map((option, optionIdx) => {
                                      const optionMethod = pickFirstText(option?.method, option?.Method, `Option ${optionIdx + 1}`);
                                      const optionMinutes = toFiniteNumber(option?.estimatedTravelMinutes ?? option?.EstimatedTravelMinutes);
                                      const optionCost = pickBestMoney(option?.costForGroup, option?.CostForGroup, option?.estimatedTotalCost, option?.EstimatedTotalCost);
                                      const optionRecommended = Boolean(option?.recommended ?? option?.Recommended);
                                      const optionRouteText = getTransportOptionRouteText(option);

                                      return (
                                        <Radio key={optionIdx} value={optionIdx} className={styles.transportOptionItemRadio}>
                                          <div className={styles.transportOptionItemContent}>
                                            <div className={styles.transportOptionMain}>
                                              <span className={styles.transportOptionName}>
                                                <Space size={6}>
                                                  {getTransportIcon(optionMethod)}
                                                  <span>{optionMethod}</span>
                                                </Space>
                                              </span>
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
                                        </Radio>
                                      );
                                    })}
                                  </Radio.Group>
                                )
                              }]}
                            />
                          ) : (
                            <div className={styles.cardTwoColumnLayout}>
                                <div className={styles.cardLeftPanel}>
                                    <div className={styles.timelineCardHeader}>
                                        <div className={styles.timelineTitle}>
                                            <span>{title}</span>
                                            {displayTags.length > 0 && (
                                                <div className={styles.titleTags}>
                                                    {displayTags.map((tagLabel, tagIdx) => (
                                                        <Tag key={`${idx}-tag-${tagIdx}`} className={styles.tropicalTagPrimary}>
                                                            {tagLabel}
                                                        </Tag>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.timelineCost}>
                                            {displayTravelCost ? (
                                                <div className={styles.costAmount}>{formatMoney(displayTravelCost)}</div>
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
                                                <Tag key={`${idx}-amenity-${amenityIdx}`} className={styles.tropicalTag}>
                                                    {amenity}
                                                </Tag>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className={styles.timelineActions}>
                                        {locationId && !isTravel && (
                                            <Button
                                                type="button"
                                                className={styles.viewDetailsBtn}
                                                onClick={() => handleViewLocation(locationId)}
                                            >
                                                View Details
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                {firstMediaUrl && (
                                    <div className={styles.cardRightMedia}>
                                        <img
                                            src={firstMediaUrl}
                                            alt={`${title} main`}
                                            className={styles.mainMediaImage}
                                            loading="lazy"
                                        />
                                    </div>
                                )}
                            </div>
                          )}

                          {alternatives.length > 0 && (
                            <div className={styles.alternativeSection}>
                              <div className={styles.alternativeHeader}>Alternative Options</div>
                              <div className={styles.alternativeScrollContainer}>
                                {displayAlts.map((alternative, altIdx) => {
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
                                      <div className={styles.altLeftPanel}>
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
                                                className={styles.tropicalTag}
                                              >
                                                {amenity}
                                              </Tag>
                                            ))}
                                          </div>
                                        )}
                                        <div className={styles.alternativeActions}>
                                          {altScoreLabel && (
                                            <div className={styles.timelineScore}>
                                              <span className={styles.timelineScoreBadge}>Score</span>
                                              <span className={styles.timelineScoreValue}>{altScoreLabel}</span>
                                            </div>
                                          )}
                                          {altLocationId && (
                                            <Button
                                              type="button"
                                              className={styles.viewDetailsBtnAlt}
                                              onClick={() => handleViewLocation(altLocationId)}
                                            >
                                              View
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      {altMediaUrls.length > 0 && (
                                        <div className={styles.altRightMedia}>
                                          <img
                                            src={altMediaUrls[0]}
                                            alt={altName}
                                            className={styles.altMediaImage}
                                            loading="lazy"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {hasManyAlts && (
                                <div className={styles.expandAltsWrap}>
                                  <Button 
                                    type="text" 
                                    className={styles.expandAltsBtn} 
                                    onClick={() => handleToggleAlts(itemKey)}
                                  >
                                    {isAltExpanded ? 'Show Less Options' : `View ${alternatives.length - 10} More Options`}
                                  </Button>
                                </div>
                              )}
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
                              {price && <Text strong className={styles.accPrice}>{formatMoney(price)}/night</Text>}
                              <Button
                                type="button"
                                className={styles.viewDetailsBtn}
                                onClick={() => handleViewAccommodation(acc)}
                              >
                                Details
                              </Button>
                            </Space>
                          </div>
                          {accommodationAmenities.length > 0 && (
                            <div className={styles.timelineAmenities}>
                              {accommodationAmenities.map((amenity, amenityIdx) => (
                                <Tag key={`${i}-acc-amenity-${amenityIdx}`} className={styles.tropicalTag}>
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

                <div className={styles.daySummary}>
                  <div className={styles.daySummaryItem}>
                    <Text className={styles.summaryLabel}>Estimated Cost:</Text>
                    <Text className={styles.summaryValue}>{formatMoney(estimatedCost)}</Text>
                  </div>
                </div>
              </Card>
            );
          })}

          <div className={styles.actionBar}>
            <Button type="primary" onClick={handleRegenerate} className={styles.ctaButton}>
              Regenerate
            </Button>
            <Button onClick={() => navigate('/create-trip')} className={styles.secondaryButton}>
              Edit
            </Button>
          </div>
        </div>

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
    </ConfigProvider>
  );
};

export default ItineraryResultPage;