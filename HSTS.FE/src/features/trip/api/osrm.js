const OSRM_BASE_URL = import.meta.env.VITE_OSRM_BASE_URL || 'https://router.project-osrm.org';
const OSRM_PROFILE = import.meta.env.VITE_OSRM_PROFILE || 'driving';

export const getOsrmRoute = async (from, to) => {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const query = 'overview=full&geometries=geojson&alternatives=false&steps=false';
  const url = `${OSRM_BASE_URL}/route/v1/${OSRM_PROFILE}/${coordinates}?${query}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch OSRM route');
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  const coordinatesList = route?.geometry?.coordinates;

  if (!Array.isArray(coordinatesList) || coordinatesList.length === 0) {
    return null;
  }

  return {
    distanceMeters: route.distance ?? null,
    durationSeconds: route.duration ?? null,
    path: coordinatesList.map(([lng, lat]) => [lat, lng]),
  };
};
