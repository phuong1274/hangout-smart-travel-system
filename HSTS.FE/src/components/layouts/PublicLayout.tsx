import { Layout, Button, Space } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { CurrencySwitcher } from '@/components/common/CurrencySwitcher';

const { Header, Content, Footer } = Layout;

export const PublicLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{ fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          {t('appName')}
        </div>
        <Space>
          <LanguageSwitcher />
          <CurrencySwitcher />
          {isAuthenticated ? (
            <Button type="primary" onClick={() => navigate('/trips')}>
              {t('nav.myTrips')}
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/login')}>{t('nav.signIn')}</Button>
              <Button type="primary" onClick={() => navigate('/register')}>
                {t('nav.signUp')}
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Content style={{ padding: '24px 48px' }}>
        <Outlet />
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        {t('appName')} &copy; {new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};
