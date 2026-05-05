import React from 'react';
import { Select, Space } from 'antd';
import { REVIEW_STATUS, getReviewStatusLabel } from '../constants';

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((rating) => ({
  value: rating,
  label: `${rating} star${rating > 1 ? 's' : ''}`,
}));

const STATUS_OPTIONS = [
  REVIEW_STATUS.VISIBLE,
  REVIEW_STATUS.HIDDEN,
].map((status) => ({
  value: status,
  label: getReviewStatusLabel(status),
}));

export const MyReviewFilters = ({
  filterState,
  onRatingChange,
  onStatusChange,
}) => (
  <Space wrap align="center">
    <Select
      allowClear
      placeholder="Filter by rating"
      options={RATING_OPTIONS}
      value={filterState?.ratingFilter}
      onChange={onRatingChange}
      style={{ minWidth: 180 }}
    />
    <Select
      allowClear
      placeholder="Filter by status"
      options={STATUS_OPTIONS}
      value={filterState?.statusFilter}
      onChange={onStatusChange}
      style={{ minWidth: 180 }}
    />
  </Space>
);
