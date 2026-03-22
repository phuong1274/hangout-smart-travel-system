import React from 'react';
import { Collapse, Typography, Progress, Button } from 'antd'; // Thêm Button
import { EnvironmentOutlined, CheckCircleFilled, SaveOutlined } from '@ant-design/icons'; // Thêm SaveOutlined
import tripData from '../assets/data.json';
import DayPanel from '../components/DayPanel/DayPanel';
import styles from '../styles/ItineraryPage.module.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const ItineraryPage = () => {
  const { days, tripSummary } = tripData;

  return (
    <div className={styles.container}>
      {/* Nút Save cố định */}
      <div className={styles.saveActionWrapper}>
        <Button 
          type="primary" 
          size="large" 
          icon={<SaveOutlined />} 
          className={styles.floatingSaveBtn}
        >
          Save Trip
        </Button>
      </div>

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Title level={3} className={styles.title}>10 Days Trip: Hanoi ➝ Da Nang ➝ HCMC</Title>
          <Text type="secondary">Upcoming • Updated Yesterday</Text>
        </div>
        
        <div className={styles.budgetSummary}>
          <div className={styles.statBlock}>
            <Text type="secondary" className={styles.statLabel}>EST. SPENT</Text>
            <Text strong className={styles.statTotal}>{formatVND(tripSummary.totalEstimatedCost)}</Text>
          </div>
          
          <div className={styles.divider}></div>
          
          <div className={styles.statBlock}>
            <Text type="secondary" className={styles.statLabel}>BUDGET</Text>
            <Text type="secondary" className={styles.statRemaining}>~{formatVND(tripSummary.minimumRecommendedBudget)}</Text>
          </div>

          <Progress 
            type="circle" 
            percent={85} 
            size={40} 
            format={() => '85%'} 
            strokeColor="#52c41a"
            style={{ marginLeft: '8px' }}
          />
        </div>
      </div>

      <Collapse 
        defaultActiveKey={['Day 1 – Hanoi']} 
        expandIconPosition="end"
        className={styles.collapseContainer}
        ghost
      >
        {days.map((day) => (
          <Panel 
            header={<Text strong className={styles.panelHeader}>{day.day}</Text>} 
            key={day.day}
            className={styles.customPanel}
          >
            <DayPanel dayData={day} />
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};

export default ItineraryPage;