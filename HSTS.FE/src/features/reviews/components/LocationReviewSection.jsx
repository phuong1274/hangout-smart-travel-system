import React, { useMemo, useState } from 'react';
import { Card, Typography, Divider, Empty } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { ROLES } from '@/config/constants';
import { useLocationReviews } from '../hooks/useLocationReviews';
import { useMyLocationReview } from '../hooks/useMyLocationReview';
import { useReviewActions } from '../hooks/useReviewActions';
import { useReviewEligibility } from '../hooks/useReviewEligibility';
import { ReviewList } from './ReviewList';
import { ReviewForm } from './ReviewForm';
import { ReportReviewModal } from './ReportReviewModal';

const { Title, Text } = Typography;

export const LocationReviewSection = ({ locationId }) => {
  const { user, isAuthenticated } = useAuthStore();
  const isTraveler = !!user?.roles?.includes(ROLES.TRAVELER);
  const currentUserId = user?.id;

  const { items, totalCount, loading, pageIndex, pageSize, setPageIndex, refresh } = useLocationReviews(locationId);
  const { myReview, refresh: refreshMine } = useMyLocationReview(locationId, isAuthenticated);
  const { canReview } = useReviewEligibility(locationId, isTraveler);

  const [editing, setEditing] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const onChanged = () => {
    refresh();
    refreshMine();
    setEditing(false);
    setReportTarget(null);
  };

  const { submitting, create, update, remove, report } = useReviewActions({ onChanged });

  const handleSubmit = async (values) => {
    if (myReview) {
      await update({ reviewId: myReview.id, ...values });
      return;
    }

    await create({ locationId, ...values });
  };

  const publicItems = useMemo(
    () => items.filter((review) => !myReview || review.id !== myReview.id),
    [items, myReview],
  );

  return (
    <Card>
      <Title level={4}>Reviews</Title>
      <Text type="secondary">
        Read community feedback, write your own review, or report inappropriate feedback here. You can report other users' reviews from each review card.
      </Text>

      {isTraveler ? (
        myReview && !editing ? (
          <ReviewList
            items={[myReview]}
            loading={false}
            pageIndex={1}
            pageSize={1}
            totalCount={1}
            onPageChange={() => {}}
            currentUserId={currentUserId}
            onEdit={() => setEditing(true)}
            onDelete={(review) => remove(review.id)}
          />
        ) : canReview ? (
          <ReviewForm
            initialValues={myReview ?? undefined}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        ) : (
          <Empty description="You can only review locations you have visited on a completed trip." />
        )
      ) : (
        !isAuthenticated && <Empty description="Sign in as a traveler to share your experience." />
      )}

      <Divider />

      <ReviewList
        items={publicItems}
        loading={loading}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPageIndex}
        currentUserId={currentUserId}
        onEdit={() => {}}
        onDelete={() => {}}
        onReport={(review) => setReportTarget(review)}
      />

      <ReportReviewModal
        open={!!reportTarget}
        review={reportTarget || {}}
        submitting={submitting}
        onCancel={() => setReportTarget(null)}
        onSubmit={(payload) => report(payload)}
      />
    </Card>
  );
};
