import React from 'react';
import { Button, Card, Col, Row, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';
import styles from '../styles/Home.module.css';

const { Title } = Typography;

const FeaturedDestinations = ({ destinations = [] }) => {
  const featured = destinations.slice(0, 3);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className={styles.destSection}>
      <div className={styles.destHeader}>
        <span className={styles.destSubTitle}>Featured</span>
        <Title level={2} className={styles.sectionTitle}>
          Featured destinations
        </Title>
      </div>

      <Row gutter={[32, 32]}>
        {featured.map((item, index) => {
          const destinationId = item.id ?? item.destinationId;
          const explorePath = destinationId
            ? `${PATHS.PUBLIC_LOCATIONS}?destinationId=${encodeURIComponent(destinationId)}`
            : PATHS.PUBLIC_LOCATIONS;

          return (
            <Col xs={24} sm={24} md={8} key={destinationId || index} className={styles.destCol}>
              <Card className={styles.destCard} hoverable>
                <span className={styles.cardTitle}>{item.name || item.title || 'Destination'}</span>
                <div className={styles.cardMeta}>
                  <span className={styles.cardMetaValue}>{item.locationCount ?? 0}</span>
                  <span className={styles.cardMetaLabel}>locations to explore</span>
                </div>
                <Space direction="vertical" size={10} className={styles.destActions}>
                  <Link to={explorePath} className={styles.destLinkFull}>
                    <Button type="primary" block className={styles.destPrimaryAction}>
                      Explore destination
                    </Button>
                  </Link>
                  <Link
                    to={destinationId ? buildCreateTripPath({ provinceId: destinationId }) : buildCreateTripPath()}
                    className={styles.destLinkFull}
                  >
                    <Button block className={styles.destSecondaryAction}>
                      Plan from here
                    </Button>
                  </Link>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </section>
  );
};

export default FeaturedDestinations;
