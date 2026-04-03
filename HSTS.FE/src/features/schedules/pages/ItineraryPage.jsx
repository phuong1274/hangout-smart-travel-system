import React from 'react';
import { Collapse, Typography, Progress, Button, Spin } from 'antd';
import DayPanel from '../components/DayPanel/DayPanel';
import { useTripItinerary } from '../hooks/useTripItinerary';
import rawData from '../mock/algorithmOutput.json';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const formatVND = (val) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)} VND`;

const ItineraryPage = () => {
  const { data: trip, isLoading, error } = useTripItinerary(rawData);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Crafting your amazing itinerary..." />
      </div>
    );
  }

  if (error || !trip) {
    return <div style={{ textAlign: 'center', marginTop: 50 }}>Failed to load data: {error}</div>;
  }

  const estimateAmount = trip.budgetSummary.estimatedTotalCost.baseAmount;
  const budgetLimit = trip.budgetSummary.usableBudget.baseAmount; 
  const percent = (estimateAmount / budgetLimit) * 100;
  const isOverEstimate = estimateAmount > budgetLimit;
  const overAmount = estimateAmount - budgetLimit;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {trip.days.length} Days: {trip.provinceName || "Discovery"}
          </Title>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Group of {trip.groupSize} people
            </Text>
          </div>
          <div style={{ marginTop: 2 }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {trip.startDate} — {trip.endDate}
            </Text>
          </div>
        </div>
        <Button type="primary" size="large">
          Save Itinerary
        </Button>
      </div>

      <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '12px', marginBottom: 24 }}>
        <Text strong style={{ fontSize: 14, color: '#64748B', letterSpacing: '1px' }}>
          ESTIMATED BUDGET (VND)
        </Text>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>ESTIMATED COST</Text>
            <Text strong style={{ color: isOverEstimate ? '#FF6B6B' : '#0F766E', fontSize: 20 }}>
              {formatVND(estimateAmount)}
            </Text>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>USABLE BUDGET</Text>
            <Text strong style={{ fontSize: 20, color: '#334155' }}>
              {formatVND(budgetLimit)}
            </Text>
          </div>
        </div>

        <Progress 
          percent={Math.min(percent, 100)} 
          showInfo={false} 
          strokeColor={isOverEstimate ? "#FF6B6B" : "#2DD4BF"} 
          trailColor="#E2E8F0"
          strokeWidth={12}
          style={{ margin: 0 }}
        />
        
        {isOverEstimate && (
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <Text style={{ color: '#FF6B6B', fontSize: 13 }}>
              Over budget by {formatVND(overAmount)}
            </Text>
          </div>
        )}
      </div>

      <Collapse 
        defaultActiveKey={trip.days.map(day => day.dayNumber.toString())} 
        expandIconPosition="end"
        ghost
        style={{ background: '#fff' }}
      >
        {trip.days.map((day) => (
          <Panel 
            header={
              <Text strong style={{ fontSize: 16 }}>
                Day {day.dayNumber}: {day.provinceDetail?.name || day.provinceName || "Destination"} ({day.date})
              </Text>
            } 
            key={day.dayNumber.toString()}
            style={{ background: '#fff', borderRadius: 8, marginBottom: 16, border: '1px solid #E2E8F0' }}
          >
            <DayPanel dayData={day} />
          </Panel>
        ))}
      </Collapse>
    </div>
  );
};

export default ItineraryPage;