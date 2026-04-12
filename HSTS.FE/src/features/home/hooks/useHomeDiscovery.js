import { useEffect, useState } from 'react';
import { getHomeDestinationsApi, getHomeDiscoveryApi } from '@/features/home/api/homeApi';

const FALLBACK_DISCOVERY = {
  hero: {
    title: 'Craft Unforgettable Itineraries',
    subtitle: 'Discover destinations and start planning your next trip with confidence.',
    primaryCta: 'Explore locations',
    secondaryCta: 'Start planning',
  },
  popularLocations: [],
  planningEntry: {
    title: 'Plan your perfect trip in minutes',
    description: 'Tell us your preferences and let Hangout help shape your next journey.',
  },
  socialProof: {
    stats: [
      { label: 'Trips planned', value: '10K+' },
      { label: 'Active travelers', value: '4K+' },
      { label: 'Locations discovered', value: '500+' },
    ],
  },
};

export const useHomeDiscovery = () => {
  const [discovery, setDiscovery] = useState(FALLBACK_DISCOVERY);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHomeDiscovery = async () => {
      setLoading(true);
      try {
        const [discoveryData, destinationsData] = await Promise.all([
          getHomeDiscoveryApi(),
          getHomeDestinationsApi(),
        ]);

        if (discoveryData && typeof discoveryData === 'object') {
          setDiscovery((prev) => ({
            ...prev,
            ...discoveryData,
            hero: {
              ...prev.hero,
              ...(discoveryData.hero || {}),
              primaryCta: 'Explore locations',
              secondaryCta: 'Start planning',
            },
          }));
        }

        if (Array.isArray(destinationsData)) {
          setDestinations(destinationsData);
        } else if (Array.isArray(destinationsData?.items)) {
          setDestinations(destinationsData.items);
        } else if (Array.isArray(destinationsData?.Items)) {
          setDestinations(destinationsData.Items);
        }
      } catch (error) {
        // Handled by global interceptor
      } finally {
        setLoading(false);
      }
    };

    fetchHomeDiscovery();
  }, []);

  return {
    discovery,
    destinations,
    loading,
  };
};
