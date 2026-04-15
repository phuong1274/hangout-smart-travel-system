import React from 'react';
import { Button, Card, Empty, Table } from 'antd';

const QueuePreviewTable = ({ title, items, columns, onViewAll, emptyText }) => {
  return (
    <Card
      title={title}
      extra={<Button type="link" onClick={onViewAll}>View all</Button>}
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
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      )}
    </Card>
  );
};

export default QueuePreviewTable;
