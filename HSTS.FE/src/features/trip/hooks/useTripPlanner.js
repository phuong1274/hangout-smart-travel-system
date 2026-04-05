import { useState, useCallback } from 'react';
import { message } from 'antd';
import { generateItineraryApi } from '../api';
import { convertBudgetToVnd } from '../constants/currency';

const STORAGE_KEY = 'trip-itinerary-result';

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
          groupSize: formData.groupSize,
          minimumAge: formData.minimumAge ?? 0,
          totalBudget: normalizedBudget,
          includeContingencyFund: formData.includeContingencyFund !== false,
          startDate: formData.startDate,
          endDate: formData.endDate,
          hotelPreference: formData.hotelPreference || null,
          tripSegment: formData.tripSegment || 'Standard',
        },
      };

      const result = await generateItineraryApi(payload);
      setItinerary(result);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      } catch {
        // sessionStorage full – ignore
      }
      return result;
    } catch (error) {
      message.error('Unable to generate itinerary. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearItinerary = useCallback(() => {
    setItinerary(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { itinerary, loading, generateItinerary, clearItinerary };
};
