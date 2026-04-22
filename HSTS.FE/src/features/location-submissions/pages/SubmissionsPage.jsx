import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message, Modal, ConfigProvider, Tag, Popconfirm, Pagination } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSubmissions } from '../hooks/useSubmissions';
import SubmissionTable from '../components/SubmissionTable';
import SubmissionForm from '../components/SubmissionForm';
import LocationDetailView from '@/components/LocationDetailView';
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

const getStatusConfig = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return { bg: '#4ECDC4', text: '#1A535C' };
  if (s === 'rejected') return { bg: '#FF6B6B', text: '#FFFFFF' };
  if (s === 'pending') return { bg: '#FFE66D', text: '#1A535C' };
  return { bg: '#E9ECEF', text: '#1A535C' };
};

const SubmissionsPage = () => {
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
        <div className={styles.content}>
          <Space direction="vertical" size="large" className={styles.mainSpace}>
            <div className={styles.actionHeader}>
              <Title level={3} className={styles.pageTitle}>My Location</Title>
              <Button className={styles.ctaButton} icon={<PlusOutlined />} onClick={handleCreate}>
                Submit New Location
              </Button>
            </div>
            
            <Card className={styles.tropicalCard}>
              <div className={styles.tableContainer}>
                <SubmissionTable
                  data={data}
                  loading={loading}
                  pagination={pagination}
                  onTableChange={handleTableChange}
                  onEdit={handleEdit}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              </div>

              <div className={styles.cardContainer}>
                {(data || []).map((item) => {
                  const statusCfg = getStatusConfig(item.status);
                  return (
                    <div key={item.id} className={styles.mobileCard}>
                      <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>{item.name}</span>
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.cardInfoRow}>
                          <div className={styles.infoCol}>
                            <span className={styles.infoLabel}>Location Type</span>
                            <span className={styles.infoValue}>{item.locationTypeName || item.locationType || '-'}</span>
                          </div>
                          <div className={styles.infoCol}>
                            <span className={styles.infoLabel}>Destination</span>
                            <span className={styles.infoValue}>{item.destinationName || item.destination || '-'}</span>
                          </div>
                        </div>
                        <div className={styles.cardInfoRow}>
                          <div className={styles.infoCol}>
                            <span className={styles.infoLabel}>Submitted At</span>
                            <span className={styles.infoValue}>
                              {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}
                            </span>
                          </div>
                          <div className={styles.infoCol}>
                            <span className={styles.infoLabel}>Status</span>
                            <div className={styles.infoValue}>
                              <Tag
                                style={{
                                  backgroundColor: statusCfg.bg,
                                  color: statusCfg.text,
                                  border: 'none',
                                  borderRadius: 9999,
                                  padding: '4px 12px',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  textTransform: 'uppercase',
                                  margin: 0
                                }}
                              >
                                {item.status || 'Unknown'}
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={styles.cardFooter}>
                        <Button
                          className={styles.cardActionBtn}
                          icon={<EyeOutlined />}
                          onClick={() => handleView(item)}
                        >
                          View
                        </Button>
                        <Button
                          className={styles.cardActionBtn}
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                        <Popconfirm
                          title="Delete submission?"
                          onConfirm={() => handleDelete(item)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button danger className={styles.cardActionBtnDelete} icon={<DeleteOutlined />}>
                            Delete
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  );
                })}
                <div className={styles.paginationWrapper}>
                  <Pagination
                    current={pagination?.current || 1}
                    pageSize={pagination?.pageSize || 10}
                    total={pagination?.total || 0}
                    onChange={(page, pageSize) => handleTableChange({ current: page, pageSize })}
                    size="small"
                  />
                </div>
              </div>
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