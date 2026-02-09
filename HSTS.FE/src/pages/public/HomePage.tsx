import { Button, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/config/constants';

const { Title, Paragraph } = Typography;

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <Title>{APP_NAME}</Title>
      <Paragraph style={{ fontSize: 18, color: '#666' }}>
        Smart travel planning and scheduling system
      </Paragraph>
      <Space size="large" style={{ marginTop: 32 }}>
        <Button type="primary" size="large" onClick={() => navigate('/register')}>
          Get Started
        </Button>
        <Button size="large" onClick={() => navigate('/destinations')}>
          Explore Destinations
        </Button>
      </Space>
    </div>
  );
};
