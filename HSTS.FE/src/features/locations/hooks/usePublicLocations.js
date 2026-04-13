import { useCallback, useEffect, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import {
  getAllLocationTypesApi,
  getAllProvincesApi,
  getAllTagsApi,
  getDistrictsByProvinceApi,
  getPublicLocationsApi,
} from '../api';

export const usePublicLocations = (initialFilters = {}, initialPagination = {}) => {
  const { pagination, handleTableChange, setTotal, pageIndex, pageSize } = usePagination(initialPagination.pageSize);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [destinations, setDestinations] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [locationTypes, setLocationTypes] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    handleTableChange({
      current: initialPagination.pageIndex || 1,
      pageSize: initialPagination.pageSize || pageSize,
    });
  }, [handleTableChange, initialPagination.pageIndex, initialPagination.pageSize, pageSize]);

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const updatePagination = useCallback((nextPagination) => {
    handleTableChange(nextPagination);
  }, [handleTableChange]);

  const resetToFirstPage = useCallback(() => {
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  const setPaginationFromResponse = useCallback((response) => {
    setTotal(response?.totalCount || response?.TotalCount || 0);
    handleTableChange({
      current: response?.pageIndex || response?.PageIndex || pageIndex,
      pageSize: response?.pageSize || response?.PageSize || pageSize,
    });
  }, [handleTableChange, pageIndex, pageSize, setTotal]);

  const normalizeCollection = useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.Items)) return payload.Items;
    return [];
  }, []);

  const normalizeLocation = useCallback((location = {}) => ({
    ...location,
    imageUrl: location.imageUrl || location.ImageUrl || '',
    averageRating: location.averageRating ?? location.AverageRating ?? location.score ?? location.Score ?? 0,
    locationType: location.locationType || location.LocationType || null,
    tags: normalizeCollection(location.tags || location.Tags),
    priceMinUsd: location.priceMinUsd ?? location.PriceMinUsd,
    priceMaxUsd: location.priceMaxUsd ?? location.PriceMaxUsd,
    ticketPrice: location.ticketPrice ?? location.TicketPrice,
    recommendedDurationMinutes: location.recommendedDurationMinutes ?? location.RecommendedDurationMinutes,
    status: location.status || location.Status || 'Active',
  }), [normalizeCollection]);

  const normalizeLocations = useCallback((items) => normalizeCollection(items).map(normalizeLocation), [normalizeCollection, normalizeLocation]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [provincesRes, locationTypesRes, tagsRes] = await Promise.all([
          getAllProvincesApi(),
          getAllLocationTypesApi(),
          getAllTagsApi(),
        ]);

        const allTags = normalizeCollection(tagsRes);
        setDestinations(normalizeCollection(provincesRes));
        setLocationTypes(normalizeCollection(locationTypesRes));
        setTags(allTags.filter((tag) => !tag?.parentTagId && !tag?.ParentTagId));
      } catch {
        setDestinations([]);
        setLocationTypes([]);
        setTags([]);
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!filters.destinationId) {
        setDistricts([]);
        setDistrictsLoading(false);
        return;
      }

      setDistrictsLoading(true);

      try {
        const districtsRes = await getDistrictsByProvinceApi(filters.destinationId);
        setDistricts(normalizeCollection(districtsRes));
      } catch {
        setDistricts([]);
      } finally {
        setDistrictsLoading(false);
      }
    };

    loadDistricts();
  }, [filters.destinationId, normalizeCollection]);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        pageIndex,
        pageSize,
        destinationId: filters.destinationId || undefined,
        districtId: filters.districtId || undefined,
        locationTypeId: filters.locationTypeId || undefined,
        keyword: filters.keyword || undefined,
        tagIds: filters.tagIds?.length ? filters.tagIds : undefined,
        minRating: filters.minRating || undefined,
        minBudget: filters.minBudget || undefined,
        maxBudget: filters.maxBudget || undefined,
        maxDurationMinutes: filters.maxDurationMinutes || undefined,
      };

      const response = await getPublicLocationsApi(params);
      setData(normalizeLocations(response?.items || response?.Items || []));
      setPaginationFromResponse(response);
    } catch {
      // Global interceptor handles notifications
    } finally {
      setLoading(false);
    }
  }, [filters.destinationId, filters.districtId, filters.locationTypeId, filters.keyword, filters.tagIds, filters.minRating, filters.minBudget, filters.maxBudget, filters.maxDurationMinutes, pageIndex, pageSize, setTotal]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
    resetToFirstPage();
  }, [resetToFirstPage]);

  const activeFilterCount = [
    filters.destinationId,
    filters.districtId,
    filters.locationTypeId,
    filters.keyword,
    filters.tagIds?.length ? filters.tagIds : undefined,
    filters.minRating,
    filters.minBudget,
    filters.maxBudget,
    filters.maxDurationMinutes,
  ].filter((value) => value !== undefined && value !== null && value !== '' && value !== 0).length;

  return {
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
    fetchLocations,
  };
};
