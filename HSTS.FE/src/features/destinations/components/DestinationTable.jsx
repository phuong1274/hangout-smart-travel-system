import React from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import styles from '../styles/DestinationTable.module.css';

const DistrictTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView }) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '50%',
    },
    {
      title: 'Province',
      dataIndex: 'provinceName',
      key: 'provinceName',
      width: '35%',
      render: (provinceName) => provinceName ?? '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle" className={styles.actionSpace}>
          <Button
            type="text"
            className={styles.actionIconView}
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          />
          <Button
            type="text"
            className={styles.actionIconEdit}
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="Delete District"
            description="Are you sure you want to delete this district?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ className: styles.popConfirmOk }}
            cancelButtonProps={{ className: styles.popConfirmCancel }}
          >
            <Button type="text" className={styles.actionIconDelete} icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTableChange = (tablePagination, filters, sorter) => {
    if (onTableChange) {
      onTableChange(
        { current: pagination?.current, pageSize: pagination?.pageSize },
        filters,
        sorter
      );
    }
  };

  const handlePaginationChange = (page, pageSize) => {
    if (onTableChange) {
      onTableChange({ current: page, pageSize }, {}, {});
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <Table
        className={styles.tropicalTable}
        columns={columns}
        dataSource={data}
        loading={{
          spinning: loading,
          indicator: <div className={styles.skeletonLoader}></div>
        }}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        pagination={false}
        onChange={handleTableChange}
      />
      
      <div className={styles.paginationWrapper}>
        <AppPagination
          current={pagination?.current}
          pageSize={pagination?.pageSize}
          total={pagination?.total}
          onChange={handlePaginationChange}
        />
      </div>
    </div>
  );
};

export default DistrictTable;