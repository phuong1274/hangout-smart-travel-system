import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Space, Button, Table, Tag, Popconfirm, ConfigProvider, message, Tabs, List, Avatar, Badge } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, TeamOutlined, CheckOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTrips } from '../hooks/useTrips';
import { getMyInvitationsApi, respondInvitationApi } from '../api';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/store/authStore';
import PhoneNumberModal from '../components/PhoneNumberModal';

const { Title, Text } = Typography;

const statusColors = {
  Planned: 'blue',
  InProgress: 'green',
  Completed: 'default',
  Cancelled: 'red',
};

const TripsPage = () => {
  const navigate = useNavigate();
  const { data: trips, loading, handleDelete, refetch: refetchTrips } = useTrips();
  const { user } = useAuthStore();

  // Invitations state
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [respondingIds, setRespondingIds] = useState(new Set());

  // Phone number modal
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'invite', payload: any }

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
    // Retry the pending action after phone number update
    if (pendingAction?.type === 'invite') {
      await handleRespondInvitation(pendingAction.payload.invitationId, true);
    }
    setPendingAction(null);
  };

  const columns = [
    {
      title: 'Trip Name',
      dataIndex: 'tripName',
      key: 'tripName',
      ellipsis: true,
      sorter: (a, b) => a.tripName.localeCompare(b.tripName),
      render: (text, record) => (
        <Link to={PATHS.TRIP_DETAIL.replace(':id', record.id)} style={{ fontWeight: 500 }}>
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
      render: (status) => (
        <Tag color={statusColors[status] || 'default'}>
          {status || 'Planned'}
        </Tag>
      ),
      filters: Object.keys(statusColors).map((s) => ({ text: s, value: s })),
      onFilter: (value, record) => (record.status || 'Planned') === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(PATHS.TRIP_DETAIL.replace(':id', record.id))}
          >
            View
          </Button>
          <Popconfirm
            title="Delete Trip"
            description="Are you sure you want to delete this trip? This action cannot be undone."
            onConfirm={async () => {
              await handleDelete(record.id);
            }}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'trips',
      label: (
        <span><TeamOutlined style={{ marginRight: 4 }} />Trip List</span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={trips}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} trips`,
          }}
        />
      ),
    },
    {
      key: 'invitations',
      label: (
        <Badge count={invitations.length} size="small" offset={[8, 0]}>
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
                  size="small"
                  icon={<CheckOutlined />}
                  loading={respondingIds.has(item.id)}
                  onClick={() => handleRespondInvitation(item.id, true)}
                >
                  Accept
                </Button>,
                <Button
                  key="reject"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  loading={respondingIds.has(item.id)}
                  onClick={() => handleRespondInvitation(item.id, false)}
                >
                  Reject
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#FF6B6B' }} />}
                title={
                  <Text>
                    <Text strong>{item.inviterName}</Text> invited you to{' '}
                    <Text strong>{item.tripName}</Text>
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FF6B6B',
          borderRadius: 16,
          colorText: '#1A535C',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>My Trips</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(PATHS.CREATE_TRIP)}
            >
              Create Trip
            </Button>
          </Space>

          <Tabs items={tabItems} defaultActiveKey="trips" />
        </Space>
      </Card>

      {/* Phone Number Required Modal */}
      <PhoneNumberModal
        open={phoneModalOpen}
        onCancel={() => { setPhoneModalOpen(false); setPendingAction(null); }}
        onSuccess={handlePhoneNumberSuccess}
      />
    </ConfigProvider>
  );
};

export default TripsPage;
