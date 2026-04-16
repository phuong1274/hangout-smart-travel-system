import React from 'react';
import { Table, Empty } from 'antd';
import { PAGINATION } from '@/config/constants';
import AppPagination from '@/components/UI/AppPagination/AppPagination';

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

  const handlePaginationChange = (page, size) => {
    if (onTableChange) {
      onTableChange({ current: page, pageSize: size }, {}, {});
    }
  };

  return (
    <div className="custom-datatable-wrapper">
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={rowKey}
        pagination={false}
        onChange={onTableChange}
        locale={{
          emptyText: <Empty description="No data found" />,
        }}
        {...props}
      />

      {pagination !== false && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <AppPagination
            current={current}
            pageSize={pageSize}
            total={total}
            onChange={handlePaginationChange}
          />
        </div>
      )}
    </div>
  );
};

export default DataTable;