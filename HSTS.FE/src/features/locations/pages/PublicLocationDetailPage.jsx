import React from 'react';
import { Button, Card, Descriptions, Rate, Skeleton, Space, Typography } from 'antd';
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

const PublicLocationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { data, loading } = usePublicLocationDetail(id);

  const name = data?.name || data?.Name || 'Location detail';
  const description = data?.description || data?.Description || 'No description available yet.';
  const address = data?.address || data?.Address || 'N/A';
  const averageRating = data?.averageRating ?? data?.AverageRating ?? data?.rating ?? data?.Rating ?? 0;
  const reviewCount = data?.reviewCount ?? data?.ReviewCount ?? 0;

  const isGuest = !isAuthenticated;
  const isTraveler = String(user?.role || '').toUpperCase() === ROLES.TRAVELER;
  const showCta = isGuest || isTraveler;
  const ctaLabel = isGuest ? 'Sign in to plan' : 'Continue planning';
  const provinceId = data?.provinceId ?? data?.ProvinceId;
  const districtId = data?.districtId ?? data?.DistrictId;
  const ctaPath = isGuest
    ? PATHS.AUTH.LOGIN
    : buildCreateTripPath({
        provinceId,
        districtId,
        locationId: Number(id),
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
        <Link to={PATHS.PUBLIC_LOCATIONS}>Back to all locations</Link>

        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Title level={2} style={{ marginBottom: 0 }}>{name}</Title>

            <Space align="center" size={8}>
              <Rate allowHalf disabled value={normalizeRating(averageRating)} />
              <Text strong>{Number(averageRating || 0).toFixed(1)}</Text>
              <Text type="secondary">({reviewCount} reviews)</Text>
            </Space>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Address">{address}</Descriptions.Item>
            </Descriptions>

            <Paragraph style={{ marginBottom: 0 }}>{description}</Paragraph>

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
