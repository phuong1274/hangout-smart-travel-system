import React from 'react';
import { Card, Empty, List, Typography } from 'antd';

const { Text } = Typography;

const TrendPanel = ({ title, points = [] }) => {
  return (
    <Card title={title}>
      {Array.isArray(points) && points.length > 0 ? (
        <List
          dataSource={points}
          renderItem={(item) => (
            <List.Item>
              <Text>{item?.label || '-'}</Text>
              <Text strong>{Number(item?.value || 0)}</Text>
            </List.Item>
          )}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" />
      )}
    </Card>
  );
};

export default TrendPanel;
