import React from 'react';
import { Avatar, Rate, Space, Typography, Button, Popconfirm } from 'antd';
import { UserOutlined, FlagOutlined } from '@ant-design/icons';
import { formatDate } from '@/utils/date';
import styles from '../styles/ReviewCard.module.css';

const { Text, Paragraph } = Typography;

export const ReviewCard = ({ review, isOwner, onEdit, onDelete, onReport }) => (
  <div className={styles.card}>
    <div className={styles.header}>
      <Space>
        <Avatar src={review.authorAvatarUrl} icon={<UserOutlined />} />
        <div>
          <Text strong>{review.authorDisplayName || 'Anonymous Traveler'}</Text>
          <div>
            <Rate disabled value={review.rating} />
          </div>
        </div>
      </Space>
      <Text type="secondary">{formatDate(review.createdAt)}</Text>
    </div>
    <Paragraph>{review.comment}</Paragraph>
    <div className={styles.actions}>
      {isOwner ? (
        <Space>
          <Button size="small" onClick={() => onEdit?.(review)}>Edit</Button>
          <Popconfirm title="Delete this review?" onConfirm={() => onDelete?.(review)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ) : (
        <Button size="small" icon={<FlagOutlined />} onClick={() => onReport?.(review)}>
          Report
        </Button>
      )}
    </div>
  </div>
);
