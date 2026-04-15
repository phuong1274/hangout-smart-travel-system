import React from 'react';
import { Table, Button, Space, Popconfirm, Tooltip, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import styles from '../styles/TransitHubTable.module.css';

const TransitHubTable = ({ data, loading, onEdit, onView, onDelete }) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text) => <Tag className={styles.codeTag}>{text}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'District',
      dataIndex: 'districtName',
      key: 'districtName',
      width: 150,
    },
    {
      title: 'Transport Mode',
      dataIndex: 'transportModeName',
      key: 'transportModeName',
      width: 150,
    },
    {
      title: 'Hub Type',
      dataIndex: 'transitHubTypeName',
      key: 'transitHubTypeName',
      width: 130,
    },
    {
      title: 'Lat / Lng',
      key: 'coordinates',
      width: 200,
      render: (_, record) => (
        <span className={styles.coordText}>
          {record.latitude?.toFixed(6)}, {record.longitude?.toFixed(6)}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle" className={styles.actionSpace}>
          <Tooltip title="View">
            <Button type="text" className={styles.actionIconView} icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" className={styles.actionIconEdit} icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete Transit Hub"
            description="Are you sure?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ className: styles.popConfirmOk }}
            cancelButtonProps={{ className: styles.popConfirmCancel }}
          >
            <Tooltip title="Delete">
              <Button type="text" className={styles.actionIconDelete} icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
      />
    </div>
  );
};

export default TransitHubTable;