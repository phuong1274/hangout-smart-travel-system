import React, { useMemo } from 'react';
import { Card, Pagination, Space, Tag, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import PublicLocationFilterBar from '../components/PublicLocationFilterBar';
import PublicLocationGrid from '../components/PublicLocationGrid';
import { usePublicLocations } from '../hooks/usePublicLocations';
import styles from '../styles/LocationsPage.module.css';

const { Paragraph, Text, Title } = Typography;

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
    activeFilterCount,
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

  const activeFilterChips = [
    filters.destinationId ? destinations.find((item) => Number(item?.id ?? item?.Id) === Number(filters.destinationId))?.name || destinations.find((item) => Number(item?.id ?? item?.Id) === Number(filters.destinationId))?.Name : null,
    filters.districtId ? districts.find((item) => Number(item?.id ?? item?.Id) === Number(filters.districtId))?.name || districts.find((item) => Number(item?.id ?? item?.Id) === Number(filters.districtId))?.Name : null,
    filters.locationTypeId ? locationTypes.find((item) => Number(item?.id ?? item?.Id) === Number(filters.locationTypeId))?.name || locationTypes.find((item) => Number(item?.id ?? item?.Id) === Number(filters.locationTypeId))?.Name : null,
    ...(Array.isArray(filters.tagIds)
      ? filters.tagIds.map((tagId) => tags.find((item) => Number(item?.id ?? item?.Id) === Number(tagId))?.name || tags.find((item) => Number(item?.id ?? item?.Id) === Number(tagId))?.Name).filter(Boolean)
      : []),
    filters.minRating ? `${filters.minRating}+ rating` : null,
    filters.minBudget != null || filters.maxBudget != null ? `$${filters.minBudget ?? 0} - $${filters.maxBudget ?? 'Any'}` : null,
    filters.maxDurationMinutes ? `Up to ${filters.maxDurationMinutes} min` : null,
  ].filter(Boolean);

  return (
    <div className={styles.content}>
      <div className={styles.mainContainer}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className={styles.pageHeader}>
            <div>
              <Title level={2} className={styles.pageTitle}>Explore Locations</Title>
              <Paragraph className={styles.pageSubtitle}>
                Refine destinations, interests, budget, and time to discover places that fit your trip style.
              </Paragraph>
            </div>
          </div>

          <Card className={styles.mainCard}>
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

          <div className={styles.resultsSummary}>
            <div>
              <Text className={styles.resultCount}>{pagination.total} locations found</Text>
              <Text className={styles.resultHint}>{activeFilterCount > 0 ? `Using ${activeFilterCount} active filters` : 'Showing all available matches'}</Text>
            </div>
            {activeFilterChips.length > 0 ? (
              <div className={styles.chipsRow}>
                {activeFilterChips.map((chip) => (
                  <Tag key={chip} className={styles.filterChip}>{chip}</Tag>
                ))}
              </div>
            ) : null}
          </div>

          <PublicLocationGrid data={data} loading={loading} />

          <div className={styles.paginationWrap}>
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
    </div>
  );
};

export default PublicLocationsPage;
