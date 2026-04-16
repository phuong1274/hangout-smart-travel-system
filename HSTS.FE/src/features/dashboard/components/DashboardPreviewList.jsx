import React from 'react';
import { Button, Card, Empty, List, Skeleton, Typography } from 'antd';

const { Text } = Typography;

const DashboardPreviewList = ({
  title,
  items = [],
  renderItem,
  emptyText = 'Nothing to show',
  onViewAll,
  viewAllLabel = 'View all',
  extra,
  loading = false,
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  const renderFallbackItem = (item) => {
    const label = item?.label || item?.name || 'Unnamed item';

    return (
      <List.Item>
        <Text>{label}</Text>
      </List.Item>
    );
  };

  return (
    <Card
      bordered={false}
      title={title}
      extra={
        extra || (onViewAll ? (
          <Button type="link" onClick={onViewAll}>
            {viewAllLabel}
          </Button>
        ) : null)
      }
      bodyStyle={{ paddingTop: 12 }}
      style={{ borderRadius: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : safeItems.length > 0 ? (
        <List
          dataSource={safeItems}
          renderItem={renderItem || renderFallbackItem}
          split
          itemLayout="horizontal"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>All caught up</div>
              <Text type="secondary">{emptyText}</Text>
            </div>
          }
        />
      )}
    </Card>
  );
};

export default DashboardPreviewList;
