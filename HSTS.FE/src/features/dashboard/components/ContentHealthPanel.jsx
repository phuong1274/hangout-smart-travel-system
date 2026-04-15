import React from 'react';
import { Card, List, Typography } from 'antd';

const { Text } = Typography;

const ContentHealthPanel = ({ insights }) => {
  const items = [
    { label: 'Avg Reviews / Active Location', value: Number(insights?.avgReviewsPerActiveLocation || 0) },
    { label: 'Locations Without Reviews', value: Number(insights?.locationsWithoutReviews || 0) },
    { label: 'Locations Added This Month', value: Number(insights?.locationsAddedThisMonth || 0) },
  ];

  return (
    <Card title="Content Health">
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
