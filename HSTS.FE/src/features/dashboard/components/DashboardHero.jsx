import React from 'react';
import { Button, Card, Space, Typography } from 'antd';

const { Text, Title } = Typography;

const DashboardHero = ({ title, description, actionLabel, onAction }) => {
  return (
    <Card
      bordered={false}
      bodyStyle={{ padding: 20 }}
      style={{
        borderRadius: 20,
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
        background: 'linear-gradient(180deg, rgba(22, 119, 255, 0.06), rgba(255,255,255,0.95))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space direction="vertical" size={4} style={{ maxWidth: 720 }}>
          <Title level={2} style={{ margin: 0 }}>{title}</Title>
          {description ? <Text type="secondary">{description}</Text> : null}
        </Space>

        {actionLabel ? (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
};

export default DashboardHero;
