import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Typography,
  Spin,
  Image,
  Space,
  Divider,
} from 'antd';
import { getLocationByIdApi } from '../api';
import { convertCurrencyAmount } from '../constants/currency';

const { Text, Paragraph } = Typography;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getEnglishPreferredName = (item) => {
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  const localName = String(item?.name || item?.Name || '').trim();
  return englishName || localName || '';
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

const formatRatingOutOfFive = (value) => {
  const score = parseScoreToFive(value);
  if (score == null) return null;
  return `${score.toFixed(score % 1 === 0 ? 0 : 1)}/5`;
};

const formatMinutesAsHourMinute = (minutes) => {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '';

  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;
  return `${hours}h ${mins}m`;
};

const formatClockTime = (timeStr) => {
  const value = String(timeStr || '').trim();
  if (!value) return '';
  const parts = value.split(':');
  if (parts.length < 2) return value;
  return `${parts[0]}:${parts[1]}`;
};

const formatDateTime = (isoDateTime) => {
  const value = String(isoDateTime || '').trim();
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatAmountByCurrency = (value, currencyCode) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';

  const normalizedCurrency = String(currencyCode || 'VND').toUpperCase();
  const noDecimalCurrencies = new Set(['VND', 'JPY', 'KRW', 'IDR']);
  const maximumFractionDigits = noDecimalCurrencies.has(normalizedCurrency) ? 0 : 2;

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

const extractMediaUrls = (location) => {
  const list = [
    ...(Array.isArray(location?.mediaLinks) ? location.mediaLinks : []),
    ...(Array.isArray(location?.MediaLinks) ? location.MediaLinks : []),
    ...(Array.isArray(location?.images) ? location.images : []),
    ...(Array.isArray(location?.Images) ? location.Images : []),
    ...(Array.isArray(location?.medias) ? location.medias : []),
    ...(Array.isArray(location?.Medias) ? location.Medias : []),
  ];

  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      return String(item?.url || item?.Url || item?.mediaUrl || item?.MediaUrl || '').trim();
    })
    .filter(Boolean);
};

const extractTagNames = (location) => {
  const fromTags = [...(Array.isArray(location?.tags) ? location.tags : []), ...(Array.isArray(location?.Tags) ? location.Tags : [])]
    .map((item) => getEnglishPreferredName(item))
    .filter(Boolean);
  const fromNames = [...(Array.isArray(location?.tagNames) ? location.tagNames : []), ...(Array.isArray(location?.TagNames) ? location.TagNames : [])]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [...new Set([...fromTags, ...fromNames])];
};

const extractAmenityNames = (location) => {
  const fromAmenities = [...(Array.isArray(location?.amenities) ? location.amenities : []), ...(Array.isArray(location?.Amenities) ? location.Amenities : [])]
    .map((item) => getEnglishPreferredName(item))
    .filter(Boolean);
  const fromNames = [...(Array.isArray(location?.amenityNames) ? location.amenityNames : []), ...(Array.isArray(location?.AmenityNames) ? location.AmenityNames : [])]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [...new Set([...fromAmenities, ...fromNames])];
};

const normalizeSocialLink = (item) => {
  if (item == null) return null;

  if (typeof item === 'string') {
    const text = item.trim();
    if (!text) return null;
    return { label: text, url: text };
  }

  const url = String(item?.url || item?.Url || item?.link || item?.Link || '').trim();
  if (!url) return null;

  const label = String(
    item?.platformName
    || item?.PlatformName
    || item?.platform
    || item?.Platform
    || item?.name
    || item?.Name
    || url
  ).trim();

  return { label: label || url, url };
};

const toHref = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const hasMojibake = (text) => /Ã|Â|áº|á»|á»¥|ðŸ|�/u.test(String(text || ''));

const safePlaceName = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (hasMojibake(text)) return '';
  return text;
};

const statusLabel = (status) => {
  const value = Number(status);
  if (value === 1) return 'Active';
  if (value === 0) return 'Inactive';
  return 'Unknown';
};

