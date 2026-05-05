import React from 'react';
import { Card, Space, Typography } from 'antd';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import { MyReviewFilters } from '../components/MyReviewFilters';
import { MyReviewTable } from '../components/MyReviewTable';
import { useMyReviews } from '../hooks/useMyReviews';
import styles from '../styles/MyReviewsPage.module.css';

const { Title, Text } = Typography;

const MyReviewsPage = () => {
  const {
    items,
    loading,
    pagination,
    filterState,
    handleTableChange,
    handleSearch,
    handleRatingFilterChange,
    handleStatusFilterChange,
  } = useMyReviews();

  return (
    <div className={styles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={1} className={styles.headingMain}>My Reviews</Title>
          <Text type="secondary">Track the places you reviewed.</Text>
        </div>

        <Card className={styles.cardWrapper}>
          <div className={styles.filterToolbar}>
            <div className={styles.leftActions}>
              <div className={styles.searchSection}>
                <SearchFilter
                  onSearch={handleSearch}
                  loading={loading}
                  placeholder="Search by location or comment"
                />
              </div>
              <MyReviewFilters
                filterState={filterState}
                onRatingChange={handleRatingFilterChange}
                onStatusChange={handleStatusFilterChange}
              />
            </div>
          </div>

          <MyReviewTable
            items={items}
            loading={loading}
            pagination={pagination}
            onTableChange={handleTableChange}
          />
        </Card>
      </Space>
    </div>
  );
};

export default MyReviewsPage;
