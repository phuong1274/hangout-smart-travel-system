import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';

const CARD_ITEMS = [
  { key: 'totalUsers', label: 'Total Users' },
  { key: 'activeAccounts', label: 'Active Accounts' },
  { key: 'totalTrips', label: 'Total Trips' },
  { key: 'completedTrips', label: 'Completed Trips' },
  { key: 'activeLocations', label: 'Active Locations' },
  { key: 'coveredDestinations', label: 'Covered Destinations' },
  { key: 'visibleReviews', label: 'Visible Reviews' },
  { key: 'pendingLocationSubmissions', label: 'Pending Submissions' },
  { key: 'pendingReviewReports', label: 'Pending Review Reports' },
  { key: 'hiddenReviews', label: 'Hidden Reviews' },
];

const SummaryCards = ({ summary }) => {
  return (
    <Row gutter={[16, 16]}>
      {CARD_ITEMS.map((item) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={item.key}>
          <Card>
            <Statistic title={item.label} value={Number(summary?.[item.key] || 0)} />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SummaryCards;
