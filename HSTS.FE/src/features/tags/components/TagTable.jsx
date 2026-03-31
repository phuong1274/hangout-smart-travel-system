import React from 'react';
import { Table, Button, Space, Popconfirm, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, ApartmentOutlined } from '@ant-design/icons';
import { PAGINATION } from '@/config/constants';

const TagTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView }) => {
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
      render: (name, record) => (
        <span style={{ paddingLeft: record.level > 1 ? 20 : 0 }}>
          {record.level > 1 && <span style={{ color: '#1677ff', marginRight: 4 }}>└</span>}
          {name}
        </span>
      ),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level) => (
        <Tag color={level === 1 ? 'green' : 'blue'}>
          <ApartmentOutlined /> Level {level}
        </Tag>
      ),
    },
    {
      title: 'Parent Tag',
      dataIndex: 'parentTagName',
      key: 'parentTagName',
      width: 150,
      render: (parentTagName, record) => (
        record.level > 1 ? (
          parentTagName || 'N/A'
        ) : (
          <span style={{ color: '#999' }}>—</span>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Tag"
            description="Are you sure you want to delete this tag?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
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
      pagination={{
        current: pagination?.current || PAGINATION.DEFAULT_PAGE,
        pageSize: pagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE,
        total: pagination?.total || 0,
        showSizeChanger: true,
        pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
        showTotal: (totalItems) => `Total ${totalItems} items`,
      }}
      onChange={onTableChange}
    />
  );
};

export default TagTable;
