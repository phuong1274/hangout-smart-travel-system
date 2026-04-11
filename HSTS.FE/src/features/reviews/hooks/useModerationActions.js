import { useState } from 'react';
import { message } from 'antd';
import { reviewsApi } from '../api';

export const useModerationActions = ({ onChanged } = {}) => {
  const [submitting, setSubmitting] = useState(false);

  const ignoreReports = async (reviewId, note) => {
    setSubmitting(true);
    try {
      await reviewsApi.ignoreReports(reviewId, note);
      message.success('Reports ignored.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  const hide = async (reviewId) => {
    setSubmitting(true);
    try {
      await reviewsApi.hide(reviewId);
      message.success('Review hidden.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (reviewId, note) => {
    setSubmitting(true);
    try {
      await reviewsApi.deleteModerated(reviewId, note);
      message.success('Review deleted.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, ignoreReports, hide, remove };
};
