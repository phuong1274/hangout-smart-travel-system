import { Button, Card, Empty, List, Popconfirm, Space, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyProfiles, useDeleteProfile } from '../api/users.query';
import { ProfileFormModal } from './ProfileFormModal';
import type { ProfileDto } from '../types/users.type';

const { Title, Text } = Typography;

export const ProfileList = () => {
  const { data: profiles, isLoading } = useMyProfiles();
  const deleteMutation = useDeleteProfile();
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileDto | null>(null);

  const handleCreate = () => {
    setEditingProfile(null);
    setModalOpen(true);
  };

  const handleEdit = (profile: ProfileDto) => {
    setEditingProfile(profile);
    setModalOpen(true);
  };

  const handleDelete = (profileId: number) => {
    deleteMutation.mutate(profileId);
  };

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {t('profiles.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('profiles.create')}
        </Button>
      </div>

      <List
        loading={isLoading}
        dataSource={profiles ?? []}
        locale={{ emptyText: <Empty description={t('profiles.empty')} /> }}
        renderItem={(profile) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(profile)}
              />,
              <Popconfirm
                key="delete"
                title={t('profiles.deleteConfirm')}
                onConfirm={() => handleDelete(profile.id)}
                okText={tCommon('action.confirm')}
                cancelText={tCommon('action.cancel')}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={profile.profileName}
              description={
                <Space direction="vertical" size={0}>
                  {profile.address && <Text type="secondary">{profile.address}</Text>}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      <ProfileFormModal
        open={modalOpen}
        profile={editingProfile}
        onClose={() => setModalOpen(false)}
      />
    </Card>
  );
};
