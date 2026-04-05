import React, { useState, useCallback, useEffect } from 'react';
import { Card, Typography, Button, Tag, Empty, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTripPlanner } from '../hooks/useTripPlanner';
import { getLocationByIdApi, getProvincesApi } from '../api';
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
    travelDetail.fromEnglishName,
    travelDetail.FromEnglishName,
    travelDetail.fromName,
    travelDetail.FromName,
    travelDetail.from,
    travelDetail.From,
  );
  const toName = pickFirstText(
    travelDetail.toEnglishName,
    travelDetail.ToEnglishName,
    travelDetail.toName,
    travelDetail.ToName,
    travelDetail.to,
    travelDetail.To,
  );

  if (fromName && toName) return `From ${fromName} to ${toName}`;
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
  return `${amount.toLocaleString()} ${currency}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Handle TimeOnly format "HH:mm:ss" or "HH:mm"
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
};

const getDurationStr = (start, end) => {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return '';
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getEnglishPreferredName = (item) => {
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  const localName = String(item?.name || item?.Name || '').trim();
  return englishName || localName || '';
};

const formatRatingOutOfFive = (value) => {
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

  const rounded = Math.min(5, Math.max(0, Math.ceil(normalized)));
  return `${rounded}/5`;
};

const ItineraryResultPage = () => {
  const navigate = useNavigate();
  const { itinerary, clearItinerary } = useTripPlanner();
  const [provinceNameById, setProvinceNameById] = useState(new Map());
  const [locationNameById, setLocationNameById] = useState(new Map());
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);

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

    const loadLocationNames = async () => {
      const days = itinerary?.days || itinerary?.Days || [];
      const locationIds = [...new Set(
        days
          .flatMap((day) => (day.timeline || day.Timeline || []))
          .map((item) => Number(item.locationId || item.LocationId))
          .filter((id) => Number.isFinite(id) && id > 0)
      )];

      if (locationIds.length === 0) {
        if (mounted) setLocationNameById(new Map());
        return;
      }

      try {
        const entries = await Promise.all(locationIds.map(async (id) => {
          try {
            const data = await getLocationByIdApi(id);
            return [id, getEnglishPreferredName(data)];
          } catch {
            return [id, null];
          }
        }));

        if (!mounted) return;

        const map = new Map();
        entries.forEach(([id, name]) => {
          if (name) map.set(id, name);
        });
        setLocationNameById(map);
      } catch {
        if (mounted) setLocationNameById(new Map());
      }
    };

    loadLocationNames();
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
      || item.locationToTransitHubTravel || item.LocationToTransitHubTravel;
    setTransportModal({ open: true, data: { ...item, travelDetail: travelData } });
  }, []);

  const handleViewAccommodation = useCallback((data) => {
    setAccommodationModal({ open: true, data });
  }, []);

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
        {days.map((day, idx) => {
          const dayNum = day.dayNumber || day.DayNumber;
          const rawDayTitle = day.dayTitle || day.DayTitle || `Day ${dayNum}`;
          const date = day.date || day.Date;
          const weather = day.weatherSummary || day.WeatherSummary;
          const timeline = day.timeline || day.Timeline || [];
          const dailyBudget = day.dailyBudget || day.DailyBudget;
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
            <Card key={dayNum} className={styles.dayCard} bordered={false} bodyStyle={{ padding: 0 }}>
              {/* Day Header */}
              <div className={styles.dayHeader}>
                <div className={styles.dayTitle}>{dayTitle}</div>
                <div className={styles.dayMeta}>
                  {date && <span className={styles.dayDate}>{date}</span>}
                  {weather && <span className={styles.dayWeather}>{weather}</span>}
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
                  const rawTitle = item.title || item.Title || '';
                  const isTravel = eventType === 'travel';
                  const travelDetail = item.locationToLocationTravel || item.LocationToLocationTravel
                    || item.transitHubToLocationTravel || item.TransitHubToLocationTravel
                    || item.locationToTransitHubTravel || item.LocationToTransitHubTravel;
                  const isLongMove = isTravel && isIntercityTravel(travelDetail);
                  const locationName = locationNameById.get(Number(locationId));
                  const fallbackEventTitle = isLongMove
                    ? 'Move Long'
                    : (EVENT_DEFAULT_TITLES[eventType] || 'Activity');
                  const translatedTitle = translateTitleToEnglish(rawTitle);
                  const forceEnglishTitle = eventType === 'travel'
                    || eventType === 'check-in'
                    || eventType === 'luggage-refresh';
                  const title = locationName
                    || (forceEnglishTitle ? fallbackEventTitle : (translatedTitle || fallbackEventTitle));
                  const tagIds = item.tagIds || item.TagIds || [];
                  const costForGroup = item.costForGroup || item.CostForGroup;
                  const ticketCost = item.ticketCost || item.TicketCost;
                  const rawNote = item.note || item.Note || '';
                  const alternatives = item.alternatives || item.Alternatives || [];
                  const travelRouteText = isTravel ? getTravelRouteText(travelDetail) : '';

                  const explicitRating = item.rating ?? item.Rating ?? item.score ?? item.Score;
                  const parsedScoreMatch = String(rawNote).match(/score\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i);
                  const parsedScore = parsedScoreMatch ? parsedScoreMatch[1].replace(',', '.') : null;
                  const ratingValue = explicitRating ?? parsedScore;
                  const displayRating = formatRatingOutOfFive(ratingValue);
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
                        style={{ background: eventConfig.bg }}
                      >
                        {eventConfig.badge}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>{title}</div>
                        {isTravel && travelRouteText && (
                          <div className={styles.timelineRoute}>{travelRouteText}</div>
                        )}
                        {displayRating && (
                          <div className={styles.timelineRating}>Rating: {displayRating}</div>
                        )}
                        {note && <div className={styles.timelineNote}>{note}</div>}

                        {/* Transport detail */}
                        {isTravel && travelDetail && (
                          <div className={styles.transportDetail}>
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto' }}
                              onClick={() => handleViewTransport(item)}
                            >
                              View Transport Details
                            </Button>
                          </div>
                        )}

                        {/* Tags */}
                        {tagIds.length > 0 && (
                          <div className={styles.timelineTags}>
                            {tagIds.slice(0, 3).map((tagId) => (
                              <Tag key={tagId} color="blue" style={{ fontSize: 11 }}>
                                Tag #{tagId}
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
                              style={{ padding: 0, height: 'auto', fontSize: 12 }}
                              onClick={() => handleViewLocation(locationId)}
                            >
                              View Details
                            </Button>
                          )}
                        </div>

                        {alternatives.length > 0 && (
                          <div className={styles.alternativeList}>
                            {alternatives.map((alternative, altIdx) => {
                              const altLocationId = alternative.locationId || alternative.LocationId;
                              const altName = alternative.locationName || alternative.LocationName || `Alternative ${altIdx + 1}`;
                              const altScore = alternative.score ?? alternative.Score;
                              const altRating = formatRatingOutOfFive(altScore);

                              return (
                                <div
                                  key={`${idx}-alt-${altLocationId || altIdx}`}
                                  className={styles.alternativeItem}
                                >
                                  <div className={styles.alternativeMain}>
                                    <span className={styles.alternativePrefix}>Alt {altIdx + 1}:</span>
                                    <span className={styles.alternativeName}>{altName}</span>
                                  </div>
                                  <div className={styles.alternativeActions}>
                                    {altRating && (
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        Rating: {altRating}
                                      </Text>
                                    )}
                                    {altLocationId && (
                                      <Button
                                        type="link"
                                        size="small"
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
                        )}
                      </div>
                      <div className={styles.timelineCost}>
                        {costForGroup ? (
                          <div className={styles.costAmount}>{formatMoney(costForGroup)}</div>
                        ) : ticketCost && (ticketCost.amount || ticketCost.Amount) > 0 ? (
                          <div className={styles.costAmount}>{formatMoney(ticketCost)}</div>
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
                    return (
                      <div key={i} className={styles.accommodationItem}>
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
                    );
                  })}
                </div>
              )}

              {/* Day Summary */}
              <div className={styles.daySummary}>
                <div className={styles.daySummaryItem}>
                  <Text type="secondary">Daily Budget:</Text>
                  <Text strong>{formatMoney(dailyBudget)}</Text>
                </div>
                <div className={styles.daySummaryItem}>
                  <Text type="secondary">Estimated Cost:</Text>
                  <Text strong>{formatMoney(estimatedCost)}</Text>
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
