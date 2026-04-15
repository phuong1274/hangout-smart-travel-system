import React from 'react';
import { Card, Empty, Space, Typography } from 'antd';

const { Text, Title } = Typography;

const buildPolyline = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return '';
  }

  const maxValue = Math.max(...points.map((item) => Number(item?.value || 0)), 1);

  return points
    .map((item, index) => {
      const x = points.length === 1 ? 100 : (index / (points.length - 1)) * 100;
      const y = 60 - (Number(item?.value || 0) / maxValue) * 48;
      return `${x},${y}`;
    })
    .join(' ');
};

const TrendPanel = ({ title, points = [] }) => {
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;
  const polyline = buildPolyline(points);

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text type="secondary">Last 6 months</Text>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
        </div>

        {polyline ? (
          <>
            <svg viewBox="0 0 100 60" style={{ width: '100%', height: 160 }}>
              <polyline
                fill="none"
                stroke="#1677ff"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polyline}
              />
            </svg>
            <Text strong>{lastPoint?.label || '-'}: {Number(lastPoint?.value || 0)}</Text>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
        )}
      </Space>
    </Card>
  );
};

export default TrendPanel;
