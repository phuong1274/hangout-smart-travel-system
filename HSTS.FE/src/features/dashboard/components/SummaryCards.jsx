import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';

const SUMMARY_ITEMS = [
  { key: 'totalDestinations', label: 'Destinations' },
  { key: 'totalProvinces', label: 'Provinces' },
  { key: 'totalLocations', label: 'Locations' },
  { key: 'totalReviews', label: 'Reviews' },
  { key: 'totalItinerariesCreated', label: 'Itineraries Created' },
  { key: 'totalItinerariesCompleted', label: 'Itineraries Completed' },
];

const SummaryCards = ({ summary }) => {
  return (
    <Row gutter={[16, 16]}>
      {SUMMARY_ITEMS.map((item) => (
        <Col xs={24} sm={12} lg={8} key={item.key}>
          <Card>
            <Statistic title={item.label} value={Number(summary?.[item.key] || 0)} />
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SummaryCards;
