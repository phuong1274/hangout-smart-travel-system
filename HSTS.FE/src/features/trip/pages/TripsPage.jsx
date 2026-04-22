import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Space, Button, Table, Tag, Popconfirm, ConfigProvider, message, Tabs, List, Avatar, Badge } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, TeamOutlined, CheckOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { getMyInvitationsApi, respondInvitationApi } from '../api';
import { PATHS } from '@/routes/paths';
import PhoneNumberModal from '../components/PhoneNumberModal';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import styles from '../styles/TripsPage.module.css';

const { Title, Text } = Typography;

const STATUS_MAP = {
  0: 'Planned',
  1: 'InProgress',
  2: 'Completed',
  3: 'Cancelled',
};

const statusColors = {
  Planned: '#4ECDC4',     
  InProgress: '#FFE66D',  
  Completed: '#E9ECEF',   
  Cancelled: '#FF6B6B',   
};

const getStatusLabel = (status) => {
  if (typeof status === 'number') {
    return STATUS_MAP[status] || 'Planned';
  }
  return status || 'Planned';
};

const formatDateLocal = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const TripsPage = () => {
  const navigate = useNavigate();
  const { data: trips, loading, handleDelete, refetch: refetchTrips } = useTrips();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [respondingIds, setRespondingIds] = useState(new Set());

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const data = await getMyInvitationsApi();
      setInvitations(Array.isArray(data) ? data : []);
    } catch {
      setInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleRespondInvitation = async (invitationId, isAccepted) => {
    setRespondingIds((prev) => new Set([...prev, invitationId]));
    try {
      await respondInvitationApi(invitationId, isAccepted);
      message.success(isAccepted ? 'Invitation accepted!' : 'Invitation rejected.');
      fetchInvitations();
      if (isAccepted) refetchTrips();
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.title || err?.response?.data || '';
      if (typeof errMsg === 'string' && errMsg.includes('Phone_Number_Required')) {
        setPendingAction({ type: 'invite', payload: { invitationId, isAccepted: true } });
        setPhoneModalOpen(true);
      } else {
        message.error(typeof errMsg === 'string' ? errMsg : 'Failed to respond to invitation.');
      }
    } finally {
      setRespondingIds((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handlePhoneNumberSuccess = async () => {
    setPhoneModalOpen(false);
    if (pendingAction?.type === 'invite') {
      await handleRespondInvitation(pendingAction.payload.invitationId, true);
    }
    setPendingAction(null);
  };

  const handleCreateTripClick = () => {
    navigate(PATHS.CREATE_TRIP_MANUAL_SETUP);
  };

  const columns = [
    {
      title: 'Trip Name',
      dataIndex: 'tripName',
      key: 'tripName',
      ellipsis: true,
      sorter: (a, b) => a.tripName.localeCompare(b.tripName),
      render: (text, record) => (
        <Link to={PATHS.TRIP_DETAIL.replace(':id', record.id)} style={{ fontWeight: 600, color: '#1A535C' }}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.startDate) - new Date(b.startDate),
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.endDate) - new Date(b.endDate),
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date) => date ? new Date(date).toLocaleString() : 'Never',
      sorter: (a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0),
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const label = getStatusLabel(status);
        const tagColor = statusColors[label] || '#E9ECEF';
        
        const isDarkText = label === 'InProgress' || label === 'Planned' || label === 'Completed';
        const textColor = isDarkText ? '#1A535C' : '#FFFFFF';

        return (
          <Tag 
            style={{ 
              backgroundColor: tagColor, 
              color: textColor,
              border: 'none',
              borderRadius: 9999, 
              padding: '2px 14px', 
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {label}
          </Tag>
        );
      },
      filters: Object.keys(statusColors).map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => getStatusLabel(record.status) === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            className={styles.actionIconView}
            icon={<EyeOutlined />}
            onClick={() => navigate(PATHS.TRIP_DETAIL.replace(':id', record.id))}
          />
          <Popconfirm
            title="Delete Trip"
            description="Are you sure you want to delete this trip? This action cannot be undone."
            onConfirm={async () => {
              await handleDelete(record.id);
            }}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, className: styles.pillBtn }}
            cancelButtonProps={{ className: `${styles.pillBtn} ${styles.rejectBtn}` }}
          >
            <Button type="text" className={styles.actionIconDelete} icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tripsData = Array.isArray(trips) ? trips : [];
  const currentTableData = tripsData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabItems = [
    {
      key: 'trips',
      label: (
        <span><TeamOutlined style={{ marginRight: 4 }} />Trip List</span>
      ),
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div className={styles.tableContainer}>
            <Table
              className={styles.tropicalTable}
              columns={columns}
              dataSource={currentTableData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 800 }}
              pagination={false}
            />
          </div>
          
          <div className={styles.cardContainer}>
            {currentTableData.map((item) => (
              <div key={item.id} className={styles.tripMobileCard}>
                <div className={styles.cardHeader}>
                  <Link to={PATHS.TRIP_DETAIL.replace(':id', item.id)} className={styles.cardTripName}>
                    {item.tripName}
                  </Link>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfoRow}>
                    <div className={styles.infoCol}>
                      <span className={styles.infoLabel}>Start Date</span>
                      <span className={styles.infoValue}>{formatDateLocal(item.startDate)}</span>
                    </div>
                    <div className={styles.infoCol}>
                      <span className={styles.infoLabel}>End Date</span>
                      <span className={styles.infoValue}>{formatDateLocal(item.endDate)}</span>
                    </div>
                  </div>
                  <div className={styles.cardInfoRow}>
                    <div className={styles.infoCol}>
                      <span className={styles.infoLabel}>Currency</span>
                      <span className={styles.infoValue}>{item.currency}</span>
                    </div>
                    <div className={styles.infoCol}>
                      <span className={styles.infoLabel}>Updated At</span>
                      <span className={styles.infoValue}>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                  <div className={styles.cardInfoRow}>
                    <div className={styles.infoCol}>
                      <span className={styles.infoLabel}>Status</span>
                      <div className={styles.infoValue}>
                        <Tag 
                          style={{ 
                            backgroundColor: statusColors[getStatusLabel(item.status)] || '#E9ECEF', 
                            color: (getStatusLabel(item.status) === 'InProgress' || getStatusLabel(item.status) === 'Planned' || getStatusLabel(item.status) === 'Completed') ? '#1A535C' : '#FFFFFF',
                            border: 'none',
                            borderRadius: 9999, 
                            padding: '4px 12px', 
                            fontWeight: 700,
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            margin: 0
                          }}
                        >
                          {getStatusLabel(item.status)}
                        </Tag>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Button
                    className={styles.cardActionBtn}
                    onClick={() => navigate(PATHS.TRIP_DETAIL.replace(':id', item.id))}
                  >
                    View Details
                  </Button>
                  <Popconfirm
                    title="Delete Trip"
                    onConfirm={() => handleDelete(item.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger className={styles.cardActionBtnDelete}>
                      Delete
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.paginationContainer}>
            <AppPagination
              current={currentPage}
              pageSize={pageSize}
              total={tripsData.length}
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
            />
          </div>
        </Space>
      ),
    },
    {
      key: 'invitations',
      label: (
        <Badge count={invitations.length} size="small" offset={[8, 0]} color="#FF6B6B">
          <span>Trip Invitations</span>
        </Badge>
      ),
      children: (
        <List
          loading={invitationsLoading}
          dataSource={invitations}
          locale={{ emptyText: 'No pending invitations' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="accept"
                  type="primary"
                  className={styles.pillBtn}
                  icon={<CheckOutlined />}
                  loading={respondingIds.has(item.id)}
                  onClick={() => handleRespondInvitation(item.id, true)}
                >
                  Accept
                </Button>,
                <Button
                  key="reject"
                  className={`${styles.pillBtn} ${styles.rejectBtn}`}
                  icon={<CloseOutlined />}
                  loading={respondingIds.has(item.id)}
                  onClick={() => handleRespondInvitation(item.id, false)}
                >
                  Reject
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4ECDC4' }} />}
                title={
                  <Text>
                    <Text strong style={{ color: '#1A535C' }}>{item.inviterName}</Text> invited you to{' '}
                    <Text strong style={{ color: '#1A535C' }}>{item.tripName}</Text>
                  </Text>
                }
                description={`Expires: ${new Date(item.expirationDate).toLocaleDateString()}`}
              />
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <div className={styles.appWrapper}>
      <div className={styles.floatingCircle1}></div>
      <div className={styles.floatingCircle2}></div>
      <div className={styles.content}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#4ECDC4',
              colorError: '#FF6B6B',
              colorTextBase: '#1A535C',
              borderRadius: 8,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            },
            components: {
              Button: {
                borderRadius: 9999,
                controlHeight: 44,
              },
              Tag: {
                marginEnd: 0
              }
            },
          }}
        >
          <Card className={styles.dataCard}>
            <div className={styles.toolbar}>
              <Title level={3} style={{ margin: 0, color: '#1A535C' }}>My Trips</Title>
              <Button
                className={styles.primaryBtn}
                icon={<PlusOutlined />}
                onClick={handleCreateTripClick}
              >
                Create Trip
              </Button>
            </div>
            <Tabs items={tabItems} defaultActiveKey="trips" />
          </Card>

          <PhoneNumberModal
            wrapClassName={styles.tropicalModal}
            open={phoneModalOpen}
            onCancel={() => { setPhoneModalOpen(false); setPendingAction(null); }}
            onSuccess={handlePhoneNumberSuccess}
          />
        </ConfigProvider>
      </div>
    </div>
  );
};

export default TripsPage;