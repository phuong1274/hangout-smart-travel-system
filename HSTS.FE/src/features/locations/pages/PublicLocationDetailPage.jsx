import React, { useMemo, useState } from 'react';
import { Button, Card, Divider, List, Rate, Skeleton, Space, Tag, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';
import { ROLES } from '@/config/constants';
import { useAuthStore } from '@/store/authStore';
import { usePublicLocationDetail } from '../hooks/usePublicLocationDetail';
import styles from '../styles/PublicLocationDetailPage.module.css';

const { Paragraph, Text, Title } = Typography;

const normalizeRating = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number <= 5) return Math.max(0, number);
  if (number <= 10) return number / 2;
  return 5;
};

const formatBudget = (minPrice, maxPrice, ticketPrice) => {
  if (minPrice != null || maxPrice != null) return `$${minPrice ?? 0} - $${maxPrice ?? 'Any'} USD`;
  if (ticketPrice != null) return `$${ticketPrice} USD`;
  return 'Budget details coming soon';
};

const formatDuration = (minutes) => {
  if (!minutes) return 'Flexible visit length';
  if (minutes < 60) return `About ${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `About ${hours} hours` : `About ${hours.toFixed(1)} hours`;
};

const formatMinimumAge = (minimumAge) => {
  if (minimumAge == null) return 'Age guidance not listed';
  if (Number(minimumAge) <= 0) return 'Great for all ages';
  return `Best for ${minimumAge}+`;
};

const formatTime = (value) => {
  if (!value) return 'Closed';
  return String(value).slice(0, 5);
};

const formatStatusLabel = (status) => {
  if (status === 'TemporarilyClosed') return 'Temporarily closed';
  if (status === 'Inactive') return 'Currently unavailable';
  return 'Open for discovery';
};

const formatStatusTone = (status) => {
  if (status === 'TemporarilyClosed' || status === 'Inactive') return 'red';
  return 'green';
};

const formatCoordinates = (latitude, longitude) => {
  if (latitude == null || longitude == null) return 'Map pin coming soon';
  return `${latitude}, ${longitude}`;
};

const DetailSection = ({ eyebrow, title, children }) => (
  <Card className={styles.sectionCard}>
    <span className={styles.sectionEyebrow}>{eyebrow}</span>
    <Title level={4} className={styles.sectionTitle}>{title}</Title>
    {children}
  </Card>
);

const FactCard = ({ label, value }) => (
  <div className={styles.factCard}>
    <span className={styles.factLabel}>{label}</span>
    <span className={styles.factValue}>{value}</span>
  </div>
);

const Gallery = ({ images = [], name }) => {
  const safeImages = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = safeImages[activeIndex];

  const handlePrevious = () => {
    setActiveIndex((current) => (current === 0 ? safeImages.length - 1 : current - 1));
  };

  const handleNext = () => {
    setActiveIndex((current) => (current === safeImages.length - 1 ? 0 : current + 1));
  };

  if (safeImages.length === 0) {
    return (
      <div className={styles.galleryFallback}>
        <Text type="secondary">Photo gallery coming soon</Text>
      </div>
    );
  }

  return (
    <div className={styles.galleryShell}>
      <div className={styles.heroImageWrap}>
        <img src={activeImage} alt={name} className={styles.heroImage} />
        {safeImages.length > 1 ? (
          <>
            <button type="button" className={`${styles.galleryNav} ${styles.galleryNavLeft}`} onClick={handlePrevious} aria-label="Show previous photo">
              ‹
            </button>
            <button type="button" className={`${styles.galleryNav} ${styles.galleryNavRight}`} onClick={handleNext} aria-label="Show next photo">
              ›
            </button>
            <span className={styles.galleryCount}>{activeIndex + 1} / {safeImages.length}</span>
          </>
        ) : null}
      </div>
      {safeImages.length > 1 ? (
        <div className={styles.thumbnailRow}>
          {safeImages.slice(0, 5).map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`${styles.thumbnailButton} ${index === activeIndex ? styles.thumbnailButtonActive : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1}`}
            >
              <img src={image} alt={`${name} view ${index + 1}`} className={styles.thumbnailImage} />
            </button>
          ))}
          {safeImages.length > 5 ? <div className={styles.morePhotos}>+{safeImages.length - 5} more</div> : null}
        </div>
      ) : null}
    </div>
  );
};

const PublicLocationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { data, loading } = usePublicLocationDetail(id);

  const name = data?.name || data?.Name || 'Location detail';
  const description = data?.description || data?.Description || 'This spot is live, but the story is still being updated.';
  const address = data?.address || data?.Address || 'Address coming soon';
  const destination = data?.destination || data?.Destination || '';
  const district = data?.district || data?.District || '';
  const averageRating = data?.averageRating ?? data?.AverageRating ?? data?.rating ?? data?.Rating ?? 0;
  const reviewCount = data?.reviewCount ?? data?.ReviewCount ?? 0;
  const provinceId = data?.provinceId ?? data?.ProvinceId;
  const districtId = data?.districtId ?? data?.DistrictId;
  const priceMinUsd = data?.priceMinUsd ?? data?.PriceMinUsd;
  const priceMaxUsd = data?.priceMaxUsd ?? data?.PriceMaxUsd;
  const ticketPrice = data?.ticketPrice ?? data?.TicketPrice;
  const recommendedDurationMinutes = data?.recommendedDurationMinutes ?? data?.RecommendedDurationMinutes;
  const minimumAge = data?.minimumAge ?? data?.MinimumAge;
  const latitude = data?.latitude ?? data?.Latitude;
  const longitude = data?.longitude ?? data?.Longitude;
  const telephone = data?.telephone || data?.Telephone;
  const email = data?.email || data?.Email;
  const sourceUrl = data?.sourceUrl || data?.SourceUrl;
  const status = data?.status || data?.Status || 'Active';
  const locationTypeName = data?.locationType?.name || data?.locationType?.Name || data?.LocationType?.name || data?.LocationType?.Name;
  const tags = Array.isArray(data?.tags) ? data.tags : Array.isArray(data?.Tags) ? data.Tags : [];
  const amenities = Array.isArray(data?.amenities) ? data.amenities : Array.isArray(data?.Amenities) ? data.Amenities : [];
  const openingHours = Array.isArray(data?.openingHours) ? data.openingHours : Array.isArray(data?.OpeningHours) ? data.OpeningHours : [];
  const seasons = Array.isArray(data?.seasons) ? data.seasons : Array.isArray(data?.Seasons) ? data.Seasons : [];
  const socialLinks = Array.isArray(data?.socialLinks) ? data.socialLinks : Array.isArray(data?.SocialLinks) ? data.SocialLinks : [];
  const imageUrls = useMemo(() => {
    if (Array.isArray(data?.imageUrls)) return data.imageUrls.filter(Boolean);
    if (Array.isArray(data?.ImageUrls)) return data.ImageUrls.filter(Boolean);
    return [];
  }, [data]);

  const isGuest = !isAuthenticated;
  const isTraveler = String(user?.role || '').toUpperCase() === ROLES.TRAVELER;
  const showCta = isGuest || isTraveler;
  const ctaLabel = isGuest ? 'Sign in to build your trip' : 'Build a trip around this stop';
  const ctaPath = isGuest
    ? PATHS.AUTH.LOGIN
    : buildCreateTripPath({
        provinceId,
        districtId,
        locationId: Number(id),
        tagIds: tags.map((tag) => tag?.id ?? tag?.Id).filter(Boolean),
      });

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Skeleton active paragraph={{ rows: 12 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Link to={PATHS.PUBLIC_LOCATIONS} className={styles.backLink}>Back to discovery</Link>

          <Card className={styles.heroCard}>
            <div className={styles.heroGrid}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Gallery images={imageUrls} name={name} />

                <div>
                  <span className={styles.eyebrow}>Trip-ready location profile</span>
                  <Title level={1} className={styles.title}>{name}</Title>
                  <Text className={styles.supportingLine}>{[district, destination].filter(Boolean).join(', ') || 'Destination pick'}</Text>
                </div>

                <div className={styles.metaStrip}>
                  {district ? <Tag>{district}</Tag> : null}
                  {destination ? <Tag color="blue">{destination}</Tag> : null}
                  {locationTypeName ? <Tag color="gold">{locationTypeName}</Tag> : null}
                  <Tag color={formatStatusTone(status)}>{formatStatusLabel(status)}</Tag>
                  <Tag>{formatMinimumAge(minimumAge)}</Tag>
                </div>

                <div className={styles.ratingRow}>
                  <Rate allowHalf disabled value={normalizeRating(averageRating)} />
                  <Text strong>{Number(averageRating || 0).toFixed(1)}</Text>
                  <Text type="secondary">
                    {reviewCount > 0 ? `${reviewCount} traveler review${reviewCount > 1 ? 's' : ''}` : 'Fresh pick waiting for first reviews'}
                  </Text>
                </div>

                <Paragraph className={styles.summary}>
                  Use this snapshot to see whether the stop fits your pace, budget, and travel style before locking it into your itinerary.
                </Paragraph>
              </Space>

              <div className={styles.heroAside}>
                <Title level={4} className={styles.heroAsideTitle}>Planning cues at a glance</Title>
                <Paragraph className={styles.heroAsideText}>
                  Check timing, comfort, and official details here before deciding whether this stop earns a place in your route.
                </Paragraph>

                <div className={styles.quickFacts}>
                  <FactCard label="Typical spend" value={formatBudget(priceMinUsd, priceMaxUsd, ticketPrice)} />
                  <FactCard label="Suggested stay" value={formatDuration(recommendedDurationMinutes)} />
                  <FactCard label="Who it suits" value={formatMinimumAge(minimumAge)} />
                  <FactCard label="Map reference" value={formatCoordinates(latitude, longitude)} />
                </div>

                {showCta ? (
                  <Button type="primary" className={styles.primaryCta} onClick={() => navigate(ctaPath)}>
                    {ctaLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <div className={styles.bodyGrid}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <DetailSection eyebrow="Story" title="Why it stands out">
                <Paragraph style={{ marginBottom: 0 }}>{description}</Paragraph>
              </DetailSection>

              {openingHours.length > 0 ? (
                <DetailSection eyebrow="Timing" title="Best time to go">
                  <div className={styles.listBlock}>
                    <List
                      size="small"
                      dataSource={openingHours}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>
                            {item?.dayOfWeek || item?.DayOfWeek}: {formatTime(item?.openTime || item?.OpenTime)} - {formatTime(item?.closeTime || item?.CloseTime)}
                            {(item?.note || item?.Note) ? ` (${item?.note || item?.Note})` : ''}
                          </Text>
                        </List.Item>
                      )}
                    />
                  </div>
                </DetailSection>
              ) : null}

              {seasons.length > 0 ? (
                <DetailSection eyebrow="Seasonality" title="Seasonal notes">
                  <div className={styles.listBlock}>
                    <List
                      size="small"
                      dataSource={seasons}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>{item?.description || item?.Description} ({item?.months || item?.Months})</Text>
                        </List.Item>
                      )}
                    />
                  </div>
                </DetailSection>
              ) : null}
            </Space>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <DetailSection eyebrow="Travel vibe" title="Tags and fit">
                <div className={styles.tagCluster}>
                  {tags.map((tag) => {
                    const tagId = tag?.id ?? tag?.Id ?? tag?.name ?? tag?.Name;
                    const tagName = tag?.name || tag?.Name;
                    return tagName ? <Tag key={tagId}>{tagName}</Tag> : null;
                  })}
                </div>
              </DetailSection>

              {amenities.length > 0 ? (
                <DetailSection eyebrow="Comfort" title="Comfort highlights">
                  <div className={styles.tagCluster}>
                    {amenities.map((amenity) => {
                      const amenityId = amenity?.id ?? amenity?.Id ?? amenity?.name ?? amenity?.Name;
                      const amenityName = amenity?.name || amenity?.Name;
                      return amenityName ? <Tag key={amenityId}>{amenityName}</Tag> : null;
                    })}
                  </div>
                </DetailSection>
              ) : null}

              <DetailSection eyebrow="Contact" title="Useful details before you go">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Where it sits</Text>
                    <Paragraph style={{ marginBottom: 0 }}>{address}</Paragraph>
                  </div>
                  <Divider style={{ margin: 0 }} />
                  <div>
                    <Text strong>Call ahead</Text>
                    <Paragraph style={{ marginBottom: 0 }}>{telephone || 'Contact number not listed'}</Paragraph>
                  </div>
                  <Divider style={{ margin: 0 }} />
                  <div>
                    <Text strong>Email contact</Text>
                    <Paragraph style={{ marginBottom: 0 }}>{email || 'Email not listed'}</Paragraph>
                  </div>
                  <Divider style={{ margin: 0 }} />
                  <div>
                    <Text strong>Official details</Text>
                    <Paragraph style={{ marginBottom: 0 }}>
                      {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">See official details</a> : 'No official source added'}
                    </Paragraph>
                  </div>
                </Space>
              </DetailSection>

              {socialLinks.length > 0 ? (
                <DetailSection eyebrow="Official channels" title="Useful links">
                  <div className={styles.listBlock}>
                    <List
                      size="small"
                      dataSource={socialLinks}
                      renderItem={(item) => (
                        <List.Item>
                          <a href={item?.url || item?.Url} target="_blank" rel="noreferrer">{item?.platform || item?.Platform}</a>
                        </List.Item>
                      )}
                    />
                  </div>
                </DetailSection>
              ) : null}
            </Space>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default PublicLocationDetailPage;
