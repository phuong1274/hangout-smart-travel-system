import { useEffect, useState } from 'react';
import { getMySubmissionsApi } from '@/features/location-submissions/api';
import { usersApi } from '@/features/users/api';

const PREVIEW_LIMIT = 5;

const INITIAL_SUMMARY = {
  submissionCount: 0,
  hasPassword: false,
};

export const useTravelerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [myInfoResult, mySubmissionsResult] = await Promise.allSettled([
          usersApi.getMyInfo(),
          getMySubmissionsApi({ pageIndex: 1, pageSize: PREVIEW_LIMIT }),
        ]);

        const myInfo = myInfoResult.status === 'fulfilled' ? myInfoResult.value?.data : null;
        const mySubmissionsPayload = mySubmissionsResult.status === 'fulfilled' ? mySubmissionsResult.value : null;

        const submissions = Array.isArray(mySubmissionsPayload?.items) ? mySubmissionsPayload.items : [];

        setSummary({
          submissionCount: typeof mySubmissionsPayload?.totalCount === 'number' ? mySubmissionsPayload.totalCount : submissions.length,
          hasPassword: Boolean(myInfo?.hasPassword),
        });

        setRecentSubmissions(submissions.slice(0, PREVIEW_LIMIT));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { loading, summary, recentSubmissions };
};
