import React from 'react';
import { Typography, Collapse, Space, Radio, Tag } from 'antd';
import { 
  CarOutlined, 
  RocketOutlined, 
  ClockCircleOutlined, 
  SwapRightOutlined, 
  TeamOutlined 
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

const formatVND = (val) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)} VND`;

const formatDuration = (val) => {
  if (!val) return "";
  if (typeof val === 'number') {
    const h = Math.floor(val / 60);
    const m = val % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return val;
};

const TransportCard = ({ leg }) => {
  if (!leg) return null;

  const methodName = leg.transportDetail?.name || leg.selectedMethod || "Transportation";
  const options = leg.transportOptions || [];

  const selectedOption = options.find(opt => 
    (opt.transportDetail?.name || opt.method || opt.selectedMethod) === methodName
  ) || {};

  const totalCost = leg.costForGroup || selectedOption.costForGroup || leg.cost || 0;
  const duration = leg.duration || selectedOption.duration || selectedOption.estimatedDuration;
  const fromHub = selectedOption.fromHubDetail?.name || leg.fromTransitHubName;
  const toHub = selectedOption.toHubDetail?.name || leg.toTransitHubName;
  const vehiclesNeeded = leg.vehiclesNeeded || selectedOption.vehiclesNeeded;

  const getIcon = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('plane') || lowerName.includes('flight')) return <RocketOutlined style={{ color: '#059669' }} />;
    return <CarOutlined style={{ color: '#059669' }} />;
  };

  const renderPrice = (total) => {
    if (total <= 0) return <Text type="secondary">Free</Text>;
    return (
      <Text strong style={{ color: '#047857', fontSize: 14 }}>
        {formatVND(total)}
      </Text>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ width: 96, flexShrink: 0 }}></div>

      <div style={{ flexGrow: 1 }}>
        <Collapse 
          ghost 
          expandIconPosition="end"
          style={{ background: '#F0FDF4', border: '1px dashed #A7F3D0', borderRadius: 8, overflow: 'hidden' }}
        >
          <Panel 
            key="1" 
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  {getIcon(methodName)}
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Space>
                      <Text strong style={{ color: '#065F46', fontSize: 14 }}>{methodName}</Text>
                      {vehiclesNeeded > 0 && !methodName.toLowerCase().includes('plane') && (
                        <Tag icon={<TeamOutlined />} color="cyan" style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>
                          Need {vehiclesNeeded}
                        </Tag>
                      )}
                    </Space>
                    
                    {(duration || (fromHub && toHub)) && (
                      <Space style={{ marginTop: 2, fontSize: 12, color: '#047857' }} split={<Text style={{ color: '#6EE7B7' }}>•</Text>}>
                        {duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ClockCircleOutlined /> {formatDuration(duration)}
                          </span>
                        )}
                        {fromHub && toHub && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {fromHub} <SwapRightOutlined /> {toHub}
                          </span>
                        )}
                      </Space>
                    )}
                  </div>

                  {renderPrice(totalCost)}
                </div>
              </div>
            }
          >
            <div style={{ paddingTop: 12, borderTop: '1px solid #D1FAE5', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Available Alternatives</Text>
              
              {options.map((opt, idx) => {
                const optName = opt.transportDetail?.name || opt.method || opt.selectedMethod;
                const optTotalCost = opt.costForGroup || opt.cost || 0;
                const optDuration = opt.duration || opt.estimatedDuration;
                const isRecommended = optName === methodName;

                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 12px', borderRadius: 6, border: isRecommended ? '1px solid #34D399' : '1px solid #E5E7EB', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Space>
                        <Text strong={isRecommended}>{optName}</Text>
                        {isRecommended && <Tag color="success" style={{ fontSize: 10 }}>Recommended</Tag>}
                      </Space>
                      {optDuration && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          <ClockCircleOutlined /> {formatDuration(optDuration)}
                        </Text>
                      )}
                    </div>
                    
                    <Space size="large">
                      {renderPrice(optTotalCost)}
                      <Radio checked={isRecommended} />
                    </Space>
                  </div>
                );
              })}
            </div>
          </Panel>
        </Collapse>
      </div>
      <div style={{ marginLeft: 16, width: 32 }}></div>
    </div>
  );
};

export default TransportCard;