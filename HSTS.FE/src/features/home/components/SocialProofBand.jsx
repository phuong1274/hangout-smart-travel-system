import React from 'react';
import { Col, Row, Typography } from 'antd';
import styles from '@/features/home/styles/Home.module.css';

const { Paragraph, Title } = Typography;

const SocialProofBand = ({ socialProof }) => {
  const title = socialProof?.title || 'Why these numbers matter for your planning decisions';
  const description =
    socialProof?.description ||
    'These live metrics show how much discovery depth and planning momentum you can use right now.';
  const stats = Array.isArray(socialProof?.stats) ? socialProof.stats : [];

  return (
    <section className={styles.socialProofSection}>
      <div className={styles.socialProofHeader}>
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