const LocationDetailModal = ({ open, locationId, currencyCode = 'VND', onClose }) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (!open || !locationId) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getLocationByIdApi(locationId);
        if (!cancelled) setLocation(data);
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [open, locationId]);

  if (!open) return null;

  const name = getEnglishPreferredName(location);
  const description = location?.description || location?.Description || '';
  const address = location?.address || location?.Address || '';
  const score = location?.score || location?.Score || location?.rating || location?.Rating;
  const ticketPrice = toFiniteNumber(location?.ticketPrice ?? location?.TicketPrice) || 0;
  const recommendedDuration = toFiniteNumber(location?.recommendedDurationMinutes ?? location?.RecommendedDurationMinutes);
  const minimumAge = toFiniteNumber(location?.minimumAge ?? location?.MinimumAge) || 0;
  const tags = extractTagNames(location);
  const amenities = extractAmenityNames(location);
  const openingHours = [...(location?.openingHours || location?.OpeningHours || [])]
    .sort((a, b) => Number(a?.dayOfWeek ?? a?.DayOfWeek ?? 0) - Number(b?.dayOfWeek ?? b?.DayOfWeek ?? 0));
  const closures = location?.closures || location?.Closures || [];
  const mediaUrls = extractMediaUrls(location);
  const locationTypeName = getEnglishPreferredName(location?.locationType)
    || location?.locationTypeEnglishName
    || location?.LocationTypeEnglishName
    || location?.locationTypeName
    || location?.LocationTypeName
    || '';
  const districtName = safePlaceName(
    location?.districtEnglishName
    || location?.DistrictEnglishName
    || location?.district?.englishName
    || location?.district?.EnglishName
    || location?.districtName
    || location?.DistrictName
    || location?.district?.name
    || location?.district?.Name
    || ''
  );
  const provinceName = safePlaceName(
    location?.provinceEnglishName
    || location?.ProvinceEnglishName
    || location?.province?.englishName
    || location?.province?.EnglishName
    || location?.provinceName
    || location?.ProvinceName
    || location?.province?.name
    || location?.province?.Name
    || ''
  );
  const latitude = toFiniteNumber(location?.latitude ?? location?.Latitude);
  const longitude = toFiniteNumber(location?.longitude ?? location?.Longitude);
  const mapUrl = latitude != null && longitude != null
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : '';
  const telephone = String(location?.telephone || location?.Telephone || '').trim();
  const email = String(location?.email || location?.Email || '').trim();
  const socialLinks = [...(Array.isArray(location?.socialLinks) ? location.socialLinks : []), ...(Array.isArray(location?.SocialLinks) ? location.SocialLinks : [])]
    .map(normalizeSocialLink)
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((x) => x.url === item.url) === index);
  const seasons = [...(Array.isArray(location?.seasons) ? location.seasons : []), ...(Array.isArray(location?.Seasons) ? location.Seasons : [])]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const minPriceVnd = toFiniteNumber(location?.priceMinUsd ?? location?.PriceMinUsd);
  const maxPriceVnd = toFiniteNumber(location?.priceMaxUsd ?? location?.PriceMaxUsd);
  const normalizedCurrencyCode = String(currencyCode || 'VND').toUpperCase();
  const convertedTicketPrice = convertCurrencyAmount(ticketPrice, 'VND', normalizedCurrencyCode);
  const minPriceInTripCurrency = minPriceVnd != null
    ? convertCurrencyAmount(minPriceVnd, 'VND', normalizedCurrencyCode)
    : null;
  const maxPriceInTripCurrency = maxPriceVnd != null
    ? convertCurrencyAmount(maxPriceVnd, 'VND', normalizedCurrencyCode)
    : null;
  const tripToVndRate = convertCurrencyAmount(1, normalizedCurrencyCode, 'VND');
  const status = toFiniteNumber(location?.status ?? location?.Status);
  const effectiveStatus = toFiniteNumber(location?.effectiveStatus ?? location?.EffectiveStatus);
  const displayRating = formatRatingOutOfFive(score);

  return (
    <Drawer
      title={loading ? 'Loading...' : name}
      open={open}
      onClose={onClose}
      placement="right"
      width={490}
      mask={false}
      destroyOnClose
      style={{ boxShadow: '-8px 0 24px rgba(26, 83, 92, 0.08)' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : location ? (
        <div>
          {mediaUrls.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Image.PreviewGroup>
                <Space wrap>
                  {mediaUrls.slice(0, 6).map((url, i) => (
                    url ? (
                      <Image key={i} width={110} height={80} src={url} style={{ borderRadius: 6, objectFit: 'cover' }} />
                    ) : null
                  ))}
                </Space>
              </Image.PreviewGroup>
            </div>
          )}

          <Divider orientation="left" plain>Basic Information</Divider>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Address" span={2}>
              {address || 'N/A'}
            </Descriptions.Item>
            {districtName && (
              <Descriptions.Item label="District">{districtName}</Descriptions.Item>
            )}
            {provinceName && (
              <Descriptions.Item label="Province">{provinceName}</Descriptions.Item>
            )}
            {latitude != null && longitude != null && (
              <Descriptions.Item label="Coordinates" span={2}>
                {`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                {mapUrl && (
                  <>
                    {' '}
                    <a href={mapUrl} target="_blank" rel="noreferrer">Open map</a>
                  </>
                )}
              </Descriptions.Item>
            )}
            {locationTypeName && (
              <Descriptions.Item label="Category">{locationTypeName}</Descriptions.Item>
            )}
            {displayRating && (
              <Descriptions.Item label="Rating">{displayRating}</Descriptions.Item>
            )}
            <Descriptions.Item label="Admission">
              {ticketPrice > 0
                ? `${formatAmountByCurrency(convertedTicketPrice, normalizedCurrencyCode)} ${normalizedCurrencyCode}`
                : 'Free'}
            </Descriptions.Item>
            {(minPriceInTripCurrency != null || maxPriceInTripCurrency != null) && (
              <Descriptions.Item label="Price Range">
                <div>
                  {`${formatAmountByCurrency(minPriceInTripCurrency || 0, normalizedCurrencyCode)} - ${formatAmountByCurrency(maxPriceInTripCurrency || 0, normalizedCurrencyCode)} ${normalizedCurrencyCode}`}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {`Rate: 1 ${normalizedCurrencyCode} = ${formatAmountByCurrency(tripToVndRate, 'VND')} VND`}
                </Text>
              </Descriptions.Item>
            )}
            {recommendedDuration && (
              <Descriptions.Item label="Suggested Duration">
                {formatMinutesAsHourMinute(recommendedDuration)}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Minimum Age">
              {minimumAge > 0 ? `${minimumAge} years` : 'No requirement'}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left" plain>Contact and Status</Divider>
          <Descriptions size="small" column={2} bordered>
            {telephone && (
              <Descriptions.Item label="Phone">{telephone}</Descriptions.Item>
            )}
            {email && (
              <Descriptions.Item label="Email">{email}</Descriptions.Item>
            )}
            {status != null && (
              <Descriptions.Item label="Status">
                <Tag color={status === 1 ? 'green' : 'default'}>{statusLabel(status)}</Tag>
              </Descriptions.Item>
            )}
            {effectiveStatus != null && (
              <Descriptions.Item label="Effective Status">
                <Tag color={effectiveStatus === 1 ? 'green' : 'default'}>{statusLabel(effectiveStatus)}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          {openingHours.length > 0 && (
            <>
              <Divider orientation="left" plain>Opening Hours</Divider>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {openingHours.map((oh, i) => {
                  const dow = oh.dayOfWeek ?? oh.DayOfWeek;
                  const dayNum = Number(dow);
                  const openT = oh.openTime || oh.OpenTime || '';
                  const closeT = oh.closeTime || oh.CloseTime || '';
                  const dayLabel = String(
                    oh.dayName
                    || oh.DayName
                    || (Number.isFinite(dayNum) ? WEEKDAYS[dayNum % 7] : '')
                    || `Day ${dow}`
                  );
                  const note = String(oh.note || oh.Note || '').trim();
                  return (
                    <div key={i} style={{ fontSize: 13 }}>
                      <Text strong>{dayLabel}:</Text> {formatClockTime(openT)} - {formatClockTime(closeT)}
                      {note ? ` (${note})` : ''}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {closures.length > 0 && (
            <>
              <Divider orientation="left" plain>Closures</Divider>
              {closures.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: '#ff4d4f' }}>
                  {c.fromDate || c.FromDate} → {c.toDate || c.ToDate}: {c.reason || c.Reason || 'N/A'}
                </div>
              ))}
            </>
          )}

          {tags.length > 0 && (
            <>
              <Divider orientation="left" plain>Tags</Divider>
              <Space wrap>
                {tags.map((tagName) => (
                  <Tag key={tagName} color="blue">{tagName}</Tag>
                ))}
              </Space>
            </>
          )}

          {amenities.length > 0 && (
            <>
              <Divider orientation="left" plain>Amenities</Divider>
              <Space wrap>
                {amenities.map((amenityName) => (
                  <Tag key={amenityName} color="green">
                    {amenityName}
                  </Tag>
                ))}
              </Space>
            </>
          )}

          {socialLinks.length > 0 && (
            <>
              <Divider orientation="left" plain>Social Links</Divider>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                {socialLinks.map((link) => (
                  <a key={link.url} href={toHref(link.url)} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </Space>
            </>
          )}

          {seasons.length > 0 && (
            <>
              <Divider orientation="left" plain>Seasons</Divider>
              <Space wrap>
                {seasons.map((season) => (
                  <Tag key={season}>{season}</Tag>
                ))}
              </Space>
            </>
          )}

          {description && (
            <>
              <Divider orientation="left" plain>Description</Divider>
              <Paragraph ellipsis={{ rows: 4, expandable: true, symbol: 'Show more' }}>
                {description}
              </Paragraph>
            </>
          )}
        </div>
      ) : (
        <Text type="secondary">Location information not found.</Text>
      )}
    </Drawer>
  );
};

export default LocationDetailModal;