import { useState } from 'react';
import { message } from 'antd';
import { reviewsApi } from '../api';

export const useReviewActions = ({ onChanged } = {}) => {
  const [submitting, setSubmitting] = useState(false);

  const create = async (payload) => {
    setSubmitting(true);
    try {
      await reviewsApi.create(payload);
      message.success('Review submitted.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (payload) => {
    setSubmitting(true);
    try {
      await reviewsApi.update(payload);
      message.success('Review updated.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (reviewId) => {
    setSubmitting(true);
    try {
      await reviewsApi.remove(reviewId);
      message.success('Review removed.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  const report = async (payload) => {
    setSubmitting(true);
    try {
      await reviewsApi.report(payload);
      message.success('Report submitted.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, create, update, remove, report };
};
