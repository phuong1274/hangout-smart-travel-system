import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Avatar, Tag, Button, Dropdown, Space, message, Popconfirm, Typography } from 'antd';
import { UserOutlined, CrownOutlined, DollarOutlined, TeamOutlined, MoreOutlined, UserDeleteOutlined, SwapOutlined, UserAddOutlined, PhoneOutlined } from '@ant-design/icons';
import { getTripMembersDetailApi, removeTripMemberApi, changeMemberRoleApi } from '../api';
import { useAuthStore } from '@/store/authStore';
import ChangeRoleModal from './ChangeRoleModal';
import InviteMemberModal from './InviteMemberModal';

const { Text } = Typography;

const ROLE_CONFIG = {
  Leader: { color: 'gold', icon: <CrownOutlined /> },
  Treasurer: { color: 'green', icon: <DollarOutlined /> },
  Member: { color: 'blue', icon: <TeamOutlined /> },
};

const MemberManagement = ({ tripId, groupSize, tripStatus, onMemberChange }) => {
  const { user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleModal, setRoleModal] = useState({ open: false, member: null });
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const data = await getTripMembersDetailApi(tripId);
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const isLeader = currentUserMember?.role === 'Leader';
  const hasTreasurer = members.some((m) => m.role === 'Treasurer');
  const isPlanned = tripStatus === 'Planned' || tripStatus === 0;
  const isGroupFull = groupSize != null && members.length >= groupSize;
  const canInvite = isLeader && isPlanned && !isGroupFull;

  const handleRemoveMember = async (userId) => {
    try {
      await removeTripMemberApi(tripId, userId);
      message.success('Member removed.');
      fetchMembers();
      onMemberChange?.();
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data || '';
      message.error(typeof errMsg === 'string' && errMsg ? errMsg : 'Failed to remove member.');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await changeMemberRoleApi(tripId, userId, newRole);
      message.success('Role updated successfully.');
      fetchMembers();
      onMemberChange?.();
    } catch (err) {
      const errMsg = err?.response?.data?.detail || err?.response?.data || '';
      message.error(typeof errMsg === 'string' && errMsg ? errMsg : 'Failed to change role.');
      throw err;
    }
  };

  const getMenuItems = (member) => {
    if (!isLeader || member.userId === user?.id) return [];
    return [
      {
        key: 'changeRole',
        icon: <SwapOutlined />,
        label: 'Change Role',
        onClick: () => setRoleModal({ open: true, member }),
      },
      {
        key: 'remove',
        icon: <UserDeleteOutlined />,
        label: 'Remove Member',
        danger: true,
        onClick: () => {
          // Using modal confirm for safety
          handleRemoveMember(member.userId);
        },
      },
    ];
  };

  return (
    <>
      <Card
        size="small"
        title={
          <Space>
            <TeamOutlined />
            <span>Members ({members.length})</span>
          </Space>
        }
        extra={
          canInvite && (
            <Button type="link" icon={<UserAddOutlined />} onClick={() => setInviteOpen(true)}>
              Invite
            </Button>
          )
        }
        style={{ marginBottom: 16 }}
      >
        <List
          loading={loading}
          dataSource={members}
          renderItem={(member) => {
            const roleConf = ROLE_CONFIG[member.role] || ROLE_CONFIG.Member;
            const menuItems = getMenuItems(member);

            return (
              <List.Item
                actions={
                  menuItems.length > 0
                    ? [
                        <Dropdown key="actions" menu={{ items: menuItems }} trigger={['click']}>
                          <Button type="text" icon={<MoreOutlined />} />
                        </Dropdown>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={member.avatarUrl}
                      icon={!member.avatarUrl && <UserOutlined />}
                      style={{ backgroundColor: !member.avatarUrl ? '#FF6B6B' : undefined }}
                    />
                  }
                  title={
                    <Space>
                      <Text strong>{member.fullName}</Text>
                      <Tag color={roleConf.color} icon={roleConf.icon}>
                        {member.role}
                      </Tag>
                      {member.userId === user?.id && (
                        <Tag color="default">You</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      {member.phoneNumber && (
                        <Text type="secondary"><PhoneOutlined /> {member.phoneNumber}</Text>
                      )}
                      <Text type="secondary">Joined: {new Date(member.joinedDate).toLocaleDateString()}</Text>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <ChangeRoleModal
        open={roleModal.open}
        member={roleModal.member}
        hasTreasurer={hasTreasurer}
        onCancel={() => setRoleModal({ open: false, member: null })}
        onSubmit={handleChangeRole}
      />

      <InviteMemberModal
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        tripId={tripId}
        onSuccess={fetchMembers}
      />
    </>
  );
};

export default MemberManagement;
