import { useRef, useState } from 'react';
import { Avatar, Button, Card, Tag, Typography, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useUploadAvatar } from '../hooks/useUserProfile';
import styles from '../styles/ProfileHeader.module.css';

const { Title, Text } = Typography;

const ROLE_COLORS = {
  ADMIN: '#FF6B6B',
  CONTENT_MODERATOR: '#FFE66D',
  PARTNER: '#4ECDC4',
  TRAVELER: '#1A535C',
};

const ProfileHeader = ({ user, onAvatarUploaded }) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const { uploadAvatar, loading } = useUploadAvatar(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
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

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    e.target.value = '';
  };

  const handleSaveAvatar = () => {
    if (pendingFile) uploadAvatar(pendingFile);
  };

  const displayUrl = previewUrl ?? user?.avatarUrl ?? null;
  const initials = user?.fullName?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <div className={styles.headerContainer}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div 
              style={{ position: 'relative', cursor: 'pointer' }} 
              onClick={() => fileInputRef.current?.click()}
              className={styles.popIcon}
            >
              <Avatar
                size={100}
                src={displayUrl}
                style={{ backgroundColor: '#4ECDC4', fontSize: 36, fontWeight: 700 }}
                className={styles.ambientFloating}
              >
                {!displayUrl && initials}
              </Avatar>
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 32, height: 32, borderRadius: '50%',
                background: '#FFE66D', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 230, 109, 0.5)'
              }}>
                <CameraOutlined style={{ fontSize: 16, color: '#1A535C' }} />
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
              <Button size="middle" type="primary" loading={loading} onClick={handleSaveAvatar}>
                Save Avatar
              </Button>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <Title level={2} className={styles.heading}>{user?.fullName}</Title>
            <Text style={{ fontSize: 15, color: '#4ECDC4', fontWeight: 500 }}>{user?.email}</Text>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {user?.roles?.map((role) => (
                <Tag key={role} color={ROLE_COLORS[role] ?? '#4ECDC4'}>
                  {role.replace('_', ' ')}
                </Tag>
              ))}
            </div>
            {user?.bio && (
              <Text style={{ display: 'block', marginTop: 16, fontSize: 15, lineHeight: 1.6, color: '#1A535C' }}>
                {user.bio}
              </Text>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfileHeader;