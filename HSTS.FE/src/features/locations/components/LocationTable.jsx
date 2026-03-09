import React from 'react';
import { Table, Button, Space, Popconfirm, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EnvironmentOutlined, EyeOutlined, PhoneOutlined, MailOutlined, LinkOutlined } from '@ant-design/icons';
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
          {record.socialLinks && record.socialLinks.length > 0 && (
            <div style={{ fontSize: 12, color: '#1677ff', marginTop: 4 }}>
              <LinkOutlined style={{ marginRight: 4 }} />
              {record.socialLinks.length} link(s)
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
      width: 120,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.telephone && (
            <div><PhoneOutlined style={{ marginRight: 4 }} />{record.telephone}</div>
          )}
          {record.email && (
            <div style={{ fontSize: 11, color: '#666' }}><MailOutlined style={{ marginRight: 4 }} />{record.email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      width: 120,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          {record.ticketPrice > 0 && <div style={{ fontWeight: 500 }}>${record.ticketPrice.toFixed(2)}</div>}
          {record.priceRange && <Tag color="blue">{record.priceRange}</Tag>}
          {(record.priceMinUsd || record.priceMaxUsd) && (
            <div style={{ fontSize: 11, color: '#666' }}>
              ${record.priceMinUsd?.toFixed(2) || '0'} - ${record.priceMaxUsd?.toFixed(2) || '0'}
            </div>
          )}
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
      title: 'Duration',
      dataIndex: 'recommendedDurationMinutes',
      key: 'recommendedDurationMinutes',
      width: 90,
      render: (value) => value ? `${value} min` : '-',
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
      scroll={{ x: 1200 }}
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
