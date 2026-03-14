import { useRef, useState } from 'react';
import { Avatar, Button, Card, Tag, Typography, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useUploadAvatar } from '../hooks/useUserProfile';

const { Title, Text } = Typography;

const ROLE_COLORS = {
  ADMIN: 'red',
  CONTENT_MODERATOR: 'orange',
  PARTNER: 'blue',
  TRAVELER: 'green',
};

const ProfileHeader = ({ user, onAvatarUploaded }) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const { uploadAvatar, loading } = useUploadAvatar(() => {
    setPreviewUrl(null);
    setPendingFile(null);
    onAvatarUploaded?.();
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('Only image files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('File size must not exceed 5 MB.');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSaveAvatar = () => {
    if (pendingFile) uploadAvatar(pendingFile);
  };

  const displayUrl = previewUrl ?? user?.avatarUrl ?? null;
  const initials = user?.fullName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Avatar + upload controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
            <Avatar
              size={80}
              src={displayUrl}
              style={{ backgroundColor: '#1677ff', fontSize: 28 }}
            >
              {!displayUrl && initials}
            </Avatar>
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: '#fff', border: '1px solid #d9d9d9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CameraOutlined style={{ fontSize: 12, color: '#595959' }} />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {pendingFile && (
            <Button size="small" type="primary" loading={loading} onClick={handleSaveAvatar}>
              Save Avatar
            </Button>
          )}
        </div>

        {/* User info */}
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ margin: 0 }}>{user?.fullName}</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>{user?.email}</Text>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {user?.roles?.map((role) => (
              <Tag key={role} color={ROLE_COLORS[role] ?? 'default'}>
                {role}
              </Tag>
            ))}
          </div>
          {user?.bio && (
            <Text italic type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
              {user.bio}
            </Text>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProfileHeader;
