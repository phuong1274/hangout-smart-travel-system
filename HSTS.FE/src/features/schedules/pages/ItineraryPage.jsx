import React from 'react';
import { Collapse, Typography, Progress, Button } from 'antd';
import tripData from '../assets/data.json';
import DayPanel from '../components/DayPanel/DayPanel';
import styles from '../styles/ItineraryPage.module.css';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const ItineraryPage = () => {
  const { days, tripSummary } = tripData;

  const estimateAmount = tripSummary.totalEstimatedCost;
  const spentAmount = tripSummary.minimumRecommendedBudget;
  const percent = (spentAmount / estimateAmount) * 100;
  const isOverEstimate = spentAmount > estimateAmount;
  const overAmount = spentAmount - estimateAmount;

  return (
    <div className={styles.container}>
      <div className={styles.saveActionWrapper}>
        <Button 
          type="primary" 
          size="large" 
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
          <div className={styles.budgetHeader}>
            <div className={styles.statBlock}>
              <Text className={styles.statLabel}>ACTUAL SPENT</Text>
              <Text className={styles.statSpent} style={{ color: isOverEstimate ? '#DC2626' : '#1A1A1A' }}>
                {formatVND(spentAmount)}
              </Text>
            </div>
            <div className={styles.statBlockRight}>
              <Text className={styles.statLabel}>ESTIMATED COST</Text>
              <Text className={styles.statEstimate}>{formatVND(estimateAmount)}</Text>
            </div>
          </div>

          <Progress 
            percent={Math.min(percent, 100)} 
            showInfo={false} 
            strokeColor={isOverEstimate ? "#DC2626" : "#1A1A1A"} 
            trailColor="#EAECEC"
            size="small"
            style={{ margin: 0 }}
          />

          {isOverEstimate && (
            <div className={styles.overBudgetLabel}>
              Over estimate by {formatVND(overAmount)}
            </div>
          )}
        </div>
      </div>

      <Collapse 
        defaultActiveKey={days.map(day => day.day)} 
        expandIconPosition="end"
        className={styles.collapseContainer}
        ghost
      >
        {days.map((day) => (
          <Panel 
            header={<Text className={styles.panelHeader}>{day.day}</Text>} 
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