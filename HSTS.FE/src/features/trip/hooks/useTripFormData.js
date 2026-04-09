import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProvincesApi,
  getRootTagsApi,
  getChildTagsApi,
  getDistrictsByProvinceApi,
} from '../api';

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
