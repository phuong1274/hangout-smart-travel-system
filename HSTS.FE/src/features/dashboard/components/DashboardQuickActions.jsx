import React from 'react';
import { Button, Card, Col, Row, Space, Typography } from 'antd';

const { Text, Title } = Typography;

const BUTTON_TYPES = new Set(['primary', 'default', 'dashed', 'link', 'text']);

const getButtonType = (actionType) => {
  const normalized = actionType || 'default';
  return BUTTON_TYPES.has(normalized) ? normalized : 'default';
};

const DashboardQuickActions = ({ title = 'Quick actions', description, actions = [] }) => {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  return (
    <Card
      bordered={false}
      bodyStyle={{ padding: 20 }}
      style={{ borderRadius: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{title}</Title>
          {description ? <Text type="secondary">{description}</Text> : null}
        </div>

        <Row gutter={[12, 12]}>
          {actions.map((action) => (
            <Col xs={24} sm={12} md={8} lg={6} key={action.key ?? action.label}>
              <Button
                type={getButtonType(action.type || 'default')}
                block
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
};

export default DashboardQuickActions;
