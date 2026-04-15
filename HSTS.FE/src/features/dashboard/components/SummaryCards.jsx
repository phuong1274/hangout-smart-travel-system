import React from 'react';
import MetricCardGrid from '@/features/dashboard/components/MetricCardGrid';

const SummaryCards = ({ summary }) => {
  return <MetricCardGrid summary={summary} />;
};

export default SummaryCards;
