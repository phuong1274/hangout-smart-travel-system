import React from 'react';
import { Button, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';

const { Title, Paragraph } = Typography;

const PlanningEntry = ({ planningEntry }) => {
  const title = planningEntry?.title || 'Ready to turn discovery into a real itinerary?';
  const description =
    planningEntry?.description ||
    'Use what you discovered above to start planning with prefilled destination context.';

  return (
    <section>
      <Title level={3}>{title}</Title>
      <Paragraph>{description}</Paragraph>

      <Space size="middle" wrap>
        <Link to={buildCreateTripPath()}>
          <Button type="primary">Start planning with these picks</Button>
        </Link>
        <Link to={PATHS.PUBLIC_LOCATIONS}>
          <Button>Explore more locations</Button>
        </Link>
      </Space>
    </section>
  );
};

export default PlanningEntry;
