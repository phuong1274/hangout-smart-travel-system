import React from 'react';
import { Card, List, Tag, Typography } from 'antd';

const { Text } = Typography;

const ContentHealthPanel = ({ insights }) => {
  const items = [
    { label: 'Avg Reviews / Active Location', value: Number(insights?.avgReviewsPerActiveLocation || 0) },
    { label: 'Locations Without Reviews', value: Number(insights?.locationsWithoutReviews || 0) },
    { label: 'Locations Added This Month', value: Number(insights?.locationsAddedThisMonth || 0) },
  ];

  return (
    <Card
      bordered={false}
      title="Content Health"
      extra={<Tag color="cyan">Insight</Tag>}
      style={{ borderRadius: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}
    >
      <List
        dataSource={items}
        renderItem={(item) => (
          <List.Item>
            <Text>{item.label}</Text>
            <Text strong>{item.value}</Text>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ContentHealthPanel;
