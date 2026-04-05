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
  Badge,
} from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  StarOutlined,
  TagsOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { getLocationByIdApi } from '../api';

const { Title, Text, Paragraph } = Typography;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

const LocationDetailModal = ({ open, locationId, onClose }) => {
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
        // handled by interceptor
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
  const ticketPrice = location?.ticketPrice || location?.TicketPrice || 0;
  const recommendedDuration = location?.recommendedDurationMinutes || location?.RecommendedDurationMinutes;
  const minimumAge = location?.minimumAge || location?.MinimumAge || 0;
  const tags = location?.tags || location?.Tags || [];
  const amenities = location?.amenities || location?.Amenities || [];
  const openingHours = location?.openingHours || location?.OpeningHours || [];
  const closures = location?.closures || location?.Closures || [];
  const images = location?.images || location?.Images || location?.medias || location?.Medias || [];
  const locationTypeName = getEnglishPreferredName(location?.locationType)
    || location?.locationTypeEnglishName
    || location?.LocationTypeEnglishName
    || location?.locationTypeName
    || location?.LocationTypeName
    || '';
  const districtName = String(
    location?.districtEnglishName
    || location?.DistrictEnglishName
    || location?.district?.englishName
    || location?.district?.EnglishName
    || location?.districtName
    || location?.DistrictName
    || location?.district?.name
    || location?.district?.Name
    || ''
  ).trim();
  const provinceName = String(
    location?.provinceEnglishName
    || location?.ProvinceEnglishName
    || location?.province?.englishName
    || location?.province?.EnglishName
    || location?.provinceName
    || location?.ProvinceName
    || location?.province?.name
    || location?.province?.Name
    || ''
  ).trim();
  const displayRating = formatRatingOutOfFive(score);

  return (
    <Drawer
      title={loading ? 'Loading...' : `🏛️ ${name}`}
      open={open}
      onClose={onClose}
      placement="right"
      width={700}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : location ? (
        <div>
          {/* Image Gallery */}
          {images.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Image.PreviewGroup>
                <Space wrap>
                  {(Array.isArray(images) ? images : []).slice(0, 6).map((img, i) => {
                    const url = typeof img === 'string' ? img : img.url || img.Url || img.mediaUrl || img.MediaUrl || '';
                    return url ? (
                      <Image key={i} width={110} height={80} src={url} style={{ borderRadius: 6, objectFit: 'cover' }} />
                    ) : null;
                  })}
                </Space>
              </Image.PreviewGroup>
            </div>
          )}

          {/* Basic Info */}
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="📍 Address" span={2}>
              {[address, districtName, provinceName].filter(Boolean).join(', ')}
            </Descriptions.Item>
            {locationTypeName && (
              <Descriptions.Item label="🏷️ Category">{locationTypeName}</Descriptions.Item>
            )}
            {displayRating && (
              <Descriptions.Item label="⭐ Rating">{displayRating}</Descriptions.Item>
            )}
            <Descriptions.Item label="🎫 Admission">
              {ticketPrice > 0 ? `${ticketPrice.toLocaleString()} VND` : 'Free'}
            </Descriptions.Item>
            {recommendedDuration && (
              <Descriptions.Item label="⏱️ Suggested Duration">
                {recommendedDuration >= 60
                  ? `${Math.floor(recommendedDuration / 60)}h${recommendedDuration % 60 > 0 ? recommendedDuration % 60 + 'm' : ''}`
                  : `${recommendedDuration}m`}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="👤 Minimum Age">
              {minimumAge > 0 ? `${minimumAge} years` : 'No requirement'}
            </Descriptions.Item>
          </Descriptions>

          {/* Opening Hours */}
          {openingHours.length > 0 && (
            <>
              <Divider orientation="left" plain>Opening Hours</Divider>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {openingHours.map((oh, i) => {
                  const dow = oh.dayOfWeek ?? oh.DayOfWeek;
                  const openT = oh.openTime || oh.OpenTime || '';
                  const closeT = oh.closeTime || oh.CloseTime || '';
                  return (
                    <div key={i} style={{ fontSize: 13 }}>
                      <Text strong>{WEEKDAYS[dow] || `Day ${dow}`}:</Text> {openT} - {closeT}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Closures */}
          {closures.length > 0 && (
            <>
              <Divider orientation="left" plain>⚠️ Closures</Divider>
              {closures.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: '#ff4d4f' }}>
                  {c.fromDate || c.FromDate} → {c.toDate || c.ToDate}: {c.reason || c.Reason || 'N/A'}
                </div>
              ))}
            </>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <>
              <Divider orientation="left" plain>🏷️ Tags</Divider>
              <Space wrap>
                {tags.map((t) => (
                  <Tag key={t.id || t.Id} color="blue">{getEnglishPreferredName(t)}</Tag>
                ))}
              </Space>
            </>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <>
              <Divider orientation="left" plain>Amenities</Divider>
              <Space wrap>
                {amenities.map((a) => (
                  <Tag key={a.id || a.Id} icon={<CheckCircleOutlined />} color="green">
                    {getEnglishPreferredName(a)}
                  </Tag>
                ))}
              </Space>
            </>
          )}

          {/* Description */}
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
