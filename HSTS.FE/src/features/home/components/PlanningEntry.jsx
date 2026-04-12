import React from 'react';
import { Button, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

const { Title, Paragraph } = Typography;

const PlanningEntry = ({ planningEntry }) => {
  return (
    <section>
      <Title level={3}>{planningEntry?.title || 'Start planning your next journey'}</Title>
      <Paragraph>
        {planningEntry?.description ||
          'Build your itinerary based on your interests, budget, and travel style in just a few steps.'}
      </Paragraph>

      <Space size="middle" wrap>
        <Link to={PATHS.PUBLIC_LOCATIONS}>
          <Button type="primary">Explore locations</Button>
        </Link>
        <Link to={PATHS.CREATE_TRIP}>
          <Button>Start planning</Button>
        </Link>
      </Space>
    </section>
  );
};

export default PlanningEntry;
