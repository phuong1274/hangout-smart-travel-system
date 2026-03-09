import React from 'react';
import { Space, Typography, Skeleton, Row, Col, Card, Statistic } from 'antd';
import { RocketOutlined, ScheduleOutlined, TeamOutlined } from '@ant-design/icons';
import HomeHero from '../components/HomeHero';
import { useHomeStats } from '../hooks/useHomeStats';
import styles from './HomePage.module.css';

const { Title } = Typography;

const HomePage = () => {
  const { data, isLoading } = useHomeStats();

  return (
    <div className={styles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <HomeHero />
        
        <div className={styles.statsSection}>
          <Title level={3}>System Overview</Title>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card hoverable>
                  <Statistic 
                    title="Active Schedules" 
                    value={data?.activeSchedules || 0} 
                    prefix={<ScheduleOutlined />} 
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card hoverable>
                  <Statistic 
                    title="Total Destinations" 
                    value={data?.totalDestinations || 0} 
                    prefix={<RocketOutlined />} 
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card hoverable>
                  <Statistic 
                    title="System Users" 
                    value={data?.totalUsers || 0} 
                    prefix={<TeamOutlined />} 
                  />
                </Card>
              </Col>
            </Row>
          )}
        </div>
      </Space>
    </div>
  );
};

export default HomePage;
