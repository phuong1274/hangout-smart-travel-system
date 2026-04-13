import React from 'react';
import { Button, Card, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';
import styles from '../styles/Hero.module.css';
import backgroundHero from '../assets/BackgroundHero.jpg';

const { Title, Paragraph, Text } = Typography;

const HomeHero = ({ hero, heroHighlight }) => {
  const title = hero?.title || 'Discover better places, then build smarter trips';
  const subtitle =
    hero?.subtitle ||
    'Browse standout destinations, compare top-rated spots, and move into planning with real context instead of guesswork.';

  const primaryCta = hero?.primaryCta || 'Explore locations';
  const secondaryCta = hero?.secondaryCta || 'Start planning';

  return (
    <section className={styles.heroContent} style={{ '--bg-image': `url(${backgroundHero})` }}>
      <div className={styles.heroShell}>
        <div className={styles.mainText}>
          <Tag className={styles.heroTag}>Smart discovery for real trips</Tag>
          <Title level={1} className={styles.titleText}>
            {title}
          </Title>
          <Paragraph className={styles.description}>{subtitle}</Paragraph>

          {heroHighlight ? <Text className={styles.heroHighlight}>{heroHighlight}</Text> : null}

          <Space size="middle" wrap>
            <Link to={PATHS.PUBLIC_LOCATIONS}>
              <Button type="primary" size="large" className={styles.ctaBtn}>
                {primaryCta}
              </Button>
            </Link>
            <Link to={buildCreateTripPath()}>
              <Button size="large" className={styles.secondaryBtn}>
                {secondaryCta}
              </Button>
            </Link>
          </Space>
        </div>

        <Card className={styles.heroSpotlight}>
          <Text className={styles.spotlightEyebrow}>This week’s shortcut</Text>
          <Title level={3} className={styles.spotlightTitle}>Move from inspiration to itinerary in one scroll</Title>
          <Paragraph className={styles.spotlightDescription}>
            Pick a destination, scan the strongest places, and jump into planning once the shortlist feels right.
          </Paragraph>
          <div className={styles.spotlightStats}>
            <div>
              <span className={styles.spotlightValue}>Top picks</span>
              <span className={styles.spotlightLabel}>curated from live discovery data</span>
            </div>
            <div>
              <span className={styles.spotlightValue}>Faster planning</span>
              <span className={styles.spotlightLabel}>because you decide with context first</span>
            </div>
          </div>
        </Card>
      </div>
      <div className={styles.ambientCircle1}></div>
      <div className={styles.ambientCircle2}></div>
    </section>
  );
};

export default HomeHero;
