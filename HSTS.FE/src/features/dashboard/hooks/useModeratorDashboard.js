import { useEffect, useState } from 'react';
import { getAllSubmissionsApi } from '@/features/location-submissions/api';
import { reviewsApi } from '@/features/reviews/api';

const INITIAL_DATA = {
  metrics: {
    pendingSubmissions: 0,
    pendingReports: 0,
    reviewedItems: 0,
    rejectedItems: 0,
  },
  pendingSubmissions: [],
  pendingReports: [],
};

export const useModeratorDashboard = () => {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [submissionResult, reportResult] = await Promise.allSettled([
          getAllSubmissionsApi({ pageIndex: 1, pageSize: 5, status: 0 }),
          reviewsApi.getReportedReviews({ pageIndex: 1, pageSize: 5 }),
        ]);

        const submissionResponse = submissionResult.status === 'fulfilled' ? submissionResult.value : null;
        const reportResponse = reportResult.status === 'fulfilled' ? reportResult.value : null;

        const submissions = submissionResponse?.items || [];
        const reportsPayload = reportResponse?.data || {};
        const reports = reportsPayload?.items || [];

        setData({
          metrics: {
            pendingSubmissions: typeof submissionResponse?.totalCount === 'number' ? submissionResponse.totalCount : 0,
            pendingReports: typeof reportsPayload?.totalCount === 'number' ? reportsPayload.totalCount : 0,
            reviewedItems: 0,
            rejectedItems: 0,
          },
          pendingSubmissions: submissions,
          pendingReports: reports,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { ...data, loading };
};
