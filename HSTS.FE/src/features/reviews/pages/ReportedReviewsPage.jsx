import React, { useState } from 'react';
import { Card, Typography, Space } from 'antd';
import { useReportedReviews } from '../hooks/useReportedReviews';
import { useModerationActions } from '../hooks/useModerationActions';
import { ReportedReviewTable } from '../components/ReportedReviewTable';
import { ReportedReviewDetailDrawer } from '../components/ReportedReviewDetailDrawer';
import styles from '../styles/ReportedReviewsPage.module.css';

const { Title, Text } = Typography;

const ReportedReviewsPage = () => {
  const {
    items,
    totalCount,
    loading,
    pageIndex,
    pageSize,
    handleTableChange,
    refresh,
  } = useReportedReviews();
  const [selected, setSelected] = useState(null);

  const onChanged = () => {
    refresh();
    setSelected(null);
  };

  const { submitting, ignoreReports, hide, remove } = useModerationActions({ onChanged });

  return (
    <div className={styles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>Reported Reviews</Title>
          <Text type="secondary">Moderate community feedback.</Text>
        </div>

        <Card>
          <ReportedReviewTable
            items={items}
            loading={loading}
            pagination={{
              current: pageIndex,
              pageSize,
              total: totalCount,
            }}
            onPageChange={handleTableChange}
            onSelect={setSelected}
          />
        </Card>
      </Space>

      <ReportedReviewDetailDrawer
        open={!!selected}
        item={selected}
        submitting={submitting}
        onClose={() => setSelected(null)}
        onIgnore={ignoreReports}
        onHide={hide}
        onDelete={remove}
      />
    </div>
  );
};

export default ReportedReviewsPage;
