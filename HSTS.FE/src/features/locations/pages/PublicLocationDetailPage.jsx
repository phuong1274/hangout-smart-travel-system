import React from 'react';
import { Button, Card, Descriptions, Divider, List, Rate, Skeleton, Space, Tag, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';
import { ROLES } from '@/config/constants';
import { useAuthStore } from '@/store/authStore';
import { usePublicLocationDetail } from '../hooks/usePublicLocationDetail';

const { Paragraph, Text, Title } = Typography;

const normalizeRating = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number <= 5) return Math.max(0, number);
  if (number <= 10) return number / 2;
  return 5;
};

const formatBudget = (minPrice, maxPrice, ticketPrice) => {
  if (minPrice != null || maxPrice != null) {
    return `$${minPrice ?? 0} - $${maxPrice ?? 'Any'} USD`;
  }
  if (ticketPrice != null) {
    return `$${ticketPrice} USD`;
  }
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
      <div style={{ padding: '24px 32px' }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Link to={PATHS.PUBLIC_LOCATIONS}>Back to discovery</Link>

        <Card>
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Text type="secondary">Trip-ready location profile</Text>
              <Title level={2} style={{ marginBottom: 0 }}>{name}</Title>
              <Text type="secondary">
                {[district, destination].filter(Boolean).join(', ') || 'Destination pick'}
              </Text>
            </Space>

            <Space wrap>
              {district ? <Tag>{district}</Tag> : null}
              {destination ? <Tag color="blue">{destination}</Tag> : null}
              {locationTypeName ? <Tag color="gold">{locationTypeName}</Tag> : null}
              <Tag color={formatStatusTone(status)}>{formatStatusLabel(status)}</Tag>
              <Tag>{formatMinimumAge(minimumAge)}</Tag>
            </Space>

            <Space align="center" size={8}>
              <Rate allowHalf disabled value={normalizeRating(averageRating)} />
              <Text strong>{Number(averageRating || 0).toFixed(1)}</Text>
              <Text type="secondary">
                {reviewCount > 0 ? `${reviewCount} traveler review${reviewCount > 1 ? 's' : ''}` : 'Fresh pick waiting for first reviews'}
              </Text>
            </Space>

            <Paragraph style={{ marginBottom: 0 }}>
              Use this snapshot to see whether the stop fits your pace, budget, and travel style before locking it into your itinerary.
            </Paragraph>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Where it sits">{address}</Descriptions.Item>
              <Descriptions.Item label="Typical spend">{formatBudget(priceMinUsd, priceMaxUsd, ticketPrice)}</Descriptions.Item>
              <Descriptions.Item label="Suggested stay">{formatDuration(recommendedDurationMinutes)}</Descriptions.Item>
              <Descriptions.Item label="Who it suits">{formatMinimumAge(minimumAge)}</Descriptions.Item>
              <Descriptions.Item label="Map reference">{formatCoordinates(latitude, longitude)}</Descriptions.Item>
              <Descriptions.Item label="Call ahead">{telephone || 'Contact number not listed'}</Descriptions.Item>
              <Descriptions.Item label="Email contact">{email || 'Email not listed'}</Descriptions.Item>
              <Descriptions.Item label="Official details">
                {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer">See official details</a> : 'No official source added'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>Why it stands out</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>{description}</Paragraph>
            </div>

            {tags.length > 0 ? (
              <div>
                <Text strong>Travel vibes</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {tags.map((tag) => {
                      const tagId = tag?.id ?? tag?.Id ?? tag?.name ?? tag?.Name;
                      const tagName = tag?.name || tag?.Name;
                      return tagName ? <Tag key={tagId}>{tagName}</Tag> : null;
                    })}
                  </Space>
                </div>
              </div>
            ) : null}

            {amenities.length > 0 ? (
              <div>
                <Text strong>Comfort highlights</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    {amenities.map((amenity) => {
                      const amenityId = amenity?.id ?? amenity?.Id ?? amenity?.name ?? amenity?.Name;
                      const amenityName = amenity?.name || amenity?.Name;
                      return amenityName ? <Tag key={amenityId}>{amenityName}</Tag> : null;
                    })}
                  </Space>
                </div>
              </div>
            ) : null}

            {openingHours.length > 0 ? (
              <>
                <Divider style={{ margin: 0 }} />
                <div>
                  <Text strong>Best time to go</Text>
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
              </>
            ) : null}

            {seasons.length > 0 ? (
              <div>
                <Text strong>Seasonal notes</Text>
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
            ) : null}

            {socialLinks.length > 0 ? (
              <div>
                <Text strong>Official links</Text>
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
            ) : null}

            {showCta && (
              <Button
                type="primary"
                onClick={() => navigate(ctaPath)}
                style={{ width: 'fit-content' }}
              >
                {ctaLabel}
              </Button>
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default PublicLocationDetailPage;
