import React from 'react';
import { Card, Progress, Space, Typography } from 'antd';

const { Text, Title } = Typography;

const ComparisonPanel = ({ title, leftLabel, leftValue, rightLabel, rightValue }) => {
  const total = Number(leftValue || 0) + Number(rightValue || 0);
  const leftPercent = total === 0 ? 0 : Math.round((Number(leftValue || 0) * 100) / total);
  const rightPercent = total === 0 ? 0 : 100 - leftPercent;

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        <div>
          <Text>{leftLabel}: </Text>
          <Text strong>{Number(leftValue || 0)}</Text>
        </div>
        <div>
          <Text>{rightLabel}: </Text>
          <Text strong>{Number(rightValue || 0)}</Text>
        </div>
        <Progress percent={leftPercent} success={{ percent: rightPercent }} />
      </Space>
    </Card>
  );
};

export default ComparisonPanel;
