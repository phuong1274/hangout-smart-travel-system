import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message, Modal, ConfigProvider } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { useSubmissions } from '../hooks/useSubmissions';
import SubmissionTable from '../components/SubmissionTable';
import SubmissionForm from '../components/SubmissionForm';
import LocationDetailView from '@/components/LocationDetailView';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi } from '../api';
import { fetchReferenceData, getCachedReferenceData } from '@/utils/locationCache';
import { transformLocationForDisplay } from '@/utils/locationMappers';
import styles from '../styles/SubmissionsPage.module.css';

const { Title } = Typography;

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
    }
  }
};

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
    }
  };

  return (
    <ConfigProvider theme={tropicalTheme}>
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <HomeOutlined className={styles.floatingIcon} />
            <Title level={3} className={styles.mainTitle}>My Location Submissions</Title>
          </div>
          <Button className={styles.navButton} onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
        
        <div className={styles.content}>
          <Space direction="vertical" size="large" className={styles.mainSpace}>
            <div className={styles.actionHeader}>
              <Title level={2} className={styles.subHeadingTitle}>Your Submissions</Title>
              <Button className={styles.ctaButton} icon={<PlusOutlined />} onClick={handleCreate}>
                Submit New Location
              </Button>
            </div>
            <Card className={styles.tropicalCard}>
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
        </div>

        <SubmissionForm
          open={formOpen}
          submission={editingSubmission}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        <Modal
          title={<span className={styles.modalTitle}>🌴 {viewingSubmission?.name || 'Submission Details'}</span>}
          open={detailModalOpen}
          onCancel={() => {
            setDetailModalOpen(false);
            setViewingSubmission(null);
          }}
          footer={null}
          width={900}
          className={styles.tropicalModal}
        >
          {viewingSubmission && (
            <div className={styles.fadeUpAnim}>
              <LocationDetailView
                data={viewingSubmission}
                options={{
                  showSubmissionInfo: true,
                  showId: true,
                  showTimestamps: true,
                }}
              />
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default SubmissionsPage;