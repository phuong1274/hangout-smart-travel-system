import React from 'react';
import { Button, Card, Rate, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

const { Paragraph, Text, Title } = Typography;

const resolveLocationId = (location) => location?.id ?? location?.locationId ?? location?.Id;

const normalizeRating = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number <= 5) return Math.max(0, number);
  if (number <= 10) return number / 2;
  return 5;
};

const formatBudget = (minPrice, maxPrice, ticketPrice) => {
  if (minPrice != null || maxPrice != null) {
    return `$${minPrice ?? 0} - $${maxPrice ?? 'Any'}`;
  }

  if (ticketPrice != null) {
    return `$${ticketPrice}`;
  }

  return null;
};

const formatDuration = (minutes) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
};

const getImageUrl = (location) => {
  const direct = location?.imageUrl || location?.ImageUrl;
  if (typeof direct === 'string' && direct) return direct;

  const links = [
    ...(Array.isArray(location?.mediaLinks) ? location.mediaLinks : []),
    ...(Array.isArray(location?.MediaLinks) ? location.MediaLinks : []),
    ...(Array.isArray(location?.images) ? location.images : []),
    ...(Array.isArray(location?.Images) ? location.Images : []),
  ];

  const first = links[0];
  if (typeof first === 'string') return first;
  return first?.url || first?.Url || '';
};

const PublicLocationCard = ({ location, variant = 'default' }) => {
  const id = resolveLocationId(location);
  const isHomeVariant = variant === 'home';
  const isFeatured = variant === 'featured';
  const name = location?.name || location?.title || location?.Name || 'Location';
  const description = location?.description || location?.Description || 'A promising stop to explore on your next route.';
  const district = location?.district || location?.districtName || location?.District || location?.DistrictName || location?.district?.name || '';
  const province = location?.destination || location?.provinceName || location?.Destination || location?.ProvinceName || location?.province?.name || '';
  const averageRating = location?.averageRating ?? location?.AverageRating ?? location?.rating ?? location?.Rating;
  const reviewCount = location?.reviewCount ?? location?.ReviewCount ?? 0;
  const minPrice = location?.priceMinUsd ?? location?.PriceMinUsd;
  const maxPrice = location?.priceMaxUsd ?? location?.PriceMaxUsd;
  const ticketPrice = location?.ticketPrice ?? location?.TicketPrice;
  const duration = location?.recommendedDurationMinutes ?? location?.RecommendedDurationMinutes;
  const imageUrl = getImageUrl(location);
  const locationType = location?.locationType?.name || location?.LocationType?.Name || location?.locationType?.Name || null;
  const tags = Array.isArray(location?.tags) ? location.tags : Array.isArray(location?.Tags) ? location.Tags : [];
  const budgetText = formatBudget(minPrice, maxPrice, ticketPrice);
  const durationText = formatDuration(duration);
  const status = location?.status || location?.Status;

  return (
    <Card
      hoverable
      cover={
        imageUrl ? (
          <img src={imageUrl} alt={name} style={{ height: isFeatured ? 300 : 220, objectFit: 'cover' }} />
        ) : null
      }
      actions={id && !isHomeVariant ? [
        <Link key="detail" to={PATHS.PUBLIC_LOCATION_DETAIL(id)}>
          {isFeatured ? 'See the full trip fit' : 'See why it fits'}
        </Link>,
      ] : undefined}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {isHomeVariant ? null : <Text type="secondary">{isFeatured ? 'Editor’s standout pick' : locationType || 'Destination pick'}</Text>}
        <Title level={isFeatured ? 3 : 4} style={{ marginBottom: 0 }}>{name}</Title>

        <Text type="secondary">{[district, province].filter(Boolean).join(', ')}</Text>

        <Space align="center" size={8} wrap>
          <Rate allowHalf disabled value={normalizeRating(averageRating)} />
          <Text strong>{Number(averageRating || 0).toFixed(1)}</Text>
          <Text type="secondary">{reviewCount > 0 ? `${reviewCount} reviews` : 'Freshly listed'}</Text>
        </Space>

        {!isHomeVariant ? (
          <Space size={[6, 6]} wrap>
            {budgetText ? <Tag color="green">Typical spend · {budgetText} USD</Tag> : null}
            {durationText ? <Tag color="purple">Stay · {durationText}</Tag> : null}
            {locationType && !isFeatured ? <Tag color="gold">{locationType}</Tag> : null}
            {status && status !== 'Active' ? <Tag color="red">{status}</Tag> : null}
          </Space>
        ) : null}

        {!isHomeVariant && tags.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {tags.slice(0, isFeatured ? 4 : 3).map((tag) => {
              const tagId = tag?.id ?? tag?.Id ?? tag?.name ?? tag?.Name;
              const tagName = tag?.name || tag?.Name;
              return tagName ? <Tag key={tagId}>{tagName}</Tag> : null;
            })}
          </Space>
        ) : null}

        <Paragraph ellipsis={{ rows: isHomeVariant ? 2 : isFeatured ? 4 : 3, expandable: false }} style={{ marginBottom: 0 }}>
          {description}
        </Paragraph>

        {id && (
          <Link to={PATHS.PUBLIC_LOCATION_DETAIL(id)}>
            <Button type="link" style={{ padding: 0 }}>{isHomeVariant ? 'View detail' : isFeatured ? 'Open the complete location profile' : 'See the full trip fit'}</Button>
          </Link>
        )}
      </Space>
    </Card>
  );
};

export default PublicLocationCard;
