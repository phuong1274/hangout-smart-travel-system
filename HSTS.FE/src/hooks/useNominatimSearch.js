import { useState, useRef, useCallback } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;
const RESULT_LIMIT = 5;

const useNominatimSearch = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setSearchValue(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value || value.length < MIN_QUERY_LENGTH) {
      setSearchOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(value)}&limit=${RESULT_LIMIT}&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } },
        );
        const data = await res.json();
        setSearchOptions(
          data.map((item) => ({
            value: `${item.lat},${item.lon}`,
            label: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          })),
        );
      } catch {
        setSearchOptions([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleSelect = useCallback((value, option) => {
    const lat = Number(option.lat);
    const lon = Number(option.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    setSearchValue(option.label);
    return { lat, lon, label: option.label };
  }, []);

  const resetSearch = useCallback(() => {
    setSearchValue('');
    setSearchOptions([]);
  }, []);

  return {
    searchValue,
    searchOptions,
    searching,
    handleSearch,
    handleSelect,
    resetSearch,
  };
};

export default useNominatimSearch;
