import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Space, Result, Spin, message, ConfigProvider } from 'antd';
import { CheckOutlined, CloseOutlined, TeamOutlined } from '@ant-design/icons';
import { verifyInvitationApi, respondInvitationApi } from '../api';
import { useAuthStore } from '@/store/authStore';
import { PATHS } from '@/routes/paths';
import PhoneNumberModal from '../components/PhoneNumberModal';

const { Title, Text } = Typography;

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      setLoading(false);
      return;
    }
    const verify = async () => {
      try {
        const data = await verifyInvitationApi(token);
        setInvitation(data);
      } catch (err) {
        const errMsg = err?.response?.data?.detail || err?.response?.data?.title || 'Invalid or expired invitation.';
        setError(typeof errMsg === 'string' ? errMsg : 'Invalid or expired invitation.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  const handleRespond = async (isAccepted) => {
    if (!invitation) return;
    setResponding(true);
    try {
      await respondInvitationApi(invitation.invitationId, isAccepted);
      if (isAccepted) {
        message.success(`You have joined "${invitation.tripName}"!`);
        navigate(PATHS.TRIP_DETAIL.replace(':id', invitation.tripId));
      } else {
        message.info(`You have declined the invitation to "${invitation.tripName}".`);
        navigate(PATHS.TRIPS_LIST);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data?.title || err?.response?.data || '';
      if (typeof errMsg === 'string' && errMsg.includes('Phone_Number_Required')) {
        setPhoneModalOpen(true);
      } else {
        message.error(typeof errMsg === 'string' && errMsg ? errMsg : 'Failed to respond.');
      }
    } finally {
      setResponding(false);
    }
  };

  const handlePhoneSuccess = async () => {
    setPhoneModalOpen(false);
    await handleRespond(true);
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24 }}>
        <Result
          status="warning"
          title="Login Required"
          subTitle="Please log in to accept or reject this invitation."
          extra={
            <Button type="primary" onClick={() => navigate(`${PATHS.AUTH.LOGIN}?redirect=${encodeURIComponent('/invitations/accept?token=' + token)}`)}>
              Go to Login
            </Button>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="Verifying invitation..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24 }}>
        <Result
          status="error"
          title="Invalid Invitation"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate(PATHS.TRIPS_LIST)}>
              Go to My Trips
            </Button>
          }
        />
      </div>
    );
  }

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24, background: '#f5f5f5' }}>
        <Card style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <TeamOutlined style={{ fontSize: 48, color: '#FF6B6B' }} />

            <div>
              <Title level={3} style={{ margin: 0 }}>Trip Invitation</Title>
              <Text type="secondary" style={{ fontSize: 16, marginTop: 8, display: 'block' }}>
                <Text strong>{invitation.inviterName}</Text> has invited you to join
              </Text>
              <Title level={2} style={{ margin: '8px 0 0', color: '#FF6B6B' }}>
                {invitation.tripName}
              </Title>
            </div>

            <Space size="middle">
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                loading={responding}
                onClick={() => handleRespond(true)}
                style={{ minWidth: 130 }}
              >
                Accept
              </Button>
              <Button
                size="large"
                danger
                icon={<CloseOutlined />}
                loading={responding}
                onClick={() => handleRespond(false)}
                style={{ minWidth: 130 }}
              >
                Reject
              </Button>
            </Space>
          </Space>
        </Card>

        <PhoneNumberModal
          open={phoneModalOpen}
          onCancel={() => setPhoneModalOpen(false)}
          onSuccess={handlePhoneSuccess}
        />
      </div>
    </ConfigProvider>
  );
};

export default AcceptInvitationPage;
