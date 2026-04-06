import React from 'react';
import { Table, Button, Space, Popconfirm, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EnvironmentOutlined, EyeOutlined, PhoneOutlined, MailOutlined, LinkOutlined } from '@ant-design/icons';
import { PAGINATION } from '@/config/constants';

// LocationStatus enum values (matching backend)
const LocationStatus = {
  Active: 1,
  TemporarilyClosed: 2,
  Inactive: 3,
};

const LocationTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView, onCloseLocation, onOpenLocation, onViewClosureHistory }) => {
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
      width: 220,
      render: (text, record) => (
        <div className={styles.nameCell}>
          <strong className={styles.mainText}>{text}</strong>
          {record.destinationName && (
            <div className={styles.subText}>
              <EnvironmentOutlined className={styles.iconBlue} />
              {record.destinationName}
            </div>
          )}
          {record.socialLinks && record.socialLinks.length > 0 && (
            <div className={styles.linkText}>
              <LinkOutlined className={styles.iconBlue} />
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
      width: 120,
      render: (text) => text ? <Tag className={styles.customTag} color="blue">{text}</Tag> : '-',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div className={styles.contactCell}>
          {record.telephone && (
            <div className={styles.mainText}><PhoneOutlined className={styles.iconTeal} /> {record.telephone}</div>
          )}
          {record.email && (
            <div className={styles.subText}><MailOutlined className={styles.iconCoral} /> {record.email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      width: 130,
      render: (_, record) => (
        <div className={styles.priceCell}>
          {record.ticketPrice > 0 && <div className={styles.priceMain}>${record.ticketPrice.toFixed(2)}</div>}
          {record.priceRange && <Tag className={styles.customTag} color="green">{record.priceRange}</Tag>}
          {(record.priceMinUsd || record.priceMaxUsd) && (
            <div className={styles.subText}>
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
        <div className={styles.subText}>
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

  const handlePaginationChange = (page, pageSize) => {
    if (onTableChange) {
      onTableChange({ current: page, pageSize }, {}, {});
    }
  };

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
        scroll={{ x: 1200 }}
        pagination={false}
      />
      <div className={styles.paginationWrapper}>
        <AppPagination
          current={pagination?.current}
          pageSize={pagination?.pageSize}
          total={pagination?.total}
          onChange={handlePaginationChange}
        />
      </div>
    </div>
  );
};

export default LocationTable;