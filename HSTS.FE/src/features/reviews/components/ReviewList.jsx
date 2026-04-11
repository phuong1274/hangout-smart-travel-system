import React from 'react';
import { Empty, Pagination, Spin } from 'antd';
import { ReviewCard } from './ReviewCard';
import styles from '../styles/ReviewList.module.css';

export const ReviewList = ({
  items,
  loading,
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  currentUserId,
  onEdit,
  onDelete,
  onReport,
}) => {
  if (loading) return <Spin />;
  if (!items?.length) return <Empty description="No reviews yet." />;

  return (
    <div className={styles.list}>
      {items.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwner={currentUserId && review.authorUserId === currentUserId}
          onEdit={onEdit}
          onDelete={onDelete}
          onReport={onReport}
        />
      ))}
      <Pagination
        current={pageIndex}
        pageSize={pageSize}
        total={totalCount}
        onChange={onPageChange}
        showSizeChanger={false}
      />
    </div>
  );
};
