import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal, Table, Tag, Input, Select, Row, Col, Descriptions, Divider } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, HomeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAllSubmissionsApi, reviewSubmissionApi } from '../api';
import { SubmissionStatus } from '../types';

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
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [filters, setFilters] = useState({
    status: undefined,
    searchTerm: ''
  });

  // Fetch submissions
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

  // Review mutation
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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
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

      {/* Detail Modal */}
      <Modal
        title="Submission Details"
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
        width={900}
      >
        {viewingSubmission && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="ID">{viewingSubmission.id}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={
                  viewingSubmission.status === SubmissionStatus.Pending ? 'warning' :
                  viewingSubmission.status === SubmissionStatus.Approved ? 'success' :
                  viewingSubmission.status === SubmissionStatus.Rejected ? 'error' : 'blue'
                }>
                  {SubmissionStatus[viewingSubmission.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Name" span={2}>{viewingSubmission.name}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{viewingSubmission.address}</Descriptions.Item>
              <Descriptions.Item label="Coordinates">{viewingSubmission.latitude}, {viewingSubmission.longitude}</Descriptions.Item>
              <Descriptions.Item label="Price Range">${viewingSubmission.priceMinUsd} - ${viewingSubmission.priceMaxUsd}</Descriptions.Item>
              <Descriptions.Item label="Contact">{viewingSubmission.telephone || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Email">{viewingSubmission.email || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Location Type">{viewingSubmission.locationTypeName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Destination">{viewingSubmission.destinationName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Submitted By">User #{viewingSubmission.userId}</Descriptions.Item>
              <Descriptions.Item label="Submitted At">{new Date(viewingSubmission.createdAt).toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Description</Divider>
            <p style={{ whiteSpace: 'pre-wrap' }}>{viewingSubmission.description || 'N/A'}</p>

            {viewingSubmission.mediaLinks && viewingSubmission.mediaLinks.length > 0 && (
              <>
                <Divider orientation="left">Media Links</Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {viewingSubmission.mediaLinks.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  ))}
                </Space>
              </>
            )}

            {viewingSubmission.socialLinks && viewingSubmission.socialLinks.length > 0 && (
              <>
                <Divider orientation="left">Social Media Links</Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {viewingSubmission.socialLinks.map((social, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                      <strong>{social.platform}:</strong>
                      <a href={social.url} target="_blank" rel="noopener noreferrer">{social.url}</a>
                    </div>
                  ))}
                </Space>
              </>
            )}

            {viewingSubmission.tagIds && viewingSubmission.tagIds.length > 0 && (
              <>
                <Divider orientation="left">Tags</Divider>
                <Space wrap>
                  {viewingSubmission.tagIds.map((tagId) => (
                    <Tag key={tagId}>Tag #{tagId}</Tag>
                  ))}
                </Space>
              </>
            )}

            {viewingSubmission.amenityIds && viewingSubmission.amenityIds.length > 0 && (
              <>
                <Divider orientation="left">Amenities</Divider>
                <Space wrap>
                  {viewingSubmission.amenityIds.map((amenityId) => (
                    <Tag key={amenityId} color="blue">Amenity #{amenityId}</Tag>
                  ))}
                </Space>
              </>
            )}

            {viewingSubmission.rejectionReason && (
              <>
                <Divider orientation="left">Rejection Reason</Divider>
                <div style={{ padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', color: '#cf1322' }}>
                  {viewingSubmission.rejectionReason}
                </div>
              </>
            )}

            {viewingSubmission.createdLocationId && (
              <>
                <Divider orientation="left">Approval Information</Divider>
                <div style={{ padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d' }}>
                  <strong>✓ Location Created</strong>
                  <div style={{ marginTop: '8px' }}>Location ID: {viewingSubmission.createdLocationId}</div>
                  {viewingSubmission.reviewedAt && (
                    <div style={{ marginTop: '8px' }}>Reviewed: {new Date(viewingSubmission.reviewedAt).toLocaleString()}</div>
                  )}
                  {viewingSubmission.reviewedBy && (
                    <div style={{ marginTop: '8px' }}>Reviewed By: Admin #{viewingSubmission.reviewedBy}</div>
                  )}
                </div>
              </>
            )}
          </div>
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
            <p style={{ color: '#52c41a' }}>
              <CheckOutlined /> This will create a new Location in the system.
            </p>
            <p><strong>Submission:</strong> {viewingSubmission?.name}</p>
          </div>
        ) : (
          <div>
            <p>Please provide a reason for rejection:</p>
            <TextArea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Missing required information, Invalid location data, etc."
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
