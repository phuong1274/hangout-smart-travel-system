import React from 'react';
import { Table, Button, Space, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import styles from '../styles/AmenityTable.module.css';

const AmenityTable = ({ data, loading, onEdit, onView, onDelete }) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => <strong className={styles.amenityName}>{text}</strong>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
      render: (text) => text || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => onView(record)}
              className={styles.actionBtn}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              className={styles.actionBtn}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Amenity"
            description="Are you sure?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />} 
                className={styles.actionBtn}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      scroll={{ x: 'max-content' }}
      pagination={false}
    />
  );
};

export default AmenityTable;