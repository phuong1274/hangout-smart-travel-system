import React from 'react';
import { Button, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import styles from '../styles/Hero.module.css';
import backgroundHero from '../assets/BackgroundHero.jpg';

const { Title, Paragraph } = Typography;

const HomeHero = ({ hero }) => {
  const title = hero?.title || 'Craft Unforgettable Itineraries';
  const subtitle =
    hero?.subtitle ||
    'Your personal trip planner and travel curator, creating custom itineraries tailored to your interests and budget.';

  return (
    <section className={styles.heroContent} style={{ '--bg-image': `url(${backgroundHero})` }}>
      <div className={styles.mainText}>
        <Title level={1} className={styles.titleText}>
          {title}
        </Title>
        <Paragraph className={styles.description}>{subtitle}</Paragraph>

        <Space size="middle" wrap>
          <Link to={PATHS.PUBLIC_LOCATIONS}>
            <Button type="primary" size="large" className={styles.ctaBtn}>
              Explore locations
            </Button>
          </Link>
          <Link to={PATHS.CREATE_TRIP}>
            <Button size="large" className={styles.ctaBtn}>
              Start planning
            </Button>
          </Link>
        </Space>
      </div>
      <div className={styles.ambientCircle1}></div>
      <div className={styles.ambientCircle2}></div>
    </section>
  );
};

export default HomeHero;
