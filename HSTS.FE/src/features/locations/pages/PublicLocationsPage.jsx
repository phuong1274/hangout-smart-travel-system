import React, { useMemo } from 'react';
import { Card, Pagination, Space, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import PublicLocationFilterBar from '../components/PublicLocationFilterBar';
import PublicLocationGrid from '../components/PublicLocationGrid';
import { usePublicLocations } from '../hooks/usePublicLocations';

const { Title } = Typography;

const PublicLocationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilters = useMemo(() => ({
    destinationId: searchParams.get('destinationId') || '',
    keyword: searchParams.get('keyword') || '',
    minRating: Number(searchParams.get('minRating') || 0),
  }), [searchParams]);

  const {
    data,
    loading,
    pagination,
    filters,
    handleTableChange,
    handleFilterChange,
  } = usePublicLocations(initialFilters);

  const applyFilters = (nextFilters) => {
    handleFilterChange(nextFilters);

    const params = new URLSearchParams();
    if (nextFilters.destinationId) params.set('destinationId', nextFilters.destinationId);
    if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
    if (nextFilters.minRating) params.set('minRating', String(nextFilters.minRating));
    setSearchParams(params);
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>Explore Locations</Title>
        </div>

        <Card>
          <PublicLocationFilterBar
            initialValues={filters}
            onApply={applyFilters}
            loading={loading}
          />
        </Card>

        <PublicLocationGrid data={data} loading={loading} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(current, pageSize) => handleTableChange({ current, pageSize })}
            showSizeChanger
          />
        </div>
      </Space>
    </div>
  );
};

export default PublicLocationsPage;
