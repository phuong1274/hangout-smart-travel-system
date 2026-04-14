import React from 'react';
import { Button, Card, Col, Row, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { buildCreateTripPath, PATHS } from '@/routes/paths';
import styles from '../styles/Home.module.css';

const { Paragraph, Title } = Typography;

const FeaturedDestinations = ({ destinations = [] }) => {
  const featured = destinations.slice(0, 3);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className={styles.destSection}>
      <div className={styles.destHeaderRow}>
        <div className={styles.destHeader}>
          <span className={styles.destSubTitle}>Featured</span>
          <Title level={2} className={styles.sectionTitle}>
            Featured destinations
          </Title>
          <Paragraph className={styles.destDescription}>
            Start with the places that give you the strongest base for a smarter trip, then open the full destination list when you want more range.
          </Paragraph>
        </div>
        <Link to={PATHS.PUBLIC_LOCATIONS}>
          <Button className={styles.popularAction}>See all destinations</Button>
        </Link>
      </div>

      <Row gutter={[32, 32]}>
        {featured.map((item, index) => {
          const destinationId = item.id ?? item.destinationId;
          const explorePath = destinationId
            ? `${PATHS.PUBLIC_LOCATIONS}?destinationId=${encodeURIComponent(destinationId)}`
            : PATHS.PUBLIC_LOCATIONS;
          const destinationName = item.name || item.title || 'Destination';
          const locationCount = item.locationCount ?? 0;
          const destinationTone = index === 0 ? 'Lead pick' : index === 1 ? 'Easy to start with' : 'Worth a closer look';
          const destinationSupport = index === 0
            ? 'A strong first stop when you want a fuller base for browsing and planning.'
            : 'A lighter starting point for comparing places before you commit to a route.';

          return (
            <Col xs={24} sm={24} md={index === 0 ? 24 : 12} lg={index === 0 ? 24 : 12} key={destinationId || index} className={styles.destCol}>
              <Card className={`${styles.destCard} ${index === 0 ? styles.destCardLead : ''}`} hoverable>
                <div className={styles.destCardAccent} />
                <span className={styles.destCardEyebrow}>{destinationTone}</span>
                <span className={styles.cardTitle}>{destinationName}</span>
                <Paragraph className={styles.destCardDescription}>{destinationSupport}</Paragraph>
                <div className={styles.cardMeta}>
                  <span className={styles.cardMetaValue}>{locationCount}</span>
                  <span className={styles.cardMetaLabel}>places ready to compare</span>
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
                      Start from this destination
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
