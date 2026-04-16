import React from 'react';
import { Empty, Row, Col, Divider, Spin, Typography } from 'antd';
import PublicLocationCard from './PublicLocationCard';

const { Paragraph, Text, Title } = Typography;

const SectionBlock = ({ eyebrow, title, description, children }) => (
  <div className="explore-section-block" style={{ width: '100%' }}>
    <Text type="secondary" className="explore-section-eyebrow" style={{ display: 'block', marginBottom: 4 }}>
      {eyebrow}
    </Text>
    <Title level={4} style={{ marginBottom: 6 }}>
      {title}
    </Title>
    <Paragraph type="secondary" style={{ marginBottom: 18, maxWidth: 760 }}>
      {description}
    </Paragraph>
    {children}
  </div>
);

const PublicLocationGrid = ({ data = [], loading = false }) => {
  if (loading) {
    return <Spin size="large" description="Finding the best matches for your route..." />;
  }

  if (!data.length) {
    return <Empty description="No places match this combination yet. Try loosening one or two filters." />;
  }

  const [featuredLocation, ...remainingLocations] = data;
  const featuredKey = featuredLocation?.id ?? featuredLocation?.locationId ?? featuredLocation?.Id;

  return (
    <div>
      <SectionBlock
        eyebrow="Start here"
        title="A standout option to anchor your route"
        description="This first pick is surfaced as the strongest match so you can decide quickly whether it deserves a place in your plan."
      >
        <Row gutter={[20, 20]}>
          <Col key={featuredKey} span={24}>
            <PublicLocationCard location={featuredLocation} variant="featured" />
          </Col>
        </Row>
      </SectionBlock>

      {remainingLocations.length > 0 ? (
        <>
          <Divider style={{ margin: '12px 0 20px' }} />
          <SectionBlock
            eyebrow="More to compare"
            title="Keep exploring the rest of the shortlist"
            description="These places still fit your filters — compare their vibe, time commitment, and spend before opening the full profile."
          >
            <Row gutter={[20, 20]}>
              {remainingLocations.map((location) => {
                const key = location?.id ?? location?.locationId ?? location?.Id;
                return (
                  <Col key={key} xs={24} md={12} xl={8}>
                    <PublicLocationCard location={location} variant="default" />
                  </Col>
                );
              })}
            </Row>
          </SectionBlock>
        </>
      ) : null}
    </div>
  );
};

export default PublicLocationGrid;
