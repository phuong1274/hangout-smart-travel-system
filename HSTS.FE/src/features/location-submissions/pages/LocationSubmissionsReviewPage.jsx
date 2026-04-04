import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal, Table, Tag, Input, Select, Row, Col } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, HomeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissionsApi, reviewSubmissionApi } from '../api';
import { SubmissionStatus } from '../types';
import BeforeAfterComparison from '../components/BeforeAfterComparison';

const { Title } = Typography;
const { Header, Content } = Layout;
const { TextArea } = Input;
const { Option } = Select;

const LocationSubmissionsReviewPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    status: undefined,
    searchTerm: ''
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['location-submissions', filters],
    queryFn: () => getAllSubmissionsApi({
      pageIndex: 1,
      pageSize: 100,
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
  };

  const handleSearch = (value) => {
    setFilters({ ...filters, searchTerm: value });
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
        <Tag color={record.submissionType === 0 ? 'blue' : 'purple'}>
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
          [SubmissionStatus.Pending]: { color: 'warning', text: 'Pending' },
          [SubmissionStatus.Approved]: { color: 'success', text: 'Approved' },
          [SubmissionStatus.Rejected]: { color: 'error', text: 'Rejected' },
          [SubmissionStatus.Published]: { color: 'blue', text: 'Published' }
        };
        const config = statusConfig[status] || { color: 'default', text: 'Unknown' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: 'Pending', value: SubmissionStatus.Pending },
        { text: 'Approved', value: SubmissionStatus.Approved },
        { text: 'Rejected', value: SubmissionStatus.Rejected },
        { text: 'Published', value: SubmissionStatus.Published }
      ],
      onFilter: (value, record) => record.status === value
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
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            View
          </Button>
          {record.status === SubmissionStatus.Pending && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => {
                  setViewingSubmission(record);
                  handleReview('approve');
                }}
              >
                Approve
              </Button>
              <Button
                type="link"
                icon={<CloseOutlined />}
                danger
                onClick={() => {
                  setViewingSubmission(record);
                  handleReview('reject');
                }}
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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Location Submissions Review</Title>
        </div>
        <Button onClick={() => window.history.back()}>Back</Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
          <Card>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Input.Search
                  placeholder="Search by name, address, or description"
                  allowClear
                  onSearch={handleSearch}
                  style={{ maxWidth: 400 }}
                />
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Select
                  placeholder="Filter by status"
                  allowClear
                  onChange={handleStatusChange}
                  style={{ width: 200 }}
                >
                  <Option value={SubmissionStatus.Pending}>Pending</Option>
                  <Option value={SubmissionStatus.Approved}>Approved</Option>
                  <Option value={SubmissionStatus.Rejected}>Rejected</Option>
                  <Option value={SubmissionStatus.Published}>Published</Option>
                </Select>
              </Col>
            </Row>
            <Table
              columns={columns}
              dataSource={data?.items || []}
              loading={isLoading}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} submissions`
              }}
            />
          </Card>
        </Space>
      </Content>

      {/* Detail Modal with Before/After Comparison */}
      <Modal
        title={
          viewingSubmission?.submissionType === 1 
            ? "Review Suggested Edit (🔴 Red = Old, 🟢 Green = New)" 
            : "Review New Location Submission"
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
                danger
                icon={<CloseOutlined />}
              >
                Reject
              </Button>
              <Button
                onClick={() => handleReview('approve')}
                type="primary"
                icon={<CheckOutlined />}
              >
                Approve
              </Button>
            </Space>
          ) : null
        }
        width={1400}
      >
        {viewingSubmission && (
          <BeforeAfterComparison submission={viewingSubmission} />
        )}
      </Modal>

      {/* Review Confirmation Modal */}
      <Modal
        title={reviewAction === 'approve' ? 'Approve Submission' : 'Reject Submission'}
        open={reviewModalOpen}
        onCancel={() => {
          setReviewModalOpen(false);
          setRejectionReason('');
        }}
        onOk={handleConfirmReview}
        confirmLoading={reviewMutation.isPending}
        okText={reviewAction === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{
          danger: reviewAction === 'reject',
          type: reviewAction === 'approve' ? 'primary' : 'default'
        }}
      >
        {reviewAction === 'approve' ? (
          <div>
            <p>Are you sure you want to <strong>approve</strong> this submission?</p>
            {viewingSubmission?.submissionType === 0 ? (
              <p style={{ color: '#52c41a' }}>
                <CheckOutlined /> This will <strong>create a new location</strong> in the system.
              </p>
            ) : (
              <p style={{ color: '#1890ff' }}>
                <EyeOutlined /> This will <strong>update the existing location</strong> with the proposed changes.
              </p>
            )}
            <p><strong>Submission:</strong> {viewingSubmission?.name}</p>
          </div>
        ) : (
          <div>
            <p>Please provide a reason for rejection:</p>
            <TextArea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Missing required information, Invalid location data, Inappropriate content, etc."
              autoFocus
            />
            <p style={{ color: '#ff4d4f', marginTop: 8 }}>
              <CloseOutlined /> The user will be able to edit and resubmit after seeing this reason.
            </p>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default LocationSubmissionsReviewPage;
