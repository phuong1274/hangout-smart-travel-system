import { Col, Row, Typography } from 'antd';
import UserInfoCard from '../components/UserInfoCard';
import ProfileList from '../components/ProfileList';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { useAuthStore } from '@/store/authStore';

const { Title } = Typography;

const ProfilePage = () => {
  const { user } = useAuthStore();

  return (
    <div>
      <Title level={2}>My Profile</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <UserInfoCard />
        </Col>
        <Col xs={24} lg={12}>
          <ProfileList />
        </Col>
        {user?.hasPassword && (
          <Col xs={24} lg={12}>
            <ChangePasswordForm />
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ProfilePage;
