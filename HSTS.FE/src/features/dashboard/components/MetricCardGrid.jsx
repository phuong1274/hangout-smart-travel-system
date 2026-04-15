import React from 'react';
import { Card, Col, Row, Statistic, Tag } from 'antd';

const CARD_ITEMS = [
  { key: 'totalUsers', label: 'Total Users', tone: 'core', note: 'Identity surface' },
  { key: 'activeAccounts', label: 'Active Accounts', tone: 'core', note: 'Ready to use' },
  { key: 'totalTrips', label: 'Total Trips', tone: 'core', note: 'Planning volume' },
  { key: 'completedTrips', label: 'Completed Trips', tone: 'core', note: 'Finished plans' },
  { key: 'activeLocations', label: 'Active Locations', tone: 'content', note: 'Planning inventory' },
  { key: 'coveredDestinations', label: 'Covered Destinations', tone: 'content', note: 'Geographic breadth' },
  { key: 'visibleReviews', label: 'Visible Reviews', tone: 'content', note: 'Trust signal' },
  { key: 'pendingLocationSubmissions', label: 'Pending Submissions', tone: 'ops', note: 'Needs moderation' },
  { key: 'pendingReviewReports', label: 'Pending Review Reports', tone: 'ops', note: 'Needs review' },
  { key: 'hiddenReviews', label: 'Hidden Reviews', tone: 'ops', note: 'Moderation footprint' },
];

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

const SummaryCards = ({ summary }) => {
  return (
    <Row gutter={[16, 16]}>
      {CARD_ITEMS.map((item) => {
        const tone = TONE_STYLES[item.tone];

        return (
          <Col xs={24} sm={12} lg={8} xl={6} key={item.key}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Tag color={tone.tagColor}>{tone.tagLabel}</Tag>
                <span style={{ fontSize: 12, color: '#64748b' }}>{item.note}</span>
              </div>
              <Statistic title={item.label} value={Number(summary?.[item.key] || 0)} valueStyle={{ fontWeight: 700 }} />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default SummaryCards;
