import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import styles from '../styles/Home.module.css';

const { Title } = Typography;

const FeaturedDestinations = ({ destinations = [] }) => {
  const featured = destinations.slice(0, 3);

  return (
    <section className={styles.destSection}>
      <div className={styles.destHeader}>
        <span className={styles.destSubTitle}>Featured</span>
        <Title level={2} className={styles.sectionTitle}>
          Featured destinations
        </Title>
      </div>

      <Row gutter={[32, 32]}>
        {featured.map((item, index) => (
          <Col xs={24} sm={24} md={8} key={item.id || item.destinationId || index} className={styles.destCol}>
            <Card className={styles.destCard} hoverable>
              <Card.Meta
                title={<span className={styles.cardTitle}>{item.name || item.title || 'Destination'}</span>}
                description={
                  <span className={styles.cardDesc}>
                    {item.shortDescription || item.description || 'Discover this destination and plan your next adventure.'}
                  </span>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default FeaturedDestinations;
