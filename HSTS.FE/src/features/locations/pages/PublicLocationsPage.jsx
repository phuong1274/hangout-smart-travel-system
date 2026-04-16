import React, { useMemo } from 'react';
import { Card, Pagination, Space, Tag, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import PublicLocationFilterBar from '../components/PublicLocationFilterBar';
import PublicLocationGrid from '../components/PublicLocationGrid';
import { usePublicLocations } from '../hooks/usePublicLocations';
import {
  buildExploreLocationSearchParams,
  normalizeExploreFiltersForDestinationChange,
} from './publicLocationsSearchParams';
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

  const initialPagination = useMemo(() => ({
    pageIndex: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 10,
  }), [searchParams]);

  const {
    data,
    loading,
    pagination,
    filters,
    destinations,
    districts,
    districtsLoading,
    locationTypes,
    tags,
    activeFilterCount,
    updatePagination,
    handleFilterChange,
  } = usePublicLocations(initialFilters, initialPagination);

  const syncSearchParams = (nextFilters, nextPagination = {}) => {
    const params = buildExploreLocationSearchParams(nextFilters, nextPagination);
    setSearchParams(params);
  };

  const handleFilterPreview = (nextFilters) => {
    const currentDestinationId = filters.destinationId;
    const destinationChanged = currentDestinationId !== nextFilters.destinationId;
    const normalizedFilters = destinationChanged
      ? normalizeExploreFiltersForDestinationChange(nextFilters, nextFilters.destinationId)
      : nextFilters;

    handleFilterChange(normalizedFilters);
    syncSearchParams(normalizedFilters, { pageIndex: 1, pageSize: pagination.pageSize });
  };

  const applyFilters = (nextFilters) => {
    const currentDestinationId = filters.destinationId;
    const destinationChanged = currentDestinationId !== nextFilters.destinationId;
    const normalizedFilters = destinationChanged
      ? normalizeExploreFiltersForDestinationChange(nextFilters, nextFilters.destinationId)
      : nextFilters;

    handleFilterChange(normalizedFilters);
    syncSearchParams(normalizedFilters, { pageIndex: 1, pageSize: pagination.pageSize });
  };

  const handlePaginationChange = (current, pageSize) => {
    updatePagination({ current, pageSize });
    syncSearchParams(filters, { pageIndex: current, pageSize });
  };


  const resolveOptionName = (items, id) => items.find((item) => Number(item?.id ?? item?.Id) === Number(id))?.name
    || items.find((item) => Number(item?.id ?? item?.Id) === Number(id))?.Name;

  const activeFilterChips = [
    filters.destinationId ? resolveOptionName(destinations, filters.destinationId) : null,
    filters.districtId ? resolveOptionName(districts, filters.districtId) : null,
    filters.locationTypeId ? resolveOptionName(locationTypes, filters.locationTypeId) : null,
    ...(Array.isArray(filters.tagIds)
      ? filters.tagIds.map((tagId) => resolveOptionName(tags, tagId)).filter(Boolean)
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
              <Tag color="gold" className={styles.filterChip}>Trip discovery</Tag>
              <Title level={2} className={styles.pageTitle}>Explore Locations</Title>
              <Paragraph className={styles.pageSubtitle}>
                Discover places with a stronger sense of fit, then shortlist the ones worth turning into a real day plan.
              </Paragraph>
            </div>
          </div>

          <Card className={styles.mainCard} style={{ marginBottom: 8 }}>
            <PublicLocationFilterBar
              initialValues={filters}
              destinations={destinations}
              districts={districts}
              districtsLoading={districtsLoading}
              locationTypes={locationTypes}
              tags={tags}
              onApply={applyFilters}
              onPreviewChange={handleFilterPreview}
              loading={loading}
            />
          </Card>

          <div className={styles.resultsSummary}>
            <div>
              <Text className={styles.resultCount}>{pagination.total} places worth a look</Text>
              <Text className={styles.resultHint}>
                {activeFilterCount > 0
                  ? `Trimmed with ${activeFilterCount} smart filter${activeFilterCount > 1 ? 's' : ''} so you can compare faster`
                  : 'A wide-open view of places you can shortlist for the day'}
              </Text>
            </div>
            {activeFilterChips.length > 0 ? (
              <div className={styles.chipsRow}>
                {activeFilterChips.map((chip) => (
                  <Tag key={chip} className={styles.filterChip}>{chip}</Tag>
                ))}
              </div>
            ) : null}
          </div>

          <Paragraph className={styles.pageSubtitle} style={{ marginTop: -8 }}>
            Compare the vibe, time commitment, and typical spend at a glance before opening the full profile.
          </Paragraph>

          <Card className={styles.mainCard}>
            <PublicLocationGrid data={data} loading={loading} />
          </Card>

          <div className={styles.paginationWrap}>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={handlePaginationChange}
              showSizeChanger
            />
          </div>
        </Space>
      </div>
    </div>
  );
};

export default PublicLocationsPage;
