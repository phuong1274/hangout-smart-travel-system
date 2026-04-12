import React from 'react';
import { List, Typography } from 'antd';

const { Title, Text } = Typography;

const PopularLocations = ({ locations = [] }) => {
  return (
    <section>
      <Title level={3}>Popular locations</Title>
      <List
        bordered
        dataSource={locations}
        locale={{ emptyText: 'No popular locations available.' }}
        renderItem={(item) => (
          <List.Item>
            <Text strong>{item.name || item.title || 'Location'}</Text>
          </List.Item>
        )}
      />
    </section>
  );
};

export default PopularLocations;
