import React from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { PAGINATION } from '@/config/constants';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import styles from '../styles/LocationTypeTable.module.css';

const LocationTypeTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView }) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id) => <span className={styles.idText}>#{id}</span>
    },
    {
      title: 'NAME',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className={styles.nameText}>{text}</span>
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
            className={styles.viewBtn}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            className={styles.editBtn}
          />
          <Popconfirm
            title="Delete Location Type"
            description="Are you sure you want to delete this location type?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
            overlayClassName={styles.popconfirmOverlay}
          >
            <Button type="text" danger icon={<DeleteOutlined />} className={styles.deleteBtn} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handlePageChange = (page, pageSize) => {
    onTableChange({ current: page, pageSize });
  };

  return (
    <div className={styles.tableWrapper}>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        className={styles.customTable}
        pagination={false}
        onChange={onTableChange}
      />
      
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <AppPagination
          current={pagination?.current || PAGINATION.DEFAULT_PAGE}
          pageSize={pagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE}
          total={pagination?.total || 0}
          onChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default LocationTypeTable;