import { useState, useEffect } from 'react';
import { mockDb } from '../mock/mockDb'; 

export const useTripItinerary = (rawItinerary) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rawItinerary || !rawItinerary.days) return;

    const hydrateData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const locationsMap = mockDb.locations;
        const transitHubsMap = mockDb.transitHubs;
        const provincesMap = mockDb.provinces;
        const tagsMap = mockDb.tags;
        const transportMap = mockDb.transportMethods;

        const hydratedDays = rawItinerary.days.map(day => {
          return {
            ...day,
            provinceDetail: provincesMap[day.provinceId] || { name: day.provinceName },
            
            timeline: day.timeline.map(event => {
              let displayTitle = event.title || "";
              
              if (displayTitle.includes('tinh')) {
                displayTitle = displayTitle.replace(/tinh (\d+)/g, (match, id) => {
                  return provincesMap[id] ? provincesMap[id].name : match;
                });
              }

              return {
                ...event,
                title: displayTitle,
                locationDetail: locationsMap[event.locationId] || { 
                  name: displayTitle, 
                  address: "",
                  images: [] 
                },
                tags: event.tagIds ? event.tagIds.map(tagId => tagsMap[tagId] || { name: `Tag ${tagId}` }) : []
              };
            }),

            travelLegs: day.travelLegs?.map(leg => ({
              ...leg,
              transportDetail: transportMap[leg.selectedMethod] || { name: leg.selectedMethod },
              transportOptions: leg.transportOptions?.map(opt => ({
                ...opt,
                // Lọc bỏ các Hub có ID = 0 (như Taxi/Grab đưa đón tận nơi)
                fromHubDetail: opt.fromTransitHubId !== 0 ? (transitHubsMap[opt.fromTransitHubId] || { name: `Hub ${opt.fromTransitHubId}` }) : null,
                toHubDetail: opt.toTransitHubId !== 0 ? (transitHubsMap[opt.toTransitHubId] || { name: `Hub ${opt.toTransitHubId}` }) : null
              }))
            }))
          };
        });

        setData({ ...rawItinerary, days: hydratedDays });
      } catch (err) {
        setError("Có lỗi xảy ra khi tải dữ liệu");
      } finally {
        setIsLoading(false);
      }
    };

    hydrateData();
  }, [rawItinerary]);

  return { data, isLoading, error };
};