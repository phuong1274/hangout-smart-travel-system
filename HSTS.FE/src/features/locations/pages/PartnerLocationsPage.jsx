import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal, Tabs, Tag, Table, Popconfirm } from 'antd';
import { PlusOutlined, HomeOutlined, EditOutlined, EyeOutlined, DeleteOutlined, EnvironmentOutlined, LinkOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { usePartnerLocations } from '../hooks/usePartnerLocations';
import { useSubmissions } from '@/features/location-submissions/hooks/useSubmissions';
import ClosureModal from '../components/ClosureModal';
import ClosureHistoryModal from '../components/ClosureHistoryModal';
import SubmissionForm from '@/features/location-submissions/components/SubmissionForm';
import SubmissionTable from '@/features/location-submissions/components/SubmissionTable';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi, getLocationByIdApi } from '@/features/location-submissions/api';
import { deleteLocationApi } from '../api';
import { getClosuresByLocationApi, endClosureApi } from '../api/closures';
import { PAGINATION } from '@/config/constants';

const { Title } = Typography;

const PartnerLocationsPage = () => {
  const [activeTab, setActiveTab] = useState('locations');
  
  const {
    data: locationsData,
    loading: locationsLoading,
    pagination: locationsPagination,
    handleTableChange: handleLocationsTableChange,
    fetchLocations,
  } = usePartnerLocations();

  const {
    data: submissionsData,
    loading: submissionsLoading,
    pagination: submissionsPagination,
    handleTableChange: handleSubmissionsTableChange,
    fetchSubmissions,
  } = useSubmissions();

  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [viewingLocation, setViewingLocation] = useState(null);
  const [locationDetailModalOpen, setLocationDetailModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [referenceData, setReferenceData] = useState({ allTags: [], locationTypes: [], amenities: [] });

  // Fetch reference data once on mount
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

  // Closure states
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureHistoryModalOpen, setClosureHistoryModalOpen] = useState(false);
  const [selectedLocationForClosure, setSelectedLocationForClosure] = useState(null);
  const [closingLocation, setClosingLocation] = useState(null);

  const handleViewLocation = async (location) => {
    try {
      const fullLocation = await getLocationByIdApi(location.id);
      setSelectedLocation(fullLocation);
      // Could open a detail modal here if needed
      message.info(`Viewing: ${location.name}`);
    } catch (error) {
      message.error('Failed to load location details');
    }
  };

  const handleRequestEdit = async (location) => {
    try {
      // Fetch full location detail including opening hours and seasons
      const fullLocation = await getLocationByIdApi(location.id);
      setSelectedLocation(fullLocation);
      setSuggestEditOpen(true);
    } catch (error) {
      message.error('Failed to load location details for editing');
    }
  };

  const handleSuggestEditSuccess = () => {
    fetchSubmissions();
    message.success('Edit suggestion submitted successfully!');
  };

  const handleDeleteLocation = async (location) => {
    try {
      await deleteLocationApi(location.id);
      message.success('Location deleted successfully');
      fetchLocations();
    } catch (error) {
    }
  };

  // Closure handlers
  const handleCloseLocation = (location) => {
    setClosingLocation(location);
    setClosureModalOpen(true);
  };

  const handleOpenLocation = async (location) => {
    try {
      const closures = await getClosuresByLocationApi(location.id);
      const activeClosure = closures?.find(c => c.isActive);
      if (activeClosure) {
        await endClosureApi(activeClosure.id);
        message.success(`"${location.name}" is now open.`);
        fetchLocations();
      } else {
        message.warning('No active closure found. The location may already be open.');
        fetchLocations();
      }
    } catch (error) {
      message.error('Failed to open location.');
    }
  };

  const handleViewClosureHistory = (location) => {
    setSelectedLocationForClosure(location);
    setClosureHistoryModalOpen(true);
  };

  const handleClosureSuccess = () => {
    setClosureModalOpen(false);
    setClosingLocation(null);
    fetchLocations();
  };

  const handleClosureModalClose = () => {
    setClosureModalOpen(false);
    setClosingLocation(null);
  };

  const handleClosureHistoryModalClose = () => {
    setClosureHistoryModalOpen(false);
    setSelectedLocationForClosure(null);
  };

  const handleCreateSubmission = () => {
    setEditingSubmission(null);
    setFormOpen(true);
  };

  const handleEditSubmission = async (submission) => {
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

  const handleViewSubmission = async (submission) => {
    try {
      const detail = await getSubmissionByIdApi(submission.id);
      // Transform data to match LocationDetailView format
      const transformedData = transformLocationForDisplay(detail, referenceData);
      setViewingSubmission(transformedData);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load submission details');
    }
  };

  const handleDeleteSubmission = async (submission) => {
    try {
      await deleteLocationSubmissionApi(submission.id);
      message.success('Submission deleted successfully');
      fetchSubmissions();
    } catch (error) {
    }
  };

  const handleLocationsPaginationChange = (page, pageSize) => {
    handleLocationsTableChange(
      { current: page, pageSize, total: locationsPagination?.total },
      {},
      {}
    );
  };

  const tabItems = [
    {
      key: 'locations',
      label: 'My Locations',
      children: renderLocationsTab(),
    },
    {
      key: 'submissions',
      label: 'My Submissions',
      children: renderSubmissionsTab(),
    },
  ];

  function renderLocationsTab() {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 60,
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (text, record) => (
          <div>
            <strong style={{ fontSize: '15px', color: '#1A535C' }}>{text}</strong>
            {record.destinationName && (
              <div style={{ fontSize: 12, color: '#4ECDC4', marginTop: 4, fontWeight: 500 }}>
                <EnvironmentOutlined className={styles.actionIcon} style={{ marginRight: 4 }} />
                {record.destinationName}
              </div>
            )}
            {record.socialLinks && record.socialLinks.length > 0 && (
              <div style={{ fontSize: 12, color: '#FF6B6B', marginTop: 4, fontWeight: 500 }}>
                <LinkOutlined className={styles.actionIcon} style={{ marginRight: 4 }} />
                {record.socialLinks.length} link(s)
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'locationTypeName',
        key: 'locationTypeName',
        width: 120,
        render: (text) => <Tag color="#4ECDC4" style={{ color: '#fff' }}>{text || 'N/A'}</Tag>,
      },
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        width: 150,
        ellipsis: true,
      },
      {
        title: 'Contact',
        key: 'contact',
        width: 150,
        render: (_, record) => (
          <div style={{ fontSize: 13 }}>
            {record.telephone && (
              <div style={{ marginBottom: 4 }}><PhoneOutlined style={{ marginRight: 6, color: '#FF6B6B' }} />{record.telephone}</div>
            )}
            {record.email && (
              <div style={{ color: '#1A535C', opacity: 0.8 }}><MailOutlined style={{ marginRight: 6, color: '#4ECDC4' }} />{record.email}</div>
            )}
          </div>
        ),
      },
      {
        title: 'Price',
        key: 'price',
        width: 120,
        render: (_, record) => (
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A535C' }}>
            {record.ticketPrice > 0 && <div>${record.ticketPrice.toFixed(2)}</div>}
            {(record.priceMinUsd || record.priceMaxUsd) && (
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>
                ${record.priceMinUsd?.toFixed(2) || '0'} - ${record.priceMaxUsd?.toFixed(2) || '0'}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Status',
        key: 'effectiveStatus',
        width: 100,
        render: (_, record) => {
          const status = record.effectiveStatus || LocationStatus.Active;
          if (status === LocationStatus.TemporarilyClosed) {
            return <Tag color="red">Closed</Tag>;
          }
          if (status === LocationStatus.Inactive) {
            return <Tag color="default">Inactive</Tag>;
          }
          return <Tag color="green">Active</Tag>;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 200,
        fixed: 'right',
        render: (_, record) => (
          <Space direction="vertical" size="small">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewLocation(record)}
            >
              View Details
            </Button>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleRequestEdit(record)}
            >
              Request Edit
            </Button>
            <Popconfirm
              title="Delete Location"
              description="Are you sure you want to delete this location? This action cannot be undone."
              onConfirm={() => handleDeleteLocation(record)}
              okText="Yes, Delete"
              cancelText="Cancel"
              danger
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Card className={styles.tropicalCard}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#1A535C', fontWeight: 700 }}>Your Managed Locations</Title>
            </div>
            <Button 
              className={styles.ctaButton}
              icon={<PlusOutlined />} 
              onClick={handleCreateSubmission}
            >
              Submit New Location
            </Button>
          </div>
          <div className={styles.tableResponsiveWrapper}>
            <Table
              columns={columns}
              dataSource={locationsData}
              loading={locationsLoading}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              pagination={false}
              onChange={handleLocationsTableChange}
            />
            <div className={styles.paginationWrapper}>
              <AppPagination
                current={locationsPagination?.current || PAGINATION.DEFAULT_PAGE}
                pageSize={locationsPagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE}
                total={locationsPagination?.total || 0}
                onChange={handleLocationsPaginationChange}
              />
            </div>
          </div>
        </Space>
      </Card>
    );
  }

  function renderSubmissionsTab() {
    return (
      <Card className={styles.tropicalCard}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#1A535C', fontWeight: 700 }}>Your Location Submissions</Title>
            </div>
            <Button 
              className={styles.ctaButton}
              icon={<PlusOutlined />} 
              onClick={handleCreateSubmission}
            >
              Submit New Location
            </Button>
          </div>
          <SubmissionTable
            data={submissionsData}
            loading={submissionsLoading}
            pagination={submissionsPagination}
            onTableChange={handleSubmissionsTableChange}
            onEdit={handleEditSubmission}
            onView={handleViewSubmission}
            onDelete={handleDeleteSubmission}
          />
        </Space>
      </Card>
    );
  }

  return (
    <div className={styles.tropicalLayout}>
      <div className={styles.contentWrapper}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </div>

      {/* Suggest Edit Modal */}
      <SuggestEditModal
        location={selectedLocation}
        open={suggestEditOpen}
        submission={null}
        existingLocation={selectedLocation}
        onClose={() => {
          setSuggestEditOpen(false);
          setSelectedLocation(null);
        }}
        onSuccess={handleSuggestEditSuccess}
      />

      <SubmissionForm
        open={formOpen}
        submission={editingSubmission}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      <Modal
        title={`📝 ${viewingSubmission?.name || 'Submission Details'}`}
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
            <p><strong>Status:</strong> <Tag color={
              viewingSubmission.status === SubmissionStatus.Pending ? 'gold' :
              viewingSubmission.status === SubmissionStatus.Approved ? 'green' :
              viewingSubmission.status === SubmissionStatus.Rejected ? 'red' : 'blue'
            }>{SubmissionStatus[viewingSubmission.status]}</Tag></p>
            <p><strong>Address:</strong> {viewingSubmission.address}</p>
            <p><strong>Description:</strong> {viewingSubmission.description || 'N/A'}</p>
            <p><strong>Coordinates:</strong> {viewingSubmission.latitude}, {viewingSubmission.longitude}</p>
            <p><strong>Price Range:</strong> ${viewingSubmission.priceMinUsd} - ${viewingSubmission.priceMaxUsd}</p>
            <p><strong>Contact:</strong> {viewingSubmission.telephone} | {viewingSubmission.email}</p>
            <p><strong>Location Type:</strong> {viewingSubmission.locationTypeName || 'N/A'}</p>
            <p><strong>Destination:</strong> {viewingSubmission.destinationName || 'N/A'}</p>

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

export default PartnerLocationsPage;