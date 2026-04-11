import React, { useState } from 'react';
import { Card, Space, Button, message, Modal, Table, Tag, Input, Select, Descriptions, ConfigProvider } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissionsApi, reviewSubmissionApi } from '../api';
import { SubmissionStatus } from '../types';
import BeforeAfterComparison from '../components/BeforeAfterComparison';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import styles from '../styles/LocationSubmissionsReviewPage.module.css';

const { TextArea } = Input;
const { Option } = Select;

const tropicalTheme = {
  token: {
    colorPrimary: '#FF6B6B',
    colorInfo: '#4ECDC4',
    colorTextBase: '#1A535C',
    colorBgBase: '#F7F9F9',
    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
    borderRadius: 16,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 44,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 20,
      boxShadowTertiary: '0 8px 24px rgba(26, 83, 92, 0.08)',
    },
    Select: {
      controlHeight: 44,
      borderRadius: 9999,
      colorBorder: 'rgba(26, 83, 92, 0.2)',
      colorPrimary: '#4ECDC4',
      colorPrimaryHover: '#4ECDC4',
      controlOutline: 'rgba(78, 205, 196, 0.15)',
      controlOutlineWidth: 3,
      colorTextPlaceholder: 'rgba(26, 83, 92, 0.5)',
      fontSize: 14,
    }
  }
};

const LocationSubmissionsReviewPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [paginationState, setPaginationState] = useState({
    current: 1,
    pageSize: 10
  });

  const [filters, setFilters] = useState({
    status: undefined,
    searchTerm: ''
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['location-submissions', filters, paginationState],
    queryFn: () => getAllSubmissionsApi({
      pageIndex: paginationState.current,
      pageSize: paginationState.pageSize,
      status: filters.status,
      searchTerm: filters.searchTerm
    }),
    select: (data) => ({
      items: data.items || [],
      totalCount: data.totalCount || 0
    })
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }) =>
      reviewSubmissionApi(id, { status, rejectionReason }),
    onSuccess: () => {
      message.success(`Submission ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      queryClient.invalidateQueries(['location-submissions']);
      setDetailModalOpen(false);
      setReviewModalOpen(false);
      setRejectionReason('');
      refetch();
    },
    onError: (error) => {
      message.error(`Failed to ${reviewAction} submission`);
    }
  });

  const handleView = (record) => {
    setViewingSubmission(record);
    setDetailModalOpen(true);
  };

  const handleReview = (action) => {
    setReviewAction(action);
    setReviewModalOpen(true);
  };

  const handleConfirmReview = () => {
    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      message.error('Please provide a rejection reason');
      return;
    }

    reviewMutation.mutate({
      id: viewingSubmission.id,
      status: reviewAction === 'approve' ? SubmissionStatus.Approved : SubmissionStatus.Rejected,
      rejectionReason: reviewAction === 'reject' ? rejectionReason : null
    });
  };

  const handleStatusChange = (value) => {
    setFilters({ ...filters, status: value });
    setPaginationState({ ...paginationState, current: 1 });
  };

  const handleSearch = (value) => {
    setFilters({ ...filters, searchTerm: value });
    setPaginationState({ ...paginationState, current: 1 });
  };

  const handlePaginationChange = (page, pageSize) => {
    setPaginationState({ current: page, pageSize });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (_, record) => (
        <Tag color={record.submissionType === 0 ? '#4ECDC4' : '#FF6B6B'} className={styles.bouncyTag}>
          {record.submissionType === 0 ? 'New' : 'Edit'}
        </Tag>
      )
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true
    },
    {
      title: 'Submitted By',
      dataIndex: 'userId',
      key: 'userId',
      render: (userId) => `User #${userId}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          [SubmissionStatus.Pending]: { color: '#FFE66D', text: 'Pending', textColor: '#1A535C' },
          [SubmissionStatus.Approved]: { color: '#4ECDC4', text: 'Approved', textColor: '#FFFFFF' },
          [SubmissionStatus.Rejected]: { color: '#FF6B6B', text: 'Rejected', textColor: '#FFFFFF' },
          [SubmissionStatus.Published]: { color: '#1A535C', text: 'Published', textColor: '#FFFFFF' }
        };
        const config = statusConfig[status] || { color: 'default', text: 'Unknown', textColor: '#1A535C' };
        return <Tag color={config.color} style={{ color: config.textColor, fontWeight: 700 }} className={styles.bouncyTag}>{config.text}</Tag>;
      }
    },
    {
      title: 'Submitted At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ alignItems: 'flex-start' }}>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            className={styles.actionBtn}
            style={{ padding: 0 }}
          >
            View
          </Button>
          {record.status === SubmissionStatus.Pending && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                style={{ color: '#4ECDC4', padding: 0 }}
                onClick={() => {
                  setViewingSubmission(record);
                  handleReview('approve');
                }}
                className={styles.actionBtn}
              >
                Approve
              </Button>
              <Button
                type="link"
                icon={<CloseOutlined />}
                style={{ color: '#FF6B6B', padding: 0 }}
                onClick={() => {
                  setViewingSubmission(record);
                  handleReview('reject');
                }}
                className={styles.actionBtn}
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={tropicalTheme}>
      <div className={styles.pageContainer}>
        <div className={styles.content}>
          <Space direction="vertical" size="large" className={styles.mainSpace}>
            <Card className={styles.tropicalCard}>
              <div className={styles.filterRow}>
                <div className={styles.searchWrapper}>
                  <SearchFilter
                    placeholder="Search by name, address, or description"
                    onSearch={handleSearch}
                  />
                </div>
                <Select
                  placeholder="Filter by status"
                  allowClear
                  onChange={handleStatusChange}
                  className={styles.statusSelectPill}
                >
                  <Option value={SubmissionStatus.Pending}>Pending</Option>
                  <Option value={SubmissionStatus.Approved}>Approved</Option>
                  <Option value={SubmissionStatus.Rejected}>Rejected</Option>
                  <Option value={SubmissionStatus.Published}>Published</Option>
                </Select>
              </div>
              <Table
                columns={columns}
                dataSource={data?.items || []}
                loading={isLoading}
                rowKey="id"
                pagination={false}
                className={styles.tropicalTable}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px' }}>
                <AppPagination
                  current={paginationState.current}
                  pageSize={paginationState.pageSize}
                  total={data?.totalCount || 0}
                  onChange={handlePaginationChange}
                />
              </div>
            </Card>
          </Space>
        </div>

        <Modal
          title={
            <span className={styles.modalTitle}>
              {viewingSubmission?.status === SubmissionStatus.Pending
                ? (viewingSubmission?.submissionType === 1
                  ? "Review Suggested Edit"
                  : "Review New Location Submission")
                : `Submission Details - ${SubmissionStatus[viewingSubmission?.status]}`}
            </span>
          }
          open={detailModalOpen}
          onCancel={() => {
            setDetailModalOpen(false);
            setViewingSubmission(null);
          }}
          footer={
            viewingSubmission?.status === SubmissionStatus.Pending ? (
              <Space>
                <Button
                  onClick={() => handleReview('reject')}
                  className={styles.dangerBtn}
                  icon={<CloseOutlined />}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview('approve')}
                  className={styles.ctaButton}
                  icon={<CheckOutlined />}
                >
                  Approve
                </Button>
              </Space>
            ) : null
          }
          width={viewingSubmission?.status === SubmissionStatus.Pending ? 1400 : 900}
          className={styles.tropicalModal}
        >
          {viewingSubmission && (
            viewingSubmission.status === SubmissionStatus.Pending ? (
              <BeforeAfterComparison submission={viewingSubmission} />
            ) : (
              <SubmissionDetail submission={viewingSubmission} />
            )
          )}
        </Modal>

        <Modal
          title={<span className={styles.modalTitle}>{reviewAction === 'approve' ? 'Approve Submission' : 'Reject Submission'}</span>}
          open={reviewModalOpen}
          onCancel={() => {
            setReviewModalOpen(false);
            setRejectionReason('');
          }}
          onOk={handleConfirmReview}
          confirmLoading={reviewMutation.isPending}
          okText={reviewAction === 'approve' ? 'Approve' : 'Reject'}
          okButtonProps={{
            className: reviewAction === 'approve' ? styles.ctaButton : styles.dangerBtn
          }}
          className={styles.tropicalModal}
        >
          {reviewAction === 'approve' ? (
            <div className={styles.modalContentBody}>
              <p className={styles.bodyText}>Are you sure you want to <strong className={styles.highlightText}>approve</strong> this submission?</p>
              {viewingSubmission?.submissionType === 0 ? (
                <p className={styles.successText}>
                  <CheckOutlined /> This will <strong>create a new location</strong> in the system.
                </p>
              ) : (
                <p className={styles.infoText}>
                  <EyeOutlined /> This will <strong>update the existing location</strong> with the proposed changes.
                </p>
              )}
              <p className={styles.bodyText}><strong>Submission:</strong> {viewingSubmission?.name}</p>
            </div>
          ) : (
            <div className={styles.modalContentBody}>
              <p className={styles.bodyText}>Please provide a reason for rejection:</p>
              <TextArea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Missing required information, Invalid location data, Inappropriate content, etc."
                autoFocus
                className={styles.tropicalTextArea}
              />
              <p className={styles.dangerText}>
                <CloseOutlined /> The user will be able to edit and resubmit after seeing this reason.
              </p>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

const SubmissionDetail = ({ submission }) => {
  const statusColors = {
    [SubmissionStatus.Pending]: '#FFE66D',
    [SubmissionStatus.Approved]: '#4ECDC4',
    [SubmissionStatus.Rejected]: '#FF6B6B',
    [SubmissionStatus.Published]: '#1A535C'
  };

  const statusLabels = {
    [SubmissionStatus.Pending]: 'Pending',
    [SubmissionStatus.Approved]: 'Approved',
    [SubmissionStatus.Rejected]: 'Rejected',
    [SubmissionStatus.Published]: 'Published'
  };

  const formatSeasons = (seasons) => {
    if (!seasons || !Array.isArray(seasons) || seasons.length === 0) return 'None';
    const monthLabels = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return seasons.map(s => {
      const desc = s.description || s.Description || 'Season';
      const monthsStr = s.months || s.Months || '';
      const months = typeof monthsStr === 'string' ? monthsStr.split(',').filter(m => m) : [];
      const monthNames = months.map(m => {
        const monthNum = parseInt(m, 10);
        return monthLabels[monthNum] || m;
      }).join(', ');
      return `${desc} (${monthNames || 'N/A'})`;
    }).join('; ');
  };

  const formatOpeningHours = (hours) => {
    if (!hours || !Array.isArray(hours) || hours.length === 0) return 'None';
    return hours.map(oh => {
      const dayName = oh.dayName || oh.DayName || `Day ${oh.dayOfWeek || oh.DayOfWeek}`;
      return `${dayName}: ${oh.openTime || oh.OpenTime || ''} - ${oh.closeTime || oh.CloseTime || ''}`;
    }).join('; ');
  };

  return (
    <div className={styles.fadeUpAnim}>
      <div className={styles.detailSection}>
        <strong className={styles.labelDark}>Status: </strong>
        <Tag color={statusColors[submission.status]} style={{ color: submission.status === SubmissionStatus.Pending ? '#1A535C' : '#FFFFFF', fontWeight: 700 }} className={styles.bouncyTag}>
          {statusLabels[submission.status]}
        </Tag>
      </div>

      <Descriptions title={<span className={styles.subHeading}>Basic Information</span>} bordered column={2} className={styles.tropicalDescriptions}>
        <Descriptions.Item label="Name">{submission.name || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Description">{submission.description || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Address">{submission.address || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Location Type">{submission.locationTypeName || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="District">{submission.districtName || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Coordinates">
          {submission.latitude}, {submission.longitude}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title={<span className={styles.subHeading}>Contact & Pricing</span>} bordered column={2} className={styles.tropicalDescriptions}>
        <Descriptions.Item label="Telephone">{submission.telephone || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Email">{submission.email || 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="Price Range">
          ${submission.priceMinUsd?.toFixed(2) || '0'} - ${submission.priceMaxUsd?.toFixed(2) || '0'}
        </Descriptions.Item>
        <Descriptions.Item label="Score">{submission.score ? `${submission.score} / 5` : 'N/A'}</Descriptions.Item>
      </Descriptions>

      <Descriptions title={<span className={styles.subHeading}>Tags & Amenities</span>} bordered column={2} className={styles.tropicalDescriptions}>
        <Descriptions.Item label="Tags" span={2}>
          {submission.tags && submission.tags.length > 0
            ? submission.tags.map(t => <Tag key={t.id} color="#4ECDC4" className={styles.bouncyTag}>{t.name}</Tag>)
            : 'None'}
        </Descriptions.Item>
        <Descriptions.Item label="Amenities" span={2}>
          {submission.amenities && submission.amenities.length > 0
            ? submission.amenities.map(a => <Tag key={a.id} color="#FF6B6B" className={styles.bouncyTag}>{a.name}</Tag>)
            : 'None'}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title={<span className={styles.subHeading}>Opening Hours & Seasons</span>} bordered column={1} className={styles.tropicalDescriptions}>
        <Descriptions.Item label="Opening Hours">{formatOpeningHours(submission.openingHours)}</Descriptions.Item>
        <Descriptions.Item label="Best Seasons">{formatSeasons(submission.seasons)}</Descriptions.Item>
      </Descriptions>

      <Descriptions title={<span className={styles.subHeading}>Submission Information</span>} bordered column={2} className={styles.tropicalDescriptions}>
        <Descriptions.Item label="Submitted At">
          {new Date(submission.createdAt).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Submission Type">
          {submission.submissionType === 0 ? 'New Location' : 'Edit Existing'}
        </Descriptions.Item>
        {submission.reviewedBy && (
          <>
            <Descriptions.Item label="Reviewed By">{submission.reviewedBy}</Descriptions.Item>
            <Descriptions.Item label="Reviewed At">
              {submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>

      {submission.rejectionReason && (
        <div className={styles.rejectionBox}>
          <strong className={styles.dangerText}>Rejection Reason:</strong>
          <p className={styles.dangerTextMsg}>{submission.rejectionReason}</p>
        </div>
      )}
    </div>
  );
};

export default LocationSubmissionsReviewPage;