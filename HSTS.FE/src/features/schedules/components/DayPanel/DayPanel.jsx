import React from 'react';
import { Progress, Typography, Timeline, Button } from 'antd';
import { PlusCircleOutlined, CarOutlined, RocketOutlined, ArrowDownOutlined } from '@ant-design/icons';
import TimelineCard from '../TimelineCard/TimelineCard';
import TransportCard from '../TransportCard/TransportCard'; 

const { Text } = Typography;

const formatVND = (val) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)} VND`;

const DayPanel = ({ dayData }) => {
  const { dailyBudget, estimatedDayCost, timeline, weatherSummary, travelLegs, groupSize } = dayData;
  
  const budgetPercent = (estimatedDayCost / dailyBudget) * 100;
  const isOverBudget = estimatedDayCost > dailyBudget;

  const processTimeline = (items) => {
    const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    return sorted.reduce((acc, item) => {
      let block = 'Others';
      if (item.startTime) {
        const hour = parseInt(item.startTime.split(':')[0], 10);
        if (hour < 12) block = 'Morning';
        else if (hour < 18) block = 'Afternoon';
        else block = 'Evening';
      }
      if (!acc[block]) acc[block] = [];
      acc[block].push(item);
      return acc;
    }, {});
  };

  const groupedTimeline = processTimeline(timeline);

  const AddLocationButton = () => (
    <div style={{ paddingLeft: 8 }}>
      <Button 
        type="text" 
        size="small" 
        icon={<PlusCircleOutlined style={{ fontSize: 12 }} />} 
        style={{ 
          fontSize: 12, 
          color: '#94A3B8', 
          height: '24px', 
          display: 'flex', 
          alignItems: 'center',
          padding: '0 8px'
        }}
      >
        Add location
      </Button>
    </div>
  );

  return (
    <div>
      {weatherSummary && (
        <div style={{ marginBottom: 16, fontStyle: 'italic', color: '#555' }}>
           {weatherSummary}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text>Day {dayData.dayNumber} spending</Text>
          <Text style={{color: isOverBudget ? '#FF6B6B' : '#1A535C', fontWeight: 'bold'}}>
            {budgetPercent.toFixed(0)}%
          </Text>
        </div>
        <Progress 
          percent={Math.min(budgetPercent, 100)} 
          showInfo={false} 
          strokeColor={isOverBudget ? '#FF6B6B' : '#FFE66D'} 
          trailColor="#E2E8F0"
          strokeWidth={8}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{fontSize: 12, color: '#666'}}>Estimated: {formatVND(estimatedDayCost)}</Text>
          <Text style={{fontSize: 12, color: '#666'}}>Limit: {formatVND(dailyBudget)}</Text>
        </div>
      </div>

      <div>
        {Object.keys(groupedTimeline).map((timeBlock) => (
          <div key={timeBlock} style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {timeBlock}
              </Text>
            </div>
            
            <Timeline style={{ marginLeft: 8 }}>
              {groupedTimeline[timeBlock].map((event) => {
                const globalIdx = timeline.findIndex(t => t === event);
                const currentLeg = travelLegs && travelLegs.length > globalIdx ? travelLegs[globalIdx] : null;
                const isIntercityTransfer = event.eventType && event.eventType.includes('transfer');

                const getLegDot = (legInfo) => {
                  if (!legInfo) return <ArrowDownOutlined />;
                  const lowerName = (legInfo.transportDetail?.name || legInfo.selectedMethod || "").toLowerCase();
                  if (lowerName.includes('plane') || lowerName.includes('flight')) {
                    return <RocketOutlined style={{ fontSize: 14, color: '#059669' }} />;
                  }
                  return <CarOutlined style={{ fontSize: 14, color: '#059669' }} />;
                };

                return (
                  <React.Fragment key={globalIdx}>
                    {isIntercityTransfer ? (
                      <>
                        <Timeline.Item>
                          <TimelineCard event={event} />
                        </Timeline.Item>
                        {currentLeg && (
                          <Timeline.Item color="green" dot={getLegDot(currentLeg)}>
                            <TransportCard leg={currentLeg} groupSize={groupSize || 1} />
                          </Timeline.Item>
                        )}
                        {event.eventType !== 'return-transfer' && (
                          <Timeline.Item dot={<PlusCircleOutlined style={{ fontSize: 12, color: '#CBD5E0' }} />}>
                            <AddLocationButton />
                          </Timeline.Item>
                        )}
                      </>
                    ) : (
                      <>
                        {currentLeg && (
                          <Timeline.Item color="green" dot={getLegDot(currentLeg)}>
                            <TransportCard leg={currentLeg} groupSize={groupSize || 1} />
                          </Timeline.Item>
                        )}
                        <Timeline.Item>
                          <TimelineCard event={event} />
                        </Timeline.Item>
                        <Timeline.Item dot={<PlusCircleOutlined style={{ fontSize: 12, color: '#CBD5E0' }} />}>
                          <AddLocationButton />
                        </Timeline.Item>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </Timeline>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DayPanel;