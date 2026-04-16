import { useEffect, useState } from 'react';
import {
  getAdminDashboardInsightsApi,
  getAdminDashboardQueuesApi,
  getAdminDashboardSummaryApi,
  getAdminDashboardTrendsApi,
} from '@/features/dashboard/api';

const INITIAL_SUMMARY = {
  totalUsers: 0,
  activeAccounts: 0,
  totalTrips: 0,
  completedTrips: 0,
  activeLocations: 0,
  coveredDestinations: 0,
  visibleReviews: 0,
  pendingLocationSubmissions: 0,
  pendingReviewReports: 0,
  hiddenReviews: 0,
};

const INITIAL_INSIGHTS = {
  tripsCreatedThisMonth: 0,
  tripsCompletedThisMonth: 0,
  locationsAddedThisMonth: 0,
  approvedSubmissionsThisMonth: 0,
  rejectedSubmissionsThisMonth: 0,
  avgReviewsPerActiveLocation: 0,
  locationsWithoutReviews: 0,
  moderationResolutionRate: 0,
};

const INITIAL_TRENDS = {
  locationGrowth: [],
  reviewGrowth: [],
  tripGrowth: [],
};

const INITIAL_QUEUES = {
  pendingSubmissions: [],
  pendingReviewReports: [],
};

export const useAdminDashboard = () => {
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [insights, setInsights] = useState(INITIAL_INSIGHTS);
  const [trends, setTrends] = useState(INITIAL_TRENDS);
  const [queues, setQueues] = useState(INITIAL_QUEUES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [summaryData, insightsData, trendsData, queuesData] = await Promise.all([
          getAdminDashboardSummaryApi(),
          getAdminDashboardInsightsApi(),
          getAdminDashboardTrendsApi(6),
          getAdminDashboardQueuesApi(),
        ]);

        if (summaryData && typeof summaryData === 'object') {
          setSummary((prev) => ({ ...prev, ...summaryData }));
        }

        if (insightsData && typeof insightsData === 'object') {
          setInsights((prev) => ({ ...prev, ...insightsData }));
        }

        if (trendsData && typeof trendsData === 'object') {
          setTrends((prev) => ({ ...prev, ...trendsData }));
        }

        if (queuesData && typeof queuesData === 'object') {
          setQueues((prev) => ({ ...prev, ...queuesData }));
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
    insights,
    trends,
    queues,
    loading,
  };
};
