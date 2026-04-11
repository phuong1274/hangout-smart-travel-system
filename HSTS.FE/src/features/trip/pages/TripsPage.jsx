import React from 'react';
import { Card, Typography, Space, Button, Table, Tag, Popconfirm, ConfigProvider, message } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { PATHS } from '@/routes/paths';

const { Title } = Typography;

const statusColors = {
  Planned: 'blue',
  InProgress: 'green',
  Completed: 'default',
  Cancelled: 'red',
};

const TripsPage = () => {
  const navigate = useNavigate();
  const { data: trips, loading, handleDelete } = useTrips();

  const columns = [
    {
      title: 'Trip Name',
      dataIndex: 'tripName',
      key: 'tripName',
      ellipsis: true,
      sorter: (a, b) => a.tripName.localeCompare(b.tripName),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.startDate) - new Date(b.startDate),
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.endDate) - new Date(b.endDate),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {status || 'Planned'}
        </Tag>
      ),
      filters: Object.keys(statusColors).map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => (record.status || 'Planned') === value,
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
            onClick={() => navigate(PATHS.TRIP_DETAIL.replace(':id', record.id))}
          >
            View
          </Button>
          <Popconfirm
            title="Delete Trip"
            description="Are you sure you want to delete this trip? This action cannot be undone."
            onConfirm={async () => {
              await handleDelete(record.id);
            }}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FF6B6B',
          borderRadius: 16,
          colorText: '#1A535C',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>My Trips</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(PATHS.CREATE_TRIP)}
            >
              Create Trip
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={trips}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} trips`,
            }}
          />
        </Space>
      </Card>
    </ConfigProvider>
  );
};

export default TripsPage;
