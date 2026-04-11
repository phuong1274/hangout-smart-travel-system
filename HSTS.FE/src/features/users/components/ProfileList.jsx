import { Button, Card, Empty, List, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useMyProfiles, useDeleteProfile } from '../hooks/useUserProfile';
import ProfileFormModal from './ProfileFormModal';
import styles from '../styles/ProfileList.module.css';

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
    <div className={styles.listContainer}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <Title level={3} className={styles.heading}>Travel Profiles</Title>
          <Button type="primary" onClick={handleCreate} size="large">
            New Profile
          </Button>
        </div>

        <List
          loading={loading}
          dataSource={profiles}
          locale={{ emptyText: <Empty description="No profiles yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          renderItem={(profile, index) => (
            <List.Item
              className={styles.listItem}
              style={{ animationDelay: `${index * 0.1}s` }}
              actions={[
                <Button key="edit" icon={<EditOutlined />} size="large" onClick={() => handleEdit(profile)} type="text" style={{ color: '#4ECDC4', fontWeight: 600 }}>
                  Edit
                </Button>,
                <Popconfirm
                  key="delete"
                  title="Delete this profile?"
                  onConfirm={() => deleteProfile(profile.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button icon={<DeleteOutlined />} size="large" danger loading={deleting} type="text">
                    Delete
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta 
                title={<span className={styles.listTitle}>{profile.profileName}</span>} 
                description={<span className={styles.listDesc}>{profile.address ?? 'No address'}</span>} 
              />
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
    </div>
  );
};

export default ProfileList;