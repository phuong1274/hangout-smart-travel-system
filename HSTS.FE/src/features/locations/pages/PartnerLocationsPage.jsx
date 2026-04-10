import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message, Modal, Tabs, Tag, Table, Popconfirm, ConfigProvider } from 'antd';
import { PlusOutlined, EnvironmentOutlined, LinkOutlined, PhoneOutlined, MailOutlined, LockOutlined, UnlockOutlined, HistoryOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { usePartnerLocations } from '../hooks/usePartnerLocations';
import { useSubmissions } from '@/features/location-submissions/hooks/useSubmissions';
import ClosureModal from '../components/ClosureModal';
import ClosureHistoryModal from '../components/ClosureHistoryModal';
import SubmissionForm from '@/features/location-submissions/components/SubmissionForm';
import SubmissionTable from '@/features/location-submissions/components/SubmissionTable';
import LocationDetailView from '@/components/LocationDetailView';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi, getLocationByIdApi } from '@/features/location-submissions/api';
import { deleteLocationApi } from '../api';
import { getClosuresByLocationApi, endClosureApi } from '../api/closures';
import { PAGINATION } from '@/config/constants';
import { fetchReferenceData, getCachedReferenceData } from '@/utils/locationCache';
import { transformLocationForDisplay } from '@/utils/locationMappers';
import styles from '../styles/PartnerLocationsPage.module.css';

const LocationStatus = {
  Active: 1,
  TemporarilyClosed: 2,
  Inactive: 3,
};

const { Title } = Typography;

