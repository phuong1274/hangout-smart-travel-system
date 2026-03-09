import { Button, Card, Empty, List, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useMyProfiles, useDeleteProfile } from '../hooks/useUserProfile';
import ProfileFormModal from './ProfileFormModal';

const { Title } = Typography;

const ProfileList = () => {
  const { data: profiles, loading, refetch } = useMyProfiles();
  const { deleteProfile, loading: deleting } = useDeleteProfile(refetch);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  const handleCreate = () => { setEditingProfile(null); setModalOpen(true); };
  const handleEdit = (profile) => { setEditingProfile(profile); setModalOpen(true); };
  const handleClose = () => setModalOpen(false);
  const handleSuccess = () => { setModalOpen(false); refetch(); };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Travel Profiles</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Profile
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={profiles}
        locale={{ emptyText: <Empty description="No profiles yet" /> }}
        renderItem={(profile) => (
          <List.Item
            actions={[
              <Button key="edit" icon={<EditOutlined />} size="small" onClick={() => handleEdit(profile)}>
                Edit
              </Button>,
              <Popconfirm
                key="delete"
                title="Delete this profile?"
                onConfirm={() => deleteProfile(profile.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<DeleteOutlined />} size="small" danger loading={deleting}>
                  Delete
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta title={profile.profileName} description={profile.address ?? 'No address'} />
          </List.Item>
        )}
      />

      <ProfileFormModal
        open={modalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        profile={editingProfile}
      />
    </Card>
  );
};

export default ProfileList;
