import React from 'react';
import { Table, Tag, Space, Button, Popconfirm } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { SubmissionStatus } from '../types';
import styles from '../styles/SubmissionTable.module.css';

const statusColors = {
  [SubmissionStatus.Pending]: '#FFE66D',
  [SubmissionStatus.Approved]: '#4ECDC4',
  [SubmissionStatus.Rejected]: '#FF6B6B',
  [SubmissionStatus.Published]: '#1A535C'
};

const statusLabels = {
  [SubmissionStatus.Pending]: 'Pending',
  [SubmissionStatus.Approved]: 'Approved',
  [SubmissionStatus.Rejected]: 'Rejected',
  [SubmissionStatus.Published]: 'Published'
};

const SubmissionTable = ({ data, loading, pagination, onTableChange, onEdit, onView, onDelete }) => {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      className: styles.tableCell
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      className: styles.tableCell
    },
    {
      title: 'Location Type',
      dataIndex: 'locationTypeName',
      key: 'locationTypeName',
      className: styles.tableCell
    },
    {
      title: 'Destination',
      dataIndex: 'destinationName',
      key: 'destinationName',
      className: styles.tableCell
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          color={statusColors[status]} 
          style={{ 
            color: status === SubmissionStatus.Pending ? '#1A535C' : '#FFFFFF',
            fontWeight: 700 
          }}
          className={styles.bouncyTag}
        >
          {statusLabels[status]}
        </Tag>
      )
    },
    {
      title: 'Submitted At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      className: styles.tableCell
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ alignItems: 'flex-start' }}>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
            className={styles.actionBtn}
            style={{ padding: 0 }}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            disabled={
              record.status === SubmissionStatus.Pending ||
              record.status === SubmissionStatus.Approved ||
              record.status === SubmissionStatus.Published
            }
            className={styles.actionBtn}
            style={{ padding: 0 }}
          >
            Edit
          </Button>
          {record.status === SubmissionStatus.Pending && (
            <Popconfirm
              title="Delete Submission"
              description="Are you sure you want to delete this submission?"
              onConfirm={() => onDelete(record)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                type="link" 
                className={styles.dangerActionBtn} 
                icon={<DeleteOutlined />}
                style={{ padding: 0 }}
              >
                Delete
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        onChange={onTableChange}
        rowKey="id"
        className={styles.tropicalTableGlobal}
      />
      {pagination && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px' }}>
          <AppPagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(page, pageSize) => {
              if (onTableChange) {
                onTableChange({ ...pagination, current: page, pageSize });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SubmissionTable;