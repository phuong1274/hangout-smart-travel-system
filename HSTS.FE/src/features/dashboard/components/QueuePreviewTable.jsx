import React from 'react';
import { Button, Card, Empty, Table, Typography } from 'antd';

const { Text } = Typography;

const QueuePreviewTable = ({ title, items, columns, onViewAll, emptyText }) => {
  return (
    <Card
      bordered={false}
      title={title}
      extra={<Button type="link" onClick={onViewAll}>View all</Button>}
      bodyStyle={{ paddingTop: 12 }}
      style={{ borderRadius: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}
    >
      {Array.isArray(items) && items.length > 0 ? (
        <Table
          rowKey={(record) => record.id ?? record.reviewId}
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text type="secondary">{emptyText}</Text>}
        />
      )}
    </Card>
  );
};

export default QueuePreviewTable;
