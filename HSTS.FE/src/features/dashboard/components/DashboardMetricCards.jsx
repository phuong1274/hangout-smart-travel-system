import React from 'react';
import { Card, Col, Empty, Row, Statistic, Tag, Typography } from 'antd';

const { Text } = Typography;

const TONE_STYLES = {
  core: {
    borderTop: '3px solid #1677ff',
    background: 'linear-gradient(180deg, rgba(22, 119, 255, 0.06), rgba(255,255,255,0.95))',
    tagColor: 'blue',
    tagLabel: 'Core',
  },
  content: {
    borderTop: '3px solid #13c2c2',
    background: 'linear-gradient(180deg, rgba(19, 194, 194, 0.06), rgba(255,255,255,0.95))',
    tagColor: 'cyan',
    tagLabel: 'Content',
  },
  ops: {
    borderTop: '3px solid #faad14',
    background: 'linear-gradient(180deg, rgba(250, 173, 20, 0.08), rgba(255,255,255,0.95))',
    tagColor: 'gold',
    tagLabel: 'Ops',
  },
};

const DashboardMetricCards = ({ items = [] }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <Empty description="No summary data available" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => {
        const tone = TONE_STYLES[item.tone] || TONE_STYLES.core;
        const tagLabel = item.tagLabel ?? tone.tagLabel;
        const tagColor = item.tagColor ?? tone.tagColor;

        return (
          <Col xs={24} sm={12} lg={8} xl={6} key={item.key ?? item.label}>
            <Card
              bordered={false}
              bodyStyle={{ padding: 20 }}
              style={{
                borderRadius: 20,
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
                borderTop: tone.borderTop,
                background: tone.background,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
                {tagLabel ? <Tag color={tagColor}>{tagLabel}</Tag> : <span />}
                {item.note ? <Text type="secondary" style={{ fontSize: 12 }}>{item.note}</Text> : null}
              </div>

              <Statistic
                title={item.label}
                value={item.value}
                valueStyle={{ fontWeight: 700 }}
                suffix={item.suffix}
              />

              {item.helper ? (
                <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
                  {item.helper}
                </Text>
              ) : null}
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default DashboardMetricCards;
