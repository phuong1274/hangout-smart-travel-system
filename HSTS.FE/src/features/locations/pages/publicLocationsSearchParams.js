export const normalizeExploreFiltersForDestinationChange = (currentFilters = {}, nextDestinationId) => ({
  ...currentFilters,
  destinationId: nextDestinationId,
  districtId: undefined,
});

export const buildExploreLocationSearchParams = (filters = {}, pagination = {}) => {
  const params = new URLSearchParams();

  if (filters.destinationId) params.set('destinationId', String(filters.destinationId));
  if (filters.districtId) params.set('districtId', String(filters.districtId));
  if (filters.locationTypeId) params.set('locationTypeId', String(filters.locationTypeId));
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (Array.isArray(filters.tagIds)) {
    filters.tagIds.forEach((tagId) => params.append('tagIds', String(tagId)));
  }
  if (filters.minRating) params.set('minRating', String(filters.minRating));
  if (filters.minBudget != null) params.set('minBudget', String(filters.minBudget));
  if (filters.maxBudget != null) params.set('maxBudget', String(filters.maxBudget));
  if (filters.maxDurationMinutes != null) params.set('maxDurationMinutes', String(filters.maxDurationMinutes));
  if (pagination.pageIndex && pagination.pageIndex > 1) params.set('page', String(pagination.pageIndex));
  if (pagination.pageSize && pagination.pageSize !== 10) params.set('pageSize', String(pagination.pageSize));

  return params;
};
