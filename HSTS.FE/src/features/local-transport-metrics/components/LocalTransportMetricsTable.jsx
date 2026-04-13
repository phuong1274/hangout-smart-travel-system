import React from 'react';
import { Table, Button, Space, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

const LocalTransportMetricsTable = ({ data, loading, onEdit, onView, onDelete }) => {
  const columns = [
    {
      title: 'Transport Mode',
      dataIndex: 'transportModeName',
      key: 'transportModeName',
      width: 200,
      render: (text) => <strong>{text || '-'}</strong>,
    },
    {
      title: 'Cost per Km',
      dataIndex: 'costPerKm',
      key: 'costPerKm',
      width: 130,
      align: 'right',
      render: (val) => val?.toLocaleString() ?? '-',
    },
    {
      title: 'Speed (km/h)',
      dataIndex: 'speedKmh',
      key: 'speedKmh',
      width: 130,
      align: 'right',
      render: (val) => val?.toLocaleString() ?? '-',
    },
    {
      title: 'Max Distance (km)',
      dataIndex: 'maxRecommendedDistance',
      key: 'maxRecommendedDistance',
      width: 160,
      align: 'right',
      render: (val) => val?.toLocaleString() ?? 'Unlimited',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View">
            <Button type="link" icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete Metrics"
            description="Are you sure?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button type="link" danger icon={<DeleteOutlined />} />
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
      rowKey="transportationId"
      scroll={{ x: 'max-content' }}
      pagination={false}
    />
  );
};

export default LocalTransportMetricsTable;
