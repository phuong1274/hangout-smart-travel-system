import { Col, Row, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { UserInfoCard, ProfileList } from '@/features/users';
import { ChangePasswordForm } from '@/features/users';
import { useAuthStore } from '@/stores/auth.store';

const { Title } = Typography;

export const ProfilePage = () => {
  const { t } = useTranslation('profile');
  const { user } = useAuthStore();

  return (
    <div>
      <Title level={2}>{t('title')}</Title>

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
