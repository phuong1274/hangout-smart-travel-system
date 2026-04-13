import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProvincesApi,
  getRootTagsApi,
  getChildTagsApi,
  getDistrictsByProvinceApi,
} from '../api';

const toPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export const parseTripPrefillParams = (searchParams) => {
  const provinceId = toPositiveNumber(searchParams.get('provinceId'));
  const districtId = toPositiveNumber(searchParams.get('districtId'));
  const locationId = toPositiveNumber(searchParams.get('locationId'));
  const tagIds = String(searchParams.get('tagIds') || '')
    .split(',')
    .map((value) => toPositiveNumber(value.trim()))
    .filter((value) => value != null);

  return {
    provinceId,
    districtId,
    locationId,
    tagIds: Array.from(new Set(tagIds)),
  };
};

export const useTripFormData = () => {
  const [provinces, setProvinces] = useState([]);
  const [rootTags, setRootTags] = useState([]);
  const [childTagsMap, setChildTagsMap] = useState({});
  const [districtsMap, setDistrictsMap] = useState({});
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const fetchedChildTags = useRef(new Set());
  const fetchedDistricts = useRef(new Set());

  useEffect(() => {
    const load = async () => {
      setLoadingProvinces(true);
      try {
        const data = await getProvincesApi();
        setProvinces(Array.isArray(data) ? data : data.items || data.Items || []);
      } catch { /* handled by interceptor */ }
      finally { setLoadingProvinces(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingTags(true);
      try {
        const data = await getRootTagsApi();
        setRootTags(Array.isArray(data) ? data : data.items || data.Items || []);
      } catch { /* handled by interceptor */ }
      finally { setLoadingTags(false); }
    };
    load();
  }, []);

  const fetchChildTags = useCallback(async (parentId) => {
    if (fetchedChildTags.current.has(parentId)) return;
    fetchedChildTags.current.add(parentId);
    try {
      const data = await getChildTagsApi(parentId);
      const items = Array.isArray(data) ? data : data.items || data.Items || [];
      setChildTagsMap((prev) => ({ ...prev, [parentId]: items }));
    } catch {
      fetchedChildTags.current.delete(parentId);
    }
  }, []);

  const fetchDistricts = useCallback(async (provinceId) => {
    if (fetchedDistricts.current.has(provinceId)) return;
    fetchedDistricts.current.add(provinceId);
    try {
      const data = await getDistrictsByProvinceApi(provinceId);
      const items = Array.isArray(data) ? data : data.items || data.Items || [];
      setDistrictsMap((prev) => ({ ...prev, [provinceId]: items }));
    } catch {
      fetchedDistricts.current.delete(provinceId);
    }
  }, []);

  return {
    provinces,
    rootTags,
    childTagsMap,
    districtsMap,
    loadingProvinces,
    loadingTags,
    fetchChildTags,
    fetchDistricts,
  };
};
