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

const PublicLocationCard = ({ location }) => {
  const id = resolveLocationId(location);
  const name = location?.name || location?.title || location?.Name || 'Location';
  const description = location?.description || location?.Description || 'No description available yet.';
  const district = location?.districtName || location?.DistrictName || location?.district?.name || '';
  const province = location?.provinceName || location?.ProvinceName || location?.province?.name || '';
  const averageRating = location?.averageRating ?? location?.AverageRating ?? location?.rating ?? location?.Rating;
  const reviewCount = location?.reviewCount ?? location?.ReviewCount ?? 0;
  const minPrice = location?.priceMinUsd ?? location?.PriceMinUsd;
  const maxPrice = location?.priceMaxUsd ?? location?.PriceMaxUsd;
  const imageUrl = getImageUrl(location);

  return (
    <Card
      hoverable
      cover={
        imageUrl ? (
          <img src={imageUrl} alt={name} style={{ height: 180, objectFit: 'cover' }} />
        ) : null
      }
      actions={id ? [
        <Link key="detail" to={PATHS.PUBLIC_LOCATION_DETAIL(id)}>
          View detail
        </Link>,
      ] : undefined}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Title level={4} style={{ marginBottom: 0 }}>{name}</Title>

        <Space size={8} wrap>
          {district && <Tag>{district}</Tag>}
          {province && <Tag color="blue">{province}</Tag>}
        </Space>

        <Space align="center" size={8}>
          <Rate allowHalf disabled value={normalizeRating(averageRating)} />
          <Text strong>{Number(averageRating || 0).toFixed(1)}</Text>
          <Text type="secondary">({reviewCount} reviews)</Text>
        </Space>

        {(minPrice != null || maxPrice != null) && (
          <Text type="secondary">
            Budget: {minPrice ?? '?'} - {maxPrice ?? '?'} USD
          </Text>
        )}

        <Paragraph ellipsis={{ rows: 3, expandable: false }} style={{ marginBottom: 0 }}>
          {description}
        </Paragraph>

        {id && (
          <Link to={PATHS.PUBLIC_LOCATION_DETAIL(id)}>
            <Button type="link" style={{ padding: 0 }}>Read more</Button>
          </Link>
        )}
      </Space>
    </Card>
  );
};

export default PublicLocationCard;
