import React from 'react';
import { Button, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import styles from '../styles/Hero.module.css';
import backgroundHero from '../assets/BackgroundHero.jpg';

const { Title, Paragraph, Text } = Typography;

const HomeHero = ({ hero, heroHighlight }) => {
  const title = hero?.title || 'Discover places worth your next trip';
  const subtitle =
    hero?.subtitle ||
    'Explore destinations, compare popular spots, and move into planning when you already know where you want to go.';

  const primaryCta = hero?.primaryCta || 'Explore locations';

  return (
    <section className={styles.heroContent} style={{ '--bg-image': `url(${backgroundHero})` }}>
      <div className={styles.mainText}>
        <Title level={1} className={styles.titleText}>
          {title}
        </Title>
        <Paragraph className={styles.description}>{subtitle}</Paragraph>

        {heroHighlight ? <Text className={styles.description}>{heroHighlight}</Text> : null}

        <Space size="middle" wrap>
          <Link to={PATHS.PUBLIC_LOCATIONS}>
            <Button type="primary" size="large" className={styles.ctaBtn}>
              {primaryCta}
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
