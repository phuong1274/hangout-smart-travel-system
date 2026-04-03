import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message, Modal, Tabs, Tag, Table, Popconfirm } from 'antd';
import { PlusOutlined, HomeOutlined, EditOutlined, EyeOutlined, DeleteOutlined, EnvironmentOutlined, LinkOutlined, PhoneOutlined, MailOutlined, LockOutlined, UnlockOutlined, HistoryOutlined } from '@ant-design/icons';
import { usePartnerLocations } from '../hooks/usePartnerLocations';
import { useSubmissions } from '@/features/location-submissions/hooks/useSubmissions';
import SuggestEditModal from '../components/SuggestEditModal';
import ClosureModal from '../components/ClosureModal';
import ClosureHistoryModal from '../components/ClosureHistoryModal';
import SubmissionForm from '@/features/location-submissions/components/SubmissionForm';
import SubmissionTable from '@/features/location-submissions/components/SubmissionTable';
import { useNavigate } from 'react-router-dom';
import { deleteLocationSubmissionApi, getSubmissionByIdApi, getLocationByIdApi } from '@/features/location-submissions/api';
import { deleteLocationApi } from '../api';
import { getClosuresByLocationApi, endClosureApi } from '../api/closures';
import { SubmissionStatus } from '@/features/location-submissions/types';
import { PAGINATION } from '@/config/constants';

// LocationStatus enum values (matching backend)
const LocationStatus = {
  Active: 1,
  TemporarilyClosed: 2,
  Inactive: 3,
};

const { Title } = Typography;
const { Header, Content } = Layout;

const PartnerLocationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('locations');
  
  // Locations tab state
  const {
    data: locationsData,
    loading: locationsLoading,
    pagination: locationsPagination,
    handleTableChange: handleLocationsTableChange,
    fetchLocations,
  } = usePartnerLocations();

  // Submissions tab state
  const {
    data: submissionsData,
    loading: submissionsLoading,
    pagination: submissionsPagination,
    handleTableChange: handleSubmissionsTableChange,
    fetchSubmissions,
  } = useSubmissions();

  // Modal states
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Closure states
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureHistoryModalOpen, setClosureHistoryModalOpen] = useState(false);
  const [selectedLocationForClosure, setSelectedLocationForClosure] = useState(null);
  const [closingLocation, setClosingLocation] = useState(null);

  // Location handlers
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

  const handleRequestEdit = (location) => {
    setSelectedLocation(location);
    setSuggestEditOpen(true);
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
      // Handled by global interceptor
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

  // Submission handlers
  const handleCreateSubmission = () => {
    setEditingSubmission(null);
    setFormOpen(true);
  };

  const handleEditSubmission = (submission) => {
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

  const handleViewSubmission = async (submission) => {
    try {
      const detail = await getSubmissionByIdApi(submission.id);
      setViewingSubmission(detail);
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
      // Handled by global interceptor
    }
  };

  // Tab items
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
            <strong>{text}</strong>
            {record.destinationName && (
              <div style={{ fontSize: 12, color: '#888' }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {record.destinationName}
              </div>
            )}
            {record.socialLinks && record.socialLinks.length > 0 && (
              <div style={{ fontSize: 12, color: '#1677ff', marginTop: 4 }}>
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
        render: (text) => text || 'N/A',
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
          <div style={{ fontSize: 12 }}>
            {record.telephone && (
              <div><PhoneOutlined style={{ marginRight: 4 }} />{record.telephone}</div>
            )}
            {record.email && (
              <div style={{ fontSize: 11, color: '#666' }}><MailOutlined style={{ marginRight: 4 }} />{record.email}</div>
            )}
          </div>
        ),
      },
      {
        title: 'Price',
        key: 'price',
        width: 100,
        render: (_, record) => (
          <div style={{ fontSize: 12 }}>
            {record.ticketPrice > 0 && <div style={{ fontWeight: 500 }}>${record.ticketPrice.toFixed(2)}</div>}
            {(record.priceMinUsd || record.priceMaxUsd) && (
              <div style={{ fontSize: 11, color: '#666' }}>
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
                  <Button type="link" style={{ color: '#52c41a' }} icon={<UnlockOutlined />}>
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
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Your Managed Locations</Title>
            <Button 
              type="primary" 
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
            pagination={{
              current: locationsPagination?.current || PAGINATION.DEFAULT_PAGE,
              pageSize: locationsPagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE,
              total: locationsPagination?.total || 0,
              showSizeChanger: true,
              pageSizeOptions: PAGINATION.PAGE_SIZE_OPTIONS,
              showTotal: (totalItems) => `Total ${totalItems} items`,
            }}
            onChange={handleLocationsTableChange}
          />
        </Space>
      </Card>
    );
  }

  function renderSubmissionsTab() {
    return (
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Your Location Submissions</Title>
            <Button 
              type="primary" 
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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Partner Location Management</Title>
        </div>
        <Space>
          <Button onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Content>

      {/* Suggest Edit Modal */}
      <SuggestEditModal
        location={selectedLocation}
        open={suggestEditOpen}
        onClose={() => {
          setSuggestEditOpen(false);
          setSelectedLocation(null);
        }}
        onSuccess={handleSuggestEditSuccess}
      />

      {/* Submission Form Modal */}
      <SubmissionForm
        open={formOpen}
        submission={editingSubmission}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Submission Detail Modal */}
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

      {/* Closure Modal */}
      <ClosureModal
        open={closureModalOpen}
        onClose={handleClosureModalClose}
        onSuccess={handleClosureSuccess}
        locationId={closingLocation?.id}
        locationName={closingLocation?.name}
      />

      {/* Closure History Modal */}
      <ClosureHistoryModal
        open={closureHistoryModalOpen}
        onClose={handleClosureHistoryModalClose}
        locationId={selectedLocationForClosure?.id}
        locationName={selectedLocationForClosure?.name}
        onClosureChange={fetchLocations}
      />
    </Layout>
  );
};

export default PartnerLocationsPage;
