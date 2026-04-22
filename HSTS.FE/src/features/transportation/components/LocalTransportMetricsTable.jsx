import React from 'react';
import { Table, Button, Space, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import styles from '../styles/LocalTransportMetricsTable.module.css';

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
      title: 'Base Fare (VND)',
      dataIndex: 'baseFare',
      key: 'baseFare',
      width: 130,
      align: 'right',
      render: (val) => val !== null && val !== undefined ? `${val.toLocaleString()} ₫` : '-',
    },
    {
      title: 'Base Dist (km)',
      dataIndex: 'baseDistance',
      key: 'baseDistance',
      width: 130,
      align: 'right',
      render: (val) => val?.toLocaleString() ?? '-',
    },
    {
      title: 'Price/Km (VND)',
      dataIndex: 'pricePerKm',
      key: 'pricePerKm',
      width: 130,
      align: 'right',
      render: (val) => val !== null && val !== undefined ? `${val.toLocaleString()} ₫` : '-',
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
        <Space size="middle" className={styles.actionSpace}>
          <Tooltip title="View">
            <Button type="text" className={styles.actionIconView} icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" className={styles.actionIconEdit} icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete Metrics"
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
        rowKey="transportationId"
        scroll={{ x: 'max-content' }}
        pagination={false}
      />
    </div>
  );
};

export default LocalTransportMetricsTable;