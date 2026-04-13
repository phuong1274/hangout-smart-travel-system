import React from 'react';
import { Button, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';
import styles from '../styles/Home.module.css';

const { Title, Paragraph } = Typography;

const PlanningEntry = ({ planningEntry }) => {
  const title = planningEntry?.title || 'Ready to turn discovery into a real itinerary?';
  const description =
    planningEntry?.description ||
    'Use what you discovered above to start planning with prefilled destination context.';

  return (
    <section className={styles.planningBanner}>
      <div>
        <Tag className={styles.destSubTitle} style={{ marginBottom: 12 }}>Next step</Tag>
        <Title level={3} className={styles.planningTitle}>{title}</Title>
        <Paragraph className={styles.planningDescription}>{description}</Paragraph>
      </div>

      <Space size="middle" wrap>
        <Link to={buildCreateTripPath()}>
          <Button type="primary" className={styles.destPrimaryAction}>Start planning now</Button>
        </Link>
        <Link to={PATHS.PUBLIC_LOCATIONS}>
          <Button className={styles.destSecondaryAction}>Keep exploring</Button>
        </Link>
      </Space>
    </section>
  );
};

export default PlanningEntry;
