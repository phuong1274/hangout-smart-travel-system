import React, { useState } from 'react';
import { Card, Typography, Space, Button, message, Modal, Tabs, Tag, Table, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined, EnvironmentOutlined, LinkOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { usePartnerLocations } from '../hooks/usePartnerLocations';
import { useSubmissions } from '@/features/location-submissions/hooks/useSubmissions';
import SuggestEditModal from '../components/SuggestEditModal';
import SubmissionForm from '@/features/location-submissions/components/SubmissionForm';
import SubmissionTable from '@/features/location-submissions/components/SubmissionTable';
import { deleteLocationSubmissionApi, getSubmissionByIdApi, getLocationByIdApi } from '@/features/location-submissions/api';
import { deleteLocationApi } from '../api';
import { SubmissionStatus } from '@/features/location-submissions/types';
import { PAGINATION } from '@/config/constants';
import styles from '../styles/PartnerLocationsPage.module.css';

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
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleViewLocation = async (location) => {
    try {
      const fullLocation = await getLocationByIdApi(location.id);
      setSelectedLocation(fullLocation);
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
    }
  };

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
        title: 'Actions',
        key: 'actions',
        width: 160,
        fixed: 'right',
        render: (_, record) => (
          <Space direction="vertical" size="small">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewLocation(record)}
              style={{ color: '#4ECDC4', fontWeight: 600 }}
            >
              Details
            </Button>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleRequestEdit(record)}
              style={{ color: '#FF6B6B', fontWeight: 600 }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete Location"
              description="Are you sure you want to delete this location?"
              onConfirm={() => handleDeleteLocation(record)}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="text" danger icon={<DeleteOutlined />} style={{ fontWeight: 600 }}>
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

      <SuggestEditModal
        location={selectedLocation}
        open={suggestEditOpen}
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
        title="Submission Details"
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setViewingSubmission(null);
        }}
        footer={null}
        width={800}
        wrapClassName={styles.modalWrapper}
      >
        {viewingSubmission && (
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1A535C' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#FF6B6B', marginBottom: '20px' }}>{viewingSubmission.name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <p><strong>Status:</strong> <Tag color={
                viewingSubmission.status === SubmissionStatus.Pending ? '#FFE66D' :
                viewingSubmission.status === SubmissionStatus.Approved ? '#4ECDC4' :
                viewingSubmission.status === SubmissionStatus.Rejected ? '#FF6B6B' : '#1A535C'
              } style={{ color: viewingSubmission.status === SubmissionStatus.Pending ? '#1A535C' : '#fff' }}>{SubmissionStatus[viewingSubmission.status]}</Tag></p>
              <p><strong>Location Type:</strong> <Tag color="#4ECDC4">{viewingSubmission.locationTypeName || 'N/A'}</Tag></p>
              <p><strong>Destination:</strong> {viewingSubmission.destinationName || 'N/A'}</p>
              <p><strong>Price Range:</strong> <span style={{ fontWeight: 600 }}>${viewingSubmission.priceMinUsd} - ${viewingSubmission.priceMaxUsd}</span></p>
            </div>
            
            <div style={{ background: '#F7F9F9', padding: '16px', borderRadius: '16px', marginTop: '20px' }}>
              <p><strong>Address:</strong> {viewingSubmission.address}</p>
              <p><strong>Coordinates:</strong> {viewingSubmission.latitude}, {viewingSubmission.longitude}</p>
              <p><strong>Contact:</strong> {viewingSubmission.telephone} | {viewingSubmission.email}</p>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <strong>Description:</strong> 
              <p style={{ marginTop: '8px', lineHeight: 1.6, opacity: 0.8 }}>{viewingSubmission.description || 'N/A'}</p>
            </div>

            {viewingSubmission.rejectionReason && (
              <div style={{ color: '#FF6B6B', marginTop: 24, padding: '16px', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '16px' }}>
                <strong style={{ display: 'block', fontSize: '16px', marginBottom: '8px' }}>⚠️ Rejection Reason:</strong>
                <p style={{ margin: 0 }}>{viewingSubmission.rejectionReason}</p>
              </div>
            )}

            {viewingSubmission.createdLocationId && (
              <div style={{ color: '#4ECDC4', marginTop: 24, padding: '16px', background: 'rgba(78, 205, 196, 0.1)', borderRadius: '16px' }}>
                <strong style={{ display: 'block', fontSize: '16px', marginBottom: '8px' }}>✓ Approved - Location Created</strong>
                <p style={{ margin: 0, fontWeight: 600 }}>Location ID: {viewingSubmission.createdLocationId}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PartnerLocationsPage;