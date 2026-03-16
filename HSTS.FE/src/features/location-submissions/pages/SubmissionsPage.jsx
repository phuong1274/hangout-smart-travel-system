import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { useSubmissions } from '../hooks/useSubmissions';
import SubmissionTable from '../components/SubmissionTable';
import SubmissionForm from '../components/SubmissionForm';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi, reviewSubmissionApi } from '../api';
import { SubmissionStatus } from '../types';

const { Title } = Typography;
const { Header, Content } = Layout;

const SubmissionsPage = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    fetchSubmissions,
  } = useSubmissions();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ status: SubmissionStatus.Approved, rejectionReason: '' });

  const handleCreate = () => {
    setEditingSubmission(null);
    setFormOpen(true);
  };

  const handleEdit = (submission) => {
    setEditingSubmission(submission);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSubmission(null);
  };

  const handleFormSuccess = () => {
    fetchSubmissions();
  };

  const handleView = async (submission) => {
    try {
      const detail = await getSubmissionByIdApi(submission.id);
      setViewingSubmission(detail);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load submission details');
    }
  };

  const handleDelete = async (submission) => {
    try {
      await deleteLocationSubmissionApi(submission.id);
      message.success('Submission deleted successfully');
      fetchSubmissions();
    } catch (error) {
      // Handled by global interceptor
    }
  };

  const handleApprove = async (submission) => {
    try {
      await reviewSubmissionApi(submission.id, { status: SubmissionStatus.Approved });
      message.success('Submission approved successfully');
      fetchSubmissions();
      setReviewModalOpen(false);
    } catch (error) {
      message.error('Failed to approve submission');
    }
  };

  const handleReject = async () => {
    if (!reviewData.rejectionReason) {
      message.error('Please provide a rejection reason');
      return;
    }
    try {
      await reviewSubmissionApi(viewingSubmission.id, {
        status: SubmissionStatus.Rejected,
        rejectionReason: reviewData.rejectionReason
      });
      message.success('Submission rejected');
      fetchSubmissions();
      setReviewModalOpen(false);
    } catch (error) {
      message.error('Failed to reject submission');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>My Location Submissions</Title>
        </div>
        <Button type="primary" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>Your Submissions</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Submit New Location
            </Button>
          </div>
          <Card>
            <SubmissionTable
              data={data}
              loading={loading}
              pagination={pagination}
              onTableChange={handleTableChange}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
            />
          </Card>
        </Space>
      </Content>

      <SubmissionForm
        open={formOpen}
        submission={editingSubmission}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <Modal
        title="Submission Details"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setViewingSubmission(null);
        }}
        footer={null}
        width={800}
      >
        {viewingSubmission && (
          <div>
            <h3>{viewingSubmission.name}</h3>
            <p><strong>Status:</strong> {SubmissionStatus[viewingSubmission.status]}</p>
            <p><strong>Address:</strong> {viewingSubmission.address}</p>
            <p><strong>Description:</strong> {viewingSubmission.description || 'N/A'}</p>
            <p><strong>Coordinates:</strong> {viewingSubmission.latitude}, {viewingSubmission.longitude}</p>
            <p><strong>Price Range:</strong> ${viewingSubmission.priceMinUsd} - ${viewingSubmission.priceMaxUsd}</p>
            <p><strong>Contact:</strong> {viewingSubmission.telephone} | {viewingSubmission.email}</p>
            <p><strong>Location Type:</strong> {viewingSubmission.locationTypeName || 'N/A'}</p>
            <p><strong>Destination:</strong> {viewingSubmission.destinationName || 'N/A'}</p>

            {viewingSubmission.services && viewingSubmission.services.length > 0 && (
              <div>
                <h4>Services:</h4>
                <ul>
                  {viewingSubmission.services.map((s, i) => (
                    <li key={i}>{s.name} - ${s.price} {s.unit}</li>
                  ))}
                </ul>
              </div>
            )}

            {viewingSubmission.rejectionReason && (
              <div style={{ color: 'red', marginTop: 16 }}>
                <strong>Rejection Reason:</strong> {viewingSubmission.rejectionReason}
              </div>
            )}

            {viewingSubmission.status === SubmissionStatus.Pending && (
              <Space style={{ marginTop: 16 }}>
                <Button onClick={() => setReviewModalOpen(true)} type="primary">
                  Review Submission
                </Button>
              </Space>
            )}
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        title="Review Submission"
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            block
            type="primary"
            size="large"
            onClick={() => handleApprove(viewingSubmission)}
          >
            Approve
          </Button>
          <Button
            block
            danger
            size="large"
            onClick={() => {
              setReviewModalOpen(false);
              setTimeout(() => setReviewModalOpen(true), 100);
            }}
          >
            Reject
          </Button>
          {reviewModalOpen && (
            <div>
              <label>Rejection Reason:</label>
              <textarea
                className="ant-input"
                rows={4}
                value={reviewData.rejectionReason}
                onChange={(e) => setReviewData({ ...reviewData, rejectionReason: e.target.value })}
                placeholder="Please provide a reason for rejection..."
                style={{ width: '100%', marginTop: 8 }}
              />
              <Button
                block
                danger
                type="primary"
                onClick={handleReject}
                style={{ marginTop: 8 }}
              >
                Confirm Rejection
              </Button>
            </div>
          )}
        </Space>
      </Modal>
    </Layout>
  );
};

export default SubmissionsPage;
