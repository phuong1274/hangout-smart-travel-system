import React from 'react';
import { Button, Col, Empty, Row, Typography } from 'antd';
import { Link } from 'react-router-dom';
import PublicLocationCard from '@/features/locations/components/PublicLocationCard';
import { PATHS } from '@/routes/paths';
import styles from '../styles/Home.module.css';

const { Paragraph, Title } = Typography;

const PopularLocations = ({ locations = [] }) => {
  const featuredLocations = locations.slice(0, 8);

  return (
    <section className={styles.popularSection}>
      <div className={styles.popularHeader}>
        <div>
          <span className={styles.destSubTitle}>Popular now</span>
          <Title level={2} className={styles.popularTitle}>Popular locations for smarter trip decisions</Title>
          <Paragraph className={styles.popularDescription}>
            Scan the strongest places first, compare their travel fit, and jump into planning once one earns a spot on your route.
          </Paragraph>
        </div>
        <Link to={PATHS.PUBLIC_LOCATIONS}>
          <Button className={styles.popularAction}>See all locations</Button>
        </Link>
      </div>

      {featuredLocations.length > 0 ? (
        <Row gutter={[24, 24]}>
          {featuredLocations.map((location, index) => {
            const key = location?.id ?? location?.locationId ?? location?.Id ?? `${location?.name || location?.title || 'location'}-${index}`;
            return (
              <Col xs={24} sm={12} lg={index === 0 ? 12 : 8} xl={index === 0 ? 12 : 6} key={key}>
                <PublicLocationCard location={location} variant={index === 0 ? 'featured' : 'home'} />
              </Col>
            );
          })}
        </Row>
      ) : (
        <Empty description="No popular locations available right now." />
      )}
    </section>
  );
};

export default PopularLocations;
