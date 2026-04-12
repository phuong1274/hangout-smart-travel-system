import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { getTripsApi, deleteTripApi } from '../api';
import { useAuthStore } from '@/store/authStore';

export const useTrips = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await getTripsApi(user.id);
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      message.error('Failed to load trips');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleDelete = async (tripId) => {
    try {
      await deleteTripApi(tripId);
      message.success('Trip deleted successfully');
      fetchTrips();
    } catch (error) {
      console.error('Failed to delete trip:', error);
      message.error('Failed to delete trip');
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { data, loading, refetch: fetchTrips, handleDelete };
};
