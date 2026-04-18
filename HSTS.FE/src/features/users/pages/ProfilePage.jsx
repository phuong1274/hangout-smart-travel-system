import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import ProfileHeader from '../components/ProfileHeader';
import UserInfoCard from '../components/UserInfoCard';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { useMyInfo } from '../hooks/useUserProfile';
import styles from '../styles/ProfilePage.module.css';

const { Title } = Typography;

const ProfilePage = () => {
  const { data: myInfo, loading, refetch } = useMyInfo();
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    {
      key: 'personal',
      label: 'Personal Info',
      children: <UserInfoCard user={myInfo} loading={loading} refetch={refetch} />,
    },
    ...(myInfo?.hasPassword
      ? [{
          key: 'security',
          label: 'Security',
          children: <ChangePasswordForm />,
        }]
      : []),
  ];

  return (
    <div className={styles.container}>
      <div className={styles.fadeUpSection}>
        <Title level={1} className={styles.headingMain}>My Profile</Title>
      </div>
      <div className={styles.fadeUpSection}>
        <ProfileHeader user={myInfo} onAvatarUploaded={refetch} />
      </div>
      <div className={styles.fadeUpSection}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          size="large"
          animated={{ inkBar: true, tabPane: true }}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
