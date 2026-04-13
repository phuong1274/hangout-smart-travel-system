import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import {
  getAllLocationTypesApi,
  getAllProvincesApi,
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

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [provincesRes, locationTypesRes] = await Promise.all([
          getAllProvincesApi(),
          getAllLocationTypesApi(),
        ]);

        setDestinations(Array.isArray(provincesRes) ? provincesRes : provincesRes?.items || provincesRes?.Items || []);
        setLocationTypes(Array.isArray(locationTypesRes) ? locationTypesRes : locationTypesRes?.items || locationTypesRes?.Items || []);
      } catch {
        setDestinations([]);
        setLocationTypes([]);
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
        minRating: filters.minRating || undefined,
      };

      const response = await getPublicLocationsApi(params);
      setData(response?.items || response?.Items || []);
      setTotal(response?.totalCount || response?.TotalCount || 0);
    } catch {
      // Global interceptor handles notifications
    } finally {
      setLoading(false);
    }
  }, [filters.destinationId, filters.districtId, filters.locationTypeId, filters.keyword, filters.minRating, pageIndex, pageSize, setTotal]);

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
    handleTableChange,
    handleFilterChange,
    fetchLocations,
  };
};
