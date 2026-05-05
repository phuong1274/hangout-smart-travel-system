import React from 'react';
import { Button, Rate, Space, Tag, Tooltip, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import DataTable from '@/components/UI/DataTable';
import { PATHS } from '@/routes/paths';
import { formatDate } from '@/utils/date';
import { getReviewStatusColor, getReviewStatusLabel } from '../constants';
import styles from '../styles/MyReviewsPage.module.css';

const { Text } = Typography;

const getLocationMeta = (row) =>
  [row.locationTypeName, row.districtName, row.locationAddress].filter(Boolean).join(' · ');

const truncateComment = (comment) => {
  if (!comment) return '-';
  return comment.length > 120 ? `${comment.slice(0, 120)}...` : comment;
};

export const MyReviewTable = ({ items, loading, pagination, onTableChange }) => {
  const navigate = useNavigate();

  const columns = [
    {
      title: 'Location',
      key: 'location',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.locationName || '-'}</Text>
          <Text type="secondary">{getLocationMeta(row) || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => <Rate disabled value={rating || 0} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getReviewStatusColor(status)}>{getReviewStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (comment) => (
        <Text className={styles.commentText}>{truncateComment(comment)}</Text>
      ),
    },
    {
      title: 'Reviewed',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date, row) => formatDate(date || row.createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, row) => (
        <Tooltip title="View location">
          <Button
            type="text"
            className={styles.actionIconBtn}
            icon={<EyeOutlined />}
            onClick={() => navigate(PATHS.PUBLIC_LOCATION_DETAIL(row.locationId))}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className={styles.tableContainer}>
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={pagination}
        onTableChange={onTableChange}
        rowKey={(row) => row.reviewId}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};
