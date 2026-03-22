import React from 'react';
import { Progress, Typography, Timeline, Button } from 'antd';
import { PlusCircleOutlined, CaretRightOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import TimelineCard from '../TimelineCard/TimelineCard';
import styles from '../../styles/DayPanel.module.css';

const { Text } = Typography;

const DayPanel = ({ dayData }) => {
  const { dailyBudgetStatus, timeline } = dayData;
  const budgetPercent = (dailyBudgetStatus.spent / dailyBudgetStatus.ceiling) * 100;
  const isOverBudget = dailyBudgetStatus.spent > dailyBudgetStatus.ceiling;

  const processTimeline = (items) => {
    const sorted = [...items].sort((a, b) => {
      const timeA = a.time ? a.time.split(' - ')[0].trim() : '00:00';
      const timeB = b.time ? b.time.split(' - ')[0].trim() : '00:00';
      return timeA.localeCompare(timeB);
    });

    return sorted.reduce((acc, item) => {
      let block = item.timeBlock;
      
      if (block === 'Free Time' && item.time) {
        const startHour = parseInt(item.time.split(':')[0], 10);
        if (startHour < 12) block = 'Morning';
        else if (startHour < 18) block = 'Afternoon';
        else if (startHour < 22) block = 'Evening';
        else block = 'Night Rest';
      }

      if (!block) return acc;
      if (!acc[block]) acc[block] = [];
      acc[block].push(item);
      return acc;
    }, {});
  };

  const groupedTimeline = processTimeline(timeline);

  return (
    <div className={styles.dayPanelContent}>
      <div className={isOverBudget ? styles.dailyBudgetOver : styles.dailyBudget}>
        <div className={styles.budgetInfo}>
          <Text type={isOverBudget ? "danger" : "success"} strong>
            {isOverBudget ? <CloseCircleFilled /> : <CheckCircleFilled />} 
            {isOverBudget ? ' Over Budget!' : ' Daily Budget On Track'}
          </Text>
          <Text type="secondary">{budgetPercent.toFixed(0)}% of ceiling</Text>
        </div>
        <Progress 
          percent={Math.min(budgetPercent, 100)} 
          showInfo={false} 
          strokeColor={isOverBudget ? "#ff4d4f" : "#52c41a"} 
        />
        <div className={styles.budgetLabels}>
          <Text type="secondary" style={{fontSize: 12}}>Spent: {(dailyBudgetStatus.spent / 1000000).toFixed(1)}M</Text>
          <Text type="secondary" style={{fontSize: 12}}>Ceiling: {(dailyBudgetStatus.ceiling / 1000000).toFixed(1)}M</Text>
        </div>
      </div>

      <div className={styles.timelineContainer}>
        {Object.keys(groupedTimeline).map((timeBlock) => (
          <div key={timeBlock} className={styles.timeBlockGroup}>
            <div className={styles.timeBlockHeader}>
              <CaretRightOutlined className={styles.headerIcon} />
              <Text strong className={styles.timeBlockTitle}>{timeBlock}</Text>
            </div>
            
            <Timeline className={styles.antTimelineCustom}>
              {groupedTimeline[timeBlock].map((event, idx) => (
                <Timeline.Item 
                  key={idx} 
                  dot={<div className={styles.timelineDot} />}
                  className={styles.timelineItem}
                >
                  <TimelineCard event={event} />
                  
                  {event.type !== 'Transport' && (
                    <div className={styles.addLocationWrapper}>
                      <Button type="text" size="small" icon={<PlusCircleOutlined />} className={styles.addBtnText}>
                        ADD LOCATION
                      </Button>
                    </div>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayPanel;