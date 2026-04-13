import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import {
  getAllLocationTypesApi,
  getAllProvincesApi,
  getAllTagsApi,
  getDistrictsByProvinceApi,
  getPublicLocationsApi,
} from '../api';

export const usePublicLocations = (initialFilters = {}) => {
  const { pagination, handleTableChange, setTotal, pageIndex, pageSize } = usePagination();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [destinations, setDestinations] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [provincesRes, locationTypesRes, tagsRes] = await Promise.all([
          getAllProvincesApi(),
          getAllLocationTypesApi(),
          getAllTagsApi(),
        ]);

        const allTags = Array.isArray(tagsRes) ? tagsRes : tagsRes?.items || tagsRes?.Items || [];
        setDestinations(Array.isArray(provincesRes) ? provincesRes : provincesRes?.items || provincesRes?.Items || []);
        setLocationTypes(Array.isArray(locationTypesRes) ? locationTypesRes : locationTypesRes?.items || locationTypesRes?.Items || []);
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
        return;
      }

      try {
        const districtsRes = await getDistrictsByProvinceApi(filters.destinationId);
        setDistricts(Array.isArray(districtsRes) ? districtsRes : districtsRes?.items || districtsRes?.Items || []);
      } catch {
        setDistricts([]);
      }
    };

    loadDistricts();
  }, [filters.destinationId]);

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
      setData(response?.items || response?.Items || []);
      setTotal(response?.totalCount || response?.TotalCount || 0);
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
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  return {
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
    fetchLocations,
  };
};
