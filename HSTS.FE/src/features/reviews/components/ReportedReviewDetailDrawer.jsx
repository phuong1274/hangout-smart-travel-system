import React, { useState } from 'react';
import { Drawer, Descriptions, Tag, List, Space, Button, Popconfirm, Input } from 'antd';
import {
  REVIEW_STATUS,
  getReviewReportReasonLabel,
  getReviewReportStatusColor,
  getReviewReportStatusLabel,
  getReviewStatusColor,
  getReviewStatusLabel,
} from '../constants';

export const ReportedReviewDetailDrawer = ({
  open,
  item,
  submitting,
  onClose,
  onIgnore,
  onHide,
  onUnhide,
  onDelete,
}) => {
  const [note, setNote] = useState('');

  if (!item) return null;

  const { review, locationName, authorEmail, reports } = item;
  const isHidden = review.status === REVIEW_STATUS.HIDDEN || review.status === 'Hidden';

  return (
    <Drawer open={open} onClose={onClose} width={520} title={`Review #${review.id}`} afterOpenChange={(isOpen) => { if (isOpen) setNote(''); }}>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Location">{locationName}</Descriptions.Item>
        <Descriptions.Item label="Author">{authorEmail}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={getReviewStatusColor(review.status)}>{getReviewStatusLabel(review.status)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Rating">{review.rating}</Descriptions.Item>
        <Descriptions.Item label="Comment">{review.comment}</Descriptions.Item>
        <Descriptions.Item label="Report count">{review.reportCount}</Descriptions.Item>
      </Descriptions>

      <List
        header={<strong>Reports</strong>}
        dataSource={reports}
        renderItem={(report) => (
          <List.Item>
            <List.Item.Meta
              title={(
                <Space size="small">
                  <span>{getReviewReportReasonLabel(report.reason)}</span>
                  <Tag color={getReviewReportStatusColor(report.status)}>
                    {getReviewReportStatusLabel(report.status)}
                  </Tag>
                </Space>
              )}
              description={report.description || '—'}
            />
          </List.Item>
        )}
      />

      <Input.TextArea
        rows={2}
        placeholder="Resolution note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        style={{ marginTop: 12 }}
      />

      <Space style={{ marginTop: 16 }}>
        <Button loading={submitting} onClick={() => onIgnore(review.id, note)}>Ignore reports</Button>
        <Button loading={submitting} onClick={() => (isHidden ? onUnhide(review.id) : onHide(review.id))}>
          {isHidden ? 'Unhide review' : 'Hide review'}
        </Button>
        <Popconfirm title="Delete this review?" onConfirm={() => onDelete(review.id, note)}>
          <Button danger loading={submitting}>Delete review</Button>
        </Popconfirm>
      </Space>
    </Drawer>
  );
};
