import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal } from 'antd';
import { PlusOutlined, HomeOutlined, EditOutlined } from '@ant-design/icons';
import { useSubmissions } from '../hooks/useSubmissions';
import SubmissionTable from '../components/SubmissionTable';
import SubmissionForm from '../components/SubmissionForm';
import LocationDetailView from '@/components/LocationDetailView';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi, getLocationByIdApi } from '../api';
import { fetchReferenceData, getCachedReferenceData } from '@/utils/locationCache';
import { transformLocationForDisplay } from '@/utils/locationMappers';

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
  const [referenceData, setReferenceData] = useState({ allTags: [], locationTypes: [], amenities: [] });

  // Fetch reference data for transforming submission data
  useEffect(() => {
    const loadReferenceData = async () => {
      const cached = getCachedReferenceData();
      if (cached) {
        setReferenceData(cached);
        return;
      }

      try {
        const refData = await fetchReferenceData();
        setReferenceData(refData);
      } catch (error) {
        console.error('Failed to load reference data:', error);
      }
    };

    loadReferenceData();
  }, []);

  const handleCreate = () => {
    setEditingSubmission(null);
    setFormOpen(true);
  };

  const handleEdit = async (submission) => {
    try {
      // Fetch full submission detail including opening hours and seasons
      const detail = await getSubmissionByIdApi(submission.id);
      setEditingSubmission(detail);
      setFormOpen(true);
    } catch (error) {
      message.error('Failed to load submission details for editing');
    }
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
      // Transform data to match LocationDetailView format (same as Location detail)
      const transformedData = transformLocationForDisplay(detail, referenceData);
      setViewingSubmission(transformedData);
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
        title={`📝 ${viewingSubmission?.name || 'Submission Details'}`}
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setViewingSubmission(null);
        }}
        footer={null}
        width={900}
      >
        {viewingSubmission && (
          <LocationDetailView
            data={viewingSubmission}
            options={{
              showSubmissionInfo: true,
              showId: true,
              showTimestamps: true,
            }}
          />
        )}
      </Modal>
    </Layout>
  );
};

export default SubmissionsPage;
