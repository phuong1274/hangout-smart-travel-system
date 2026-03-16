import React from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { PAGINATION } from '@/config/constants';

const DestinationTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView }) => {
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
    },
    {
      title: 'English Name',
      dataIndex: 'englishName',
      key: 'englishName',
      width: 150,
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type) => type ?? '-',
    },
    {
      title: 'State',
      dataIndex: 'stateName',
      key: 'stateName',
      width: 150,
      render: (stateName) => stateName ?? '-',
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
            title="Delete Destination"
            description="Are you sure you want to delete this destination?"
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

export default DestinationTable;