const PartnerLocationsPage = () => {
  const navigate = useNavigate();
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
        console.error(error);
      }
    };

    loadReferenceData();
  }, []);

  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureHistoryModalOpen, setClosureHistoryModalOpen] = useState(false);
  const [selectedLocationForClosure, setSelectedLocationForClosure] = useState(null);
  const [closingLocation, setClosingLocation] = useState(null);

  const handleViewLocation = async (location) => {
    try {
      const fullLocation = await getLocationByIdApi(location.id);
      const transformedData = transformLocationForDisplay(fullLocation, referenceData);
      setViewingLocation(transformedData);
      setLocationDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load location details');
    }
  };

  const handleRequestEdit = async (location) => {
    try {
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
            <strong style={{ color: '#1A535C' }}>{text}</strong>
            {record.destinationName && (
              <div style={{ fontSize: 12, color: '#4ECDC4', marginTop: 4 }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {record.destinationName}
              </div>
            )}
            {record.socialLinks && record.socialLinks.length > 0 && (
              <div style={{ fontSize: 12, color: '#FF6B6B', marginTop: 4 }}>
                <LinkOutlined style={{ marginRight: 4 }} />
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
        width: 100,
        render: (text) => <span style={{ color: '#1A535C' }}>{text || 'N/A'}</span>,
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
        width: 130,
        render: (_, record) => (
          <div style={{ fontSize: 12, color: '#1A535C' }}>
            {record.telephone && (
              <div><PhoneOutlined style={{ marginRight: 4, color: '#4ECDC4' }} />{record.telephone}</div>
            )}
            {record.email && (
              <div style={{ fontSize: 11, marginTop: 4 }}><MailOutlined style={{ marginRight: 4, color: '#4ECDC4' }} />{record.email}</div>
            )}
          </div>
        ),
      },
      {
        title: 'Price',
        key: 'price',
        width: 100,
        render: (_, record) => (
          <div style={{ fontSize: 12, color: '#1A535C' }}>
            {record.ticketPrice > 0 && <div style={{ fontWeight: 600 }}>${record.ticketPrice.toFixed(2)}</div>}
            {(record.priceMinUsd || record.priceMaxUsd) && (
              <div style={{ fontSize: 11 }}>
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
            return <Tag color="#FF6B6B">Closed</Tag>;
          }
          if (status === LocationStatus.Inactive) {
            return <Tag color="#1A535C">Inactive</Tag>;
          }
          return <Tag color="#4ECDC4">Active</Tag>;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 250,
        fixed: 'right',
        render: (_, record) => {
          const status = record.effectiveStatus || LocationStatus.Active;
          const isClosed = status === LocationStatus.TemporarilyClosed;
          const isInactive = status === LocationStatus.Inactive;

          return (
            <Space direction="vertical" size="small">
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() => handleViewLocation(record)}
              >
                View Details
              </Button>
              {!isInactive && (
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleRequestEdit(record)}
                >
                  Request Edit
                </Button>
              )}
              {!isInactive && (
                <Button
                  type="link"
                  icon={<HistoryOutlined />}
                  onClick={() => handleViewClosureHistory(record)}
                >
                  History
                </Button>
              )}
              {isClosed ? (
                <Popconfirm
                  title="Open Location"
                  description="Are you sure you want to open this location? It will become active immediately."
                  onConfirm={() => handleOpenLocation(record)}
                  okText="Yes, Open"
                  cancelText="Cancel"
                >
                  <Button type="link" style={{ color: '#4ECDC4' }} icon={<UnlockOutlined />}>
                    Open
                  </Button>
                </Popconfirm>
              ) : !isInactive ? (
                <Button
                  type="link"
                  danger
                  icon={<LockOutlined />}
                  onClick={() => handleCloseLocation(record)}
                >
                  Close
                </Button>
              ) : null}
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
          );
        },
      },
    ];

    return (
      <Card className={styles.tropicalCard}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className={styles.headerContainer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} className={styles.sectionTitle}>Your Managed Locations</Title>
            <Button 
              className={styles.ctaButton}
              icon={<PlusOutlined />} 
              onClick={handleCreateSubmission}
            >
              Submit New Location
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={locationsData}
            loading={locationsLoading}
            rowKey="id"
            scroll={{ x: 1000 }}
            pagination={false}
            onChange={handleLocationsTableChange}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px' }}>
            <AppPagination
              current={locationsPagination?.current || PAGINATION.DEFAULT_PAGE}
              pageSize={locationsPagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE}
              total={locationsPagination?.total || 0}
              onChange={(page, pageSize) => handleLocationsTableChange({ current: page, pageSize })}
            />
          </div>
        </Space>
      </Card>
    );
  }

  function renderSubmissionsTab() {
    return (
      <Card className={styles.tropicalCard}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className={styles.headerContainer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} className={styles.sectionTitle}>Your Location Submissions</Title>
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
            pagination={false}
            onTableChange={handleSubmissionsTableChange}
            onEdit={handleEditSubmission}
            onView={handleViewSubmission}
            onDelete={handleDeleteSubmission}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px' }}>
            <AppPagination
              current={submissionsPagination?.current || PAGINATION.DEFAULT_PAGE}
              pageSize={submissionsPagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE}
              total={submissionsPagination?.total || 0}
              onChange={(page, pageSize) => handleSubmissionsTableChange({ current: page, pageSize })}
            />
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <ConfigProvider 
      theme={{ 
        token: { 
          colorPrimary: '#FF6B6B', 
          borderRadius: 16,
          colorText: '#1A535C',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        } 
      }}
    >
      <div className={styles.tropicalContainer}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className={styles.tropicalTabs}
        />

        <SubmissionForm
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

        <Modal
          title={`📍 ${viewingLocation?.name || 'Location Details'}`}
          open={locationDetailModalOpen}
          onCancel={() => {
            setLocationDetailModalOpen(false);
            setViewingLocation(null);
          }}
          footer={null}
          width={900}
        >
          {viewingLocation && (
            <LocationDetailView
              data={viewingLocation}
              options={{
                showSubmissionInfo: false,
                showId: true,
                showTimestamps: true,
              }}
            />
          )}
        </Modal>

        <ClosureModal
          open={closureModalOpen}
          onClose={handleClosureModalClose}
          onSuccess={handleClosureSuccess}
          locationId={closingLocation?.id}
          locationName={closingLocation?.name}
        />

        <ClosureHistoryModal
          open={closureHistoryModalOpen}
          onClose={handleClosureHistoryModalClose}
          locationId={selectedLocationForClosure?.id}
          locationName={selectedLocationForClosure?.name}
          onClosureChange={fetchLocations}
        />
      </div>
    </ConfigProvider>
  );
};

export default PartnerLocationsPage;