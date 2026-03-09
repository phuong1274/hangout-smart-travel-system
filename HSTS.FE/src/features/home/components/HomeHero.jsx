import React from 'react';
import { Typography, Card, theme } from 'antd';

const { Title, Paragraph } = Typography;

const HomeHero = () => {
  const { token } = theme.useToken();

  return (
    <Card 
      style={{ 
        marginBottom: 24, 
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`
      }}
    >
      <Title level={2}>Welcome to Hangout - Smart Travel System</Title>
      <Paragraph style={{ fontSize: '16px' }}>
        Your intelligent companion for algorithm-based destination scheduling and automated travel itinerary management.
      </Paragraph>
    </Card>
  );
};

export default HomeHero;
