import { Button, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <Title>{t('appName')}</Title>
      <Paragraph style={{ fontSize: 18, color: '#666' }}>
        {t('home.subtitle')}
      </Paragraph>
      <Space size="large" style={{ marginTop: 32 }}>
        <Button type="primary" size="large" onClick={() => navigate('/register')}>
          {t('home.getStarted')}
        </Button>
        <Button size="large" onClick={() => navigate('/destinations')}>
          {t('home.exploreDestinations')}
        </Button>
      </Space>
    </div>
  );
};
