import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import ProfileHeader from '../components/ProfileHeader';
import UserInfoCard from '../components/UserInfoCard';
import ProfileList from '../components/ProfileList';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { useMyInfo } from '../hooks/useUserProfile';

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
    {
      key: 'profiles',
      label: 'Travel Profiles',
      children: <ProfileList />,
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
    <div>
      <Title level={2}>My Profile</Title>
      <ProfileHeader user={myInfo} onAvatarUploaded={refetch} />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabs}
      />
    </div>
  );
};

export default ProfilePage;
