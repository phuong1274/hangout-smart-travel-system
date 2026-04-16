import { useEffect, useState } from 'react';
import { getPartnerLocationsApi } from '@/features/locations/api';
import { getMySubmissionsApi } from '@/features/location-submissions/api';
import { SubmissionStatus } from '@/features/location-submissions/types';

const LocationStatus = {
  Active: 1,
  TemporarilyClosed: 2,
  Inactive: 3,
};

const INITIAL_METRICS = {
  totalLocations: 0,
  activeLocations: 0,
  closedLocations: 0,
  pendingSubmissions: 0,
  rejectedSubmissions: 0,
};

const PREVIEW_LIMIT = 5;

const getItems = (response) => response?.items || response?.Items || [];

const getTotalCount = (response) => {
  if (typeof response?.totalCount === 'number') return response.totalCount;
  if (typeof response?.TotalCount === 'number') return response.TotalCount;
  return getItems(response).length;
};

const buildNeedsAttentionPreview = (locations, submissions) => {
  const closedLocations = locations
    .filter((item) => {
      const status = item.effectiveStatus || item.status;
      return status === LocationStatus.TemporarilyClosed || status === LocationStatus.Inactive;
    })
    .map((item) => ({
      key: `location-${item.id}`,
      title: item.name || `Location #${item.id}`,
      subtitle: item.address || item.fullAddress || 'Location status needs review',
      type: 'location',
    }));

  const rejectedSubmissions = submissions
    .filter((item) => item.status === SubmissionStatus.Rejected)
    .map((item) => ({
      key: `submission-rejected-${item.id}`,
      title: item.name || `Submission #${item.id}`,
      subtitle: 'Rejected submission',
      type: 'submission-rejected',
    }));

  const pendingSubmissions = submissions
    .filter((item) => item.status === SubmissionStatus.Pending)
    .map((item) => ({
      key: `submission-pending-${item.id}`,
      title: item.name || `Submission #${item.id}`,
      subtitle: 'Awaiting moderation result',
      type: 'submission-pending',
    }));

  return [...closedLocations, ...rejectedSubmissions, ...pendingSubmissions].slice(0, PREVIEW_LIMIT);
};

export const usePartnerDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [needsAttention, setNeedsAttention] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [locationsResult, submissionsResult, pendingResult, rejectedResult] = await Promise.allSettled([
          getPartnerLocationsApi({ pageIndex: 1, pageSize: 100 }),
          getMySubmissionsApi({ pageIndex: 1, pageSize: 10 }),
          getMySubmissionsApi({ pageIndex: 1, pageSize: 1, status: SubmissionStatus.Pending }),
          getMySubmissionsApi({ pageIndex: 1, pageSize: 1, status: SubmissionStatus.Rejected }),
        ]);

        const locationsResponse = locationsResult.status === 'fulfilled' ? locationsResult.value : null;
        const submissionsResponse = submissionsResult.status === 'fulfilled' ? submissionsResult.value : null;
        const pendingResponse = pendingResult.status === 'fulfilled' ? pendingResult.value : null;
        const rejectedResponse = rejectedResult.status === 'fulfilled' ? rejectedResult.value : null;

        const locations = getItems(locationsResponse);
        const submissions = getItems(submissionsResponse);

        const activeLocations = locations.filter((item) => (item.effectiveStatus || item.status) === LocationStatus.Active).length;
        const closedLocations = locations.filter((item) => {
          const status = item.effectiveStatus || item.status;
          return status === LocationStatus.TemporarilyClosed || status === LocationStatus.Inactive;
        }).length;

        const pendingSubmissionsFromPage = submissions.filter((item) => item.status === SubmissionStatus.Pending).length;
        const rejectedSubmissionsFromPage = submissions.filter((item) => item.status === SubmissionStatus.Rejected).length;

        const pendingSubmissionsTotal = pendingResponse ? getTotalCount(pendingResponse) : null;
        const rejectedSubmissionsTotal = rejectedResponse ? getTotalCount(rejectedResponse) : null;

        setMetrics({
          totalLocations: getTotalCount(locationsResponse),
          activeLocations,
          closedLocations,
          pendingSubmissions: pendingSubmissionsTotal ?? pendingSubmissionsFromPage,
          rejectedSubmissions: rejectedSubmissionsTotal ?? rejectedSubmissionsFromPage,
        });

        setNeedsAttention(buildNeedsAttentionPreview(locations, submissions));
        setRecentSubmissions(submissions.slice(0, PREVIEW_LIMIT));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { loading, metrics, needsAttention, recentSubmissions };
};
