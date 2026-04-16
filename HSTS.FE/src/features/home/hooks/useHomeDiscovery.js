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

const normalizeStatItem = (item = {}) => {
  const numericValue = Number(item.value ?? item.count ?? 0);

  return {
    key: item.key || item.label || 'metric',
    label: item.label || 'Metric',
    value: Number.isFinite(numericValue) ? numericValue : 0,
    supportCopy:
      item.supportCopy || item.description || item.context || 'Supports better trip discovery and planning.',
    hasRealValue: item.hasRealValue !== false,
  };
};

const normalizeSocialProof = (socialProof) => {
  const incomingStats = Array.isArray(socialProof?.stats) ? socialProof.stats.map(normalizeStatItem) : [];
  const hasRealData = Boolean(socialProof?.hasRealData) && incomingStats.length > 0;

  if (!hasRealData) {
    return null;
  }

  return {
    title: socialProof?.title || 'Current discovery coverage',
    description:
      socialProof?.description ||
      'A quick view of how much destination and location data is currently available to support trip planning.',
    stats: incomingStats,
    hasRealData,
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
  socialProof: null,
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
