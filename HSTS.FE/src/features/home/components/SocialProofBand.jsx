import React from 'react';
import { Col, Row, Typography } from 'antd';
import styles from '@/features/home/styles/Home.module.css';

const { Paragraph, Title } = Typography;

const SocialProofBand = ({ socialProof }) => {
  const title = socialProof?.title || 'Current discovery coverage';
  const description =
    socialProof?.description ||
    'A quick view of how much destination and location data is currently available to support trip planning.';
  const stats = Array.isArray(socialProof?.stats) ? socialProof.stats : [];

  if (!socialProof?.hasRealData || stats.length === 0) {
    return null;
  }

  return (
    <section className={styles.socialProofSection}>
      <div className={styles.socialProofHeader}>
        <span className={styles.destSubTitle}>Trust signals</span>
        <Title level={3} className={styles.socialProofTitle}>{title}</Title>
        <Paragraph className={styles.socialProofDescription}>{description}</Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((item, index) => (
          <Col xs={24} sm={12} lg={8} key={item.key || item.label || index}>
            <article className={styles.socialProofCard}>
              <div className={styles.socialProofValue}>{item.value || 0}</div>
              <div className={styles.socialProofLabel}>{item.label || 'Metric'}</div>
              <Paragraph className={styles.socialProofSupportCopy}>
                {item.supportCopy || 'Supports better trip discovery and planning.'}
              </Paragraph>
            </article>
          </Col>
        ))}
      </Row>
    </section>
  );
};

export default SocialProofBand;
