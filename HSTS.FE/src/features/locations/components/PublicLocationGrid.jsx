import React from 'react';
import { Empty, Row, Col, Spin } from 'antd';
import PublicLocationCard from './PublicLocationCard';

const PublicLocationGrid = ({ data = [], loading = false }) => {
  if (loading) {
    return <Spin size="large" />;
  }

  if (!data.length) {
    return <Empty description="No locations match your filters." />;
  }

  return (
    <Row gutter={[16, 16]}>
      {data.map((location) => {
        const key = location?.id ?? location?.locationId ?? location?.Id;
        return (
          <Col key={key} xs={24} sm={12} lg={8}>
            <PublicLocationCard location={location} />
          </Col>
        );
      })}
    </Row>
  );
};

export default PublicLocationGrid;
