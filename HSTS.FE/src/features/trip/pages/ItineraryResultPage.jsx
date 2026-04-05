import React, { useState, useCallback } from 'react';
import { Card, Typography, Button, Tag, Empty, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTripPlanner } from '../hooks/useTripPlanner';
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

const ItineraryResultPage = () => {
  const navigate = useNavigate();
  const { itinerary, clearItinerary } = useTripPlanner();

  const [locationModal, setLocationModal] = useState({ open: false, locationId: null });
  const [transportModal, setTransportModal] = useState({ open: false, data: null });
  const [accommodationModal, setAccommodationModal] = useState({ open: false, data: null });

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
  const notes = itinerary.notes || itinerary.Notes || [];
  const startDate = itinerary.startDate || itinerary.StartDate;
  const endDate = itinerary.endDate || itinerary.EndDate;
  const groupSize = itinerary.groupSize || itinerary.GroupSize;
  const budgetLevel = itinerary.budgetLevel || itinerary.BudgetLevel;

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
          <Card className={styles.budgetCard} title="Budget Summary" size="small">
            <div className={styles.budgetGrid}>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Total Budget</span>
                <span className={styles.budgetValue}>{formatMoney(budgetSummary.totalBudget || budgetSummary.TotalBudget)}</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Contingency</span>
                <span className={`${styles.budgetValue} ${styles.budgetNegative}`}>
                  -{formatMoney(budgetSummary.contingencyFund || budgetSummary.ContingencyFund)}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Usable</span>
                <span className={styles.budgetValue}>{formatMoney(budgetSummary.usableBudget || budgetSummary.UsableBudget)}</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Transport</span>
                <span className={`${styles.budgetValue} ${styles.budgetNegative}`}>
                  -{formatMoney(budgetSummary.estimatedTransportCost || budgetSummary.EstimatedTransportCost)}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Accommodation</span>
                <span className={`${styles.budgetValue} ${styles.budgetNegative}`}>
                  -{formatMoney(budgetSummary.estimatedAccommodationCost || budgetSummary.EstimatedAccommodationCost)}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Activities</span>
                <span className={`${styles.budgetValue} ${styles.budgetNegative}`}>
                  -{formatMoney(budgetSummary.estimatedActivityCost || budgetSummary.EstimatedActivityCost)}
                </span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Estimated Total</span>
                <span className={styles.budgetValue}>{formatMoney(budgetSummary.estimatedTotalCost || budgetSummary.EstimatedTotalCost)}</span>
              </div>
              <div className={styles.budgetItem}>
                <span className={styles.budgetLabel}>Remaining</span>
                <span className={`${styles.budgetValue} ${styles.budgetPositive}`}>
                  {formatMoney(budgetSummary.remainingBudget || budgetSummary.RemainingBudget)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Day-by-Day Itinerary */}
        {days.map((day) => {
          const dayNum = day.dayNumber || day.DayNumber;
          const dayTitle = day.dayTitle || day.DayTitle || `Day ${dayNum}`;
          const date = day.date || day.Date;
          const weather = day.weatherSummary || day.WeatherSummary;
          const timeline = day.timeline || day.Timeline || [];
          const dailyBudget = day.dailyBudget || day.DailyBudget;
          const estimatedCost = day.estimatedDayCost || day.EstimatedDayCost;
          const rollover = day.rolloverToNextDay || day.RolloverToNextDay;
          const accommodations = day.accommodationRecommendations || day.AccommodationRecommendations || [];

          return (
            <Card key={dayNum} className={styles.dayCard} bordered={false} bodyStyle={{ padding: 0 }}>
              {/* Day Header */}
              <div className={styles.dayHeader}>
                <div className={styles.dayTitle}>{dayTitle}</div>
                <div className={styles.dayMeta}>
                  {date && <span>{date}</span>}
                  {weather && <span>{weather}</span>}
                </div>
              </div>

              {/* Timeline */}
              <div className={styles.timeline}>
                {timeline.map((item, idx) => {
                  const eventType = item.eventType || item.EventType || 'visit';
                  const eventConfig = EVENT_BADGES[eventType] || EVENT_BADGES.visit;
                  const title = item.title || item.Title;
                  const startTime = item.startTime || item.StartTime;
                  const endTime = item.endTime || item.EndTime;
                  const locationId = item.locationId || item.LocationId;
                  const tagIds = item.tagIds || item.TagIds || [];
                  const costForGroup = item.costForGroup || item.CostForGroup;
                  const ticketCost = item.ticketCost || item.TicketCost;
                  const note = item.note || item.Note;
                  const alternatives = item.alternatives || item.Alternatives || [];
                  const isTravel = eventType === 'travel';

                  return (
                    <div key={idx} className={styles.timelineItem}>
                      <div className={styles.timelineTime}>
                        {formatTime(startTime)}
                      </div>
                      <div
                        className={styles.timelineIcon}
                        style={{ background: eventConfig.bg }}
                      >
                        {eventConfig.badge}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>{title}</div>
                        {note && <div className={styles.timelineNote}>{note}</div>}

                        {/* Transport detail */}
                        {isTravel && (item.locationToLocationTravel || item.LocationToLocationTravel ||
                          item.transitHubToLocationTravel || item.TransitHubToLocationTravel ||
                          item.locationToTransitHubTravel || item.LocationToTransitHubTravel) && (
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
                          {alternatives.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              +{alternatives.length} alternatives
                            </Text>
                          )}
                        </div>
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
                    const name = acc.name || acc.Name || acc.hotelName || acc.HotelName || 'Hotel';
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
                {rollover && (
                  <div className={styles.daySummaryItem}>
                    <Text type="secondary">Rollover → next day:</Text>
                    <Text strong style={{ color: '#52c41a' }}>{formatMoney(rollover)}</Text>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {/* System Notes */}
        {notes.length > 0 && (
          <Card className={styles.notesCard} title="System Notes" size="small">
            {notes.map((note, i) => (
              <div key={i} className={styles.noteItem}>• {note}</div>
            ))}
          </Card>
        )}

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
