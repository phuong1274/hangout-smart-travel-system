import React from 'react';
import { Table, Button, Space, Popconfirm, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EnvironmentOutlined, EyeOutlined, PhoneOutlined, MailOutlined, StarOutlined } from '@ant-design/icons';
import { PAGINATION } from '@/config/constants';

const LocationTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView }) => {
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
      width: 180,
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.destinationName && (
            <div style={{ fontSize: 12, color: '#888' }}>
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {record.destinationName}
            </div>
          )}
          {record.rating && (
            <div style={{ fontSize: 12, color: '#faad14' }}>
              <StarOutlined /> {record.rating.toFixed(1)} ({record.reviewCount || 0})
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'locationTypeName',
      key: 'locationTypeName',
      width: 100,
      render: (text) => text || 'N/A',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.telephone && (
            <div><PhoneOutlined style={{ marginRight: 4 }} />{record.telephone}</div>
          )}
          {record.email && (
            <div><MailOutlined style={{ marginRight: 4 }} />{record.email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      width: 100,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.ticketPrice > 0 && <div>${record.ticketPrice.toFixed(2)}</div>}
          {record.priceRange && <div><Tag color="blue">{record.priceRange}</Tag></div>}
        </div>
      ),
    },
    {
      title: 'Coordinates',
      key: 'coordinates',
      width: 130,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>Lat: {record.latitude?.toFixed(4)}</div>
          <div>Lng: {record.longitude?.toFixed(4)}</div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
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
            title="Delete Location"
            description="Are you sure you want to delete this location?"
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
      scroll={{ x: 1000 }}
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

export default LocationTable;
