import { useEffect, useState } from 'react';
import { getHomeDestinationsApi, getHomeDiscoveryApi } from '@/features/home/api/homeApi';

const normalizeDestination = (item = {}) => {
  const id = item.id ?? item.destinationId ?? item.provinceId ?? null;
  const locationCount = Number(
    item.locationCount ?? item.locationsCount ?? item.totalLocations ?? item.totalLocationCount ?? 0,
  );

  return {
    ...item,
    id,
    name: item.name || item.title || 'Destination',
    locationCount: Number.isFinite(locationCount) ? locationCount : 0,
  };
};

const normalizeDestinations = (payload) => {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.Items)
        ? payload.Items
        : [];

  return raw.map(normalizeDestination);
};

const DEFAULT_SOCIAL_PROOF_STATS = [
  {
    key: 'destinations',
    label: 'Destinations available',
    value: 0,
    supportCopy: 'Compare province-level options before you commit to one plan.',
  },
  {
    key: 'locations',
    label: 'Locations to compare',
    value: 0,
    supportCopy: 'Use ratings and budget context to shortlist places faster.',
  },
  {
    key: 'plannedTrips',
    label: 'Trips planned',
    value: 0,
    supportCopy: 'See that discovery insights are turning into real itineraries.',
  },
];

const normalizeStatItem = (item = {}, fallback = {}) => {
  const numericValue = Number(item.value ?? item.count ?? fallback.value ?? 0);

  return {
    key: item.key || fallback.key || item.label || 'metric',
    label: item.label || fallback.label || 'Metric',
    value: Number.isFinite(numericValue) ? numericValue : 0,
    supportCopy:
      item.supportCopy || item.description || item.context || fallback.supportCopy || 'Supports better trip discovery and planning.',
  };
};

const normalizeSocialProof = (socialProof = {}) => {
  const incomingStats = Array.isArray(socialProof?.stats) ? socialProof.stats : [];

  const stats = DEFAULT_SOCIAL_PROOF_STATS.map((fallback, index) => normalizeStatItem(incomingStats[index], fallback));

  return {
    title: socialProof?.title || 'Why these numbers matter for your planning decisions',
    description:
      socialProof?.description ||
      'These live metrics show how much discovery depth and planning momentum you can use right now.',
    stats,
  };
};

const FALLBACK_DISCOVERY = {
  hero: {
    title: 'Discover places worth your next trip',
    subtitle: 'Explore destinations and popular locations first, then move into planning with context.',
    primaryCta: 'Explore locations',
    secondaryCta: 'Start planning',
  },
  popularLocations: [],
  planningEntry: {
    title: 'Ready to turn discovery into a real itinerary?',
    description: 'Use what you discovered to start planning with destination context prefilled.',
  },
  socialProof: normalizeSocialProof(),
};

export const useHomeDiscovery = () => {
  const [discovery, setDiscovery] = useState(FALLBACK_DISCOVERY);
  const [homepageDestinations, setHomepageDestinations] = useState([]);
  const [heroHighlight, setHeroHighlight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHomeDiscovery = async () => {
      setLoading(true);
      try {
        const [discoveryResult, destinationsResult] = await Promise.allSettled([
          getHomeDiscoveryApi(),
          getHomeDestinationsApi(),
        ]);

        if (discoveryResult.status === 'fulfilled') {
          const discoveryData = discoveryResult.value;
          if (discoveryData && typeof discoveryData === 'object') {
            setDiscovery((prev) => ({
              ...prev,
              ...discoveryData,
              hero: {
                ...prev.hero,
                ...(discoveryData.hero || {}),
              },
              planningEntry: {
                ...prev.planningEntry,
                ...(discoveryData.planningEntry || {}),
              },
              socialProof: normalizeSocialProof(discoveryData.socialProof),
            }));

            const discoveryHeroHighlight =
              discoveryData?.hero?.highlight || discoveryData?.hero?.trendingText || discoveryData?.heroHighlight || '';
            setHeroHighlight(typeof discoveryHeroHighlight === 'string' ? discoveryHeroHighlight : '');
          }
        }

        if (destinationsResult.status === 'fulfilled') {
          const normalizedDestinations = normalizeDestinations(destinationsResult.value);
          setHomepageDestinations(normalizedDestinations);

        }
      } finally {
        setLoading(false);
      }
    };

    fetchHomeDiscovery();
  }, []);

  return {
    discovery,
    homepageDestinations,
    heroHighlight,
    loading,
  };
};
