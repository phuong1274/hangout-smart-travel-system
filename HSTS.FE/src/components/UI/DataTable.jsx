import React from 'react';
import { Table, Empty } from 'antd';
import { PAGINATION } from '@/config/constants';

const DataTable = ({ 
  columns, 
  data, 
  loading, 
  pagination, 
  onTableChange, 
  rowKey = 'id',
  ...props 
}) => {
  const { 
    current = PAGINATION.DEFAULT_PAGE, 
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE, 
    total = 0 
  } = pagination || {};

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey={rowKey}
      pagination={{
        current,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        showTotal: (total) => `Total ${total} items`,
      }}
      onChange={onTableChange}
      locale={{
        emptyText: <Empty description="No data found" />,
      }}
      {...props}
    />
  );
};

export default DataTable;
