import React from 'react';
import { Col, Row, Statistic } from 'antd';

const SocialProofBand = ({ stats = [] }) => {
  return (
    <section>
      <Row gutter={[16, 16]}>
        {stats.map((item, index) => (
          <Col xs={24} sm={8} key={item.label || index}>
            <Statistic value={item.value || 0} title={item.label || 'Metric'} />
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default SocialProofBand;
