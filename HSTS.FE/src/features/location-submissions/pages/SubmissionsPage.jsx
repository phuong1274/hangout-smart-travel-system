import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal, Tag } from 'antd';
import { PlusOutlined, HomeOutlined, PictureOutlined, LinkOutlined, TagsOutlined } from '@ant-design/icons';
import { useSubmissions } from '../hooks/useSubmissions';
import SubmissionTable from '../components/SubmissionTable';
import SubmissionForm from '../components/SubmissionForm';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi } from '../api';
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

            {viewingSubmission.mediaLinks && viewingSubmission.mediaLinks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4><PictureOutlined /> Media Links:</h4>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {viewingSubmission.mediaLinks.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  ))}
                </Space>
              </div>
            )}

            {viewingSubmission.socialLinks && viewingSubmission.socialLinks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4><LinkOutlined /> Social Media Links:</h4>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {viewingSubmission.socialLinks.map((social, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{social.platform}:</strong>
                      <a href={social.url} target="_blank" rel="noopener noreferrer">{social.url}</a>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {viewingSubmission.tagIds && viewingSubmission.tagIds.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4><TagsOutlined /> Tags:</h4>
                <Space wrap>
                  {viewingSubmission.tagIds.map((tagId) => (
                    <Tag key={tagId}>Tag #{tagId}</Tag>
                  ))}
                </Space>
              </div>
            )}

            {viewingSubmission.amenityIds && viewingSubmission.amenityIds.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4> Amenities:</h4>
                <Space wrap>
                  {viewingSubmission.amenityIds.map((amenityId) => (
                    <Tag key={amenityId} color="blue">Amenity #{amenityId}</Tag>
                  ))}
                </Space>
              </div>
            )}

            {viewingSubmission.rejectionReason && (
              <div style={{ color: 'red', marginTop: 16, padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7' }}>
                <strong>⚠️ Rejection Reason:</strong>
                <p style={{ margin: '8px 0 0 0' }}>{viewingSubmission.rejectionReason}</p>
              </div>
            )}

            {viewingSubmission.createdLocationId && (
              <div style={{ color: '#52c41a', marginTop: 16, padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <strong>✓ Approved - Location Created</strong>
                <p style={{ margin: '8px 0 0 0' }}>Location ID: {viewingSubmission.createdLocationId}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default SubmissionsPage;
