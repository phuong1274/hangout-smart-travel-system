import { useEffect, useState } from 'react';
import { getAdminDashboardSummaryApi, getAdminDashboardTrendsApi } from '@/features/dashboard/api';

const INITIAL_SUMMARY = {
  totalDestinations: 0,
  totalProvinces: 0,
  totalLocations: 0,
  totalReviews: 0,
  totalItinerariesCreated: 0,
  totalItinerariesCompleted: 0,
};

const INITIAL_TRENDS = {
  locationGrowth: [],
  reviewGrowth: [],
  itineraryGrowth: [],
};

export const useAdminDashboard = () => {
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [trends, setTrends] = useState(INITIAL_TRENDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [summaryData, trendsData] = await Promise.all([
          getAdminDashboardSummaryApi(),
          getAdminDashboardTrendsApi(6),
        ]);

        if (summaryData && typeof summaryData === 'object') {
          setSummary((prev) => ({ ...prev, ...summaryData }));
        }

        if (trendsData && typeof trendsData === 'object') {
          setTrends((prev) => ({ ...prev, ...trendsData }));
        }
      } catch {
        // handled by global interceptor
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return {
    summary,
    trends,
    loading,
  };
};
