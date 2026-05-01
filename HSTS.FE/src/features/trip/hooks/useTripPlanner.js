import { useState, useCallback } from 'react';
import { message } from 'antd';
import { generateItineraryApi } from '../api';
import { convertBudgetToVnd } from '../constants/currency';

const STORAGE_KEY = 'trip-itinerary-result';

const clearItineraryPersistence = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${STORAGE_KEY}=; Max-Age=0; path=/`;
  }
};

export const useTripPlanner = () => {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const generateItinerary = useCallback(async (formData) => {
    setLoading(true);
    try {
      const requestedGroupSize = Math.max(1, Math.round(Number(formData.groupSize) || 1));
      const normalizedBudget = convertBudgetToVnd(formData.totalBudget, formData.currencyCode);

      const payload = {
        request: {
          userLocation: {
            latitude: formData.latitude,
            longitude: formData.longitude,
          },
          destinations: formData.destinations.map((d) => ({
            provinceId: d.provinceId,
            districtIds: d.districtIds?.length ? d.districtIds : undefined,
          })),
          userFavoriteTagIds: formData.userFavoriteTagIds || [],
          currencyCode: 'VND',
          groupSize: requestedGroupSize,
          minimumAge: formData.minimumAge ?? null,
          totalBudget: normalizedBudget,
          includeContingencyFund: formData.includeContingencyFund !== false,
          startDate: formData.startDate,
          endDate: formData.endDate,
          hotelPreference: formData.hotelPreference || null,
          tripSegment: formData.tripSegment || 'Standard',
        },
      };

      const result = await generateItineraryApi(payload);
      const requestSnapshot = result?.request || result?.Request || payload.request;
      const itineraryWithGroupSize = {
        ...result,
        groupSize: requestedGroupSize,
        GroupSize: requestedGroupSize,
        request: requestSnapshot
          ? {
            ...requestSnapshot,
            groupSize: requestedGroupSize,
            GroupSize: requestedGroupSize,
          }
          : { groupSize: requestedGroupSize, GroupSize: requestedGroupSize },
      };

      setItinerary(itineraryWithGroupSize);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(itineraryWithGroupSize));
      } catch {
        // sessionStorage full – ignore
      }
      return itineraryWithGroupSize;
    } catch (error) {
      message.error('Unable to generate itinerary. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearItinerary = useCallback(() => {
    setItinerary(null);
    clearItineraryPersistence();
  }, []);

  const clearPersistedItinerary = useCallback(() => {
    clearItineraryPersistence();
  }, []);

  const updateItinerary = useCallback((nextItinerary) => {
    setItinerary(nextItinerary);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextItinerary));
    } catch {
      // sessionStorage full – ignore
    }
  }, []);

  return {
    itinerary,
    loading,
    generateItinerary,
    clearItinerary,
    clearPersistedItinerary,
    updateItinerary,
  };
};
