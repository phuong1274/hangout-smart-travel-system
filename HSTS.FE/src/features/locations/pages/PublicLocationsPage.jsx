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
    destinationId: searchParams.get('destinationId') ? Number(searchParams.get('destinationId')) : undefined,
    districtId: searchParams.get('districtId') ? Number(searchParams.get('districtId')) : undefined,
    locationTypeId: searchParams.get('locationTypeId') ? Number(searchParams.get('locationTypeId')) : undefined,
    keyword: searchParams.get('keyword') || '',
    tagIds: searchParams.getAll('tagIds').map(Number).filter(Boolean),
    minRating: Number(searchParams.get('minRating') || 0),
    minBudget: searchParams.get('minBudget') ? Number(searchParams.get('minBudget')) : undefined,
    maxBudget: searchParams.get('maxBudget') ? Number(searchParams.get('maxBudget')) : undefined,
    maxDurationMinutes: searchParams.get('maxDurationMinutes') ? Number(searchParams.get('maxDurationMinutes')) : undefined,
  }), [searchParams]);

  const {
    data,
    loading,
    pagination,
    filters,
    destinations,
    districts,
    locationTypes,
    tags,
    handleTableChange,
    handleFilterChange,
  } = usePublicLocations(initialFilters);

  const applyFilters = (nextFilters) => {
    handleFilterChange(nextFilters);

    const params = new URLSearchParams();
    if (nextFilters.destinationId) params.set('destinationId', String(nextFilters.destinationId));
    if (nextFilters.districtId) params.set('districtId', String(nextFilters.districtId));
    if (nextFilters.locationTypeId) params.set('locationTypeId', String(nextFilters.locationTypeId));
    if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
    if (Array.isArray(nextFilters.tagIds)) {
      nextFilters.tagIds.forEach((tagId) => params.append('tagIds', String(tagId)));
    }
    if (nextFilters.minRating) params.set('minRating', String(nextFilters.minRating));
    if (nextFilters.minBudget != null) params.set('minBudget', String(nextFilters.minBudget));
    if (nextFilters.maxBudget != null) params.set('maxBudget', String(nextFilters.maxBudget));
    if (nextFilters.maxDurationMinutes != null) params.set('maxDurationMinutes', String(nextFilters.maxDurationMinutes));
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
            destinations={destinations}
            districts={districts}
            locationTypes={locationTypes}
            tags={tags}
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
