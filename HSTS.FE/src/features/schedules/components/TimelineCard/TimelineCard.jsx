import React, { useState } from 'react';
import { Card, Typography, Tag, Button, Collapse, Radio, Space } from 'antd';
import { 
  HomeOutlined, 
  CarOutlined, 
  EnvironmentOutlined,
  StarFilled,
  WarningOutlined,
  DeleteOutlined,
  CoffeeOutlined
} from '@ant-design/icons';
import AccommodationModal from './AccommodationModal';
import styles from '../../styles/TimelineCard.module.css';

const { Text } = Typography;
const { Panel } = Collapse;

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const TimelineCard = ({ event }) => {
  const [selectedTransport, setSelectedTransport] = useState(event.selectedTransportIndex || 0);
  const [isAccmModalVisible, setIsAccmModalVisible] = useState(false);
  
  const [activeHotel, setActiveHotel] = useState({ 
    isAlternative: false, 
    altIndex: null 
  });
  const [activeRoomIdx, setActiveRoomIdx] = useState(event.selectedAccommodationIndex || 0);

  const getEventConfig = (type) => {
    switch(type) {
      case 'CheckIn':
      case 'Accommodation':
      case 'CheckOut':
        return { icon: <HomeOutlined />, color: '#faad14', bg: '#fffbe6' };
      case 'Transport':
        return { icon: <CarOutlined />, color: '#1890ff', bg: '#e6f7ff' };
      case 'Rest':
        return { icon: <CoffeeOutlined />, color: '#722ed1', bg: '#f9f0ff' };
      case 'Visit':
      default:
        return { icon: <EnvironmentOutlined />, color: '#52c41a', bg: '#f6ffed' };
    }
  };

  const config = getEventConfig(event.type);
  const isTransport = event.type === 'Transport';
  const isAccommodation = event.type === 'Accommodation' || event.type === 'CheckIn';
  const hasTransportOptions = isTransport && event.transportOptions && event.transportOptions.length > 0;
  const currentTransport = hasTransportOptions ? event.transportOptions[selectedTransport] : null;

  const baseHotelNameMatch = event.description?.match(/(?:Hotel Check-in: |Accommodation: )([^|]+)/);
  const baseHotelName = baseHotelNameMatch ? baseHotelNameMatch[1].trim() : 'Original Hotel';

  let accmTitle = event.description ? event.description.split(' | ')[0] : '';
  if (isAccommodation && activeHotel.isAlternative && event.alternativeAccommodations?.[activeHotel.altIndex]) {
    accmTitle = `${event.type === 'CheckIn' ? 'Hotel Check-in: ' : 'Accommodation: '} ${event.alternativeAccommodations[activeHotel.altIndex].name}`;
  }

  const currentRooms = activeHotel.isAlternative 
    ? event.alternativeAccommodations?.[activeHotel.altIndex]?.options 
    : event.accommodationOptions;

  let accmCost = event.cost;
  if (isAccommodation && currentRooms?.[activeRoomIdx]) {
    accmCost = currentRooms[activeRoomIdx].totalCost;
  }

  const mainTitle = isTransport && hasTransportOptions ? currentTransport.description : accmTitle;
  const displayCost = isTransport && hasTransportOptions ? currentTransport.totalCost : accmCost;
  const displayMethod = hasTransportOptions ? currentTransport.method : (event.transportOptions?.[0]?.method || 'Taxi');

  const cardHeaderContent = (
    <div className={styles.cardHeader}>
      <div className={styles.titleArea}>
        <div 
          className={styles.iconBox} 
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {config.icon}
        </div>
        <div className={styles.titleContent}>
          <Text strong className={styles.mainTitle}>{mainTitle}</Text>
          
          {event.type === 'Visit' && (
            <div className={styles.rating}>
              <StarFilled style={{ color: '#fadb14', fontSize: 12, marginRight: 4 }} />
              <Text style={{ fontSize: 12 }}>4.5 (1,248 Reviews)</Text>
            </div>
          )}
          
          {event.type === 'CheckIn' && (
            <Tag color="warning" icon={<WarningOutlined />} className={styles.customTag}>
              Early arrival: Check-in at {event.checkInTime || '14:00'}
            </Tag>
          )}

          {isTransport && (
            <Tag color="blue" className={styles.customTag}>
              Booked externally: {displayMethod}
            </Tag>
          )}
        </div>
      </div>
      
      <div className={styles.rightArea}>
        {(event.type === 'Visit' || event.type === 'Accommodation' || event.type === 'CheckIn') && (
          <div className={styles.imagePlaceholder}></div>
        )}
        
        {displayCost > 0 && (
          <Text strong className={styles.costText}>{formatVND(displayCost)}</Text>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.cardOuterWrapper}>
        <div className={styles.cardContainer}>
          <div className={styles.timeCol}>
            <Text type="secondary" className={styles.timeText}>{event.time}</Text>
          </div>
          
          <Card 
            className={`${styles.eventCard} ${isTransport ? styles.transportCard : ''}`} 
            bodyStyle={{ padding: isTransport ? '6px 16px' : '12px 16px' }}
          >
            {hasTransportOptions && event.transportOptions.length > 1 ? (
              <Collapse ghost expandIconPosition="end" className={styles.transportCollapse}>
                <Panel header={cardHeaderContent} key="1">
                  <Radio.Group 
                    onChange={(e) => setSelectedTransport(e.target.value)} 
                    value={selectedTransport} 
                    className={styles.radioGroup}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {event.transportOptions.map((opt, idx) => (
                        <Radio value={idx} key={idx} className={styles.radioItem}>
                          <div className={styles.optionDetails}>
                            <div className={styles.optionTextInfo}>
                              <Text strong>{opt.method}</Text>
                              {opt.recommended && <Tag color="success" className={styles.recTag}>Recommended</Tag>}
                              <div className={styles.subInfo}>
                                <Text type="secondary" style={{fontSize: 12}}>
                                  ⏱ {Math.round(opt.travelTimeMinutes)} mins • {opt.pros}
                                </Text>
                              </div>
                            </div>
                            <Text strong className={styles.optionCost}>
                              {opt.totalCost === 0 ? 'Free' : formatVND(opt.totalCost)}
                            </Text>
                          </div>
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </Panel>
              </Collapse>
            ) : (
              <>
                {cardHeaderContent}
                {isAccommodation && (event.accommodationOptions || event.alternativeAccommodations) && (
                  <div className={styles.accmActionBtn}>
                    <Button block onClick={() => setIsAccmModalVisible(true)}>
                      View Room Options & Change Hotel
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {!isTransport && (
          <div className={styles.deleteAction}>
            <Button type="text" danger icon={<DeleteOutlined />} shape="circle" />
          </div>
        )}
      </div>

      <AccommodationModal 
        visible={isAccmModalVisible}
        onClose={() => setIsAccmModalVisible(false)}
        event={event}
        activeHotel={activeHotel}
        setActiveHotel={setActiveHotel}
        activeRoomIdx={activeRoomIdx}
        setActiveRoomIdx={setActiveRoomIdx}
        baseHotelName={baseHotelName}
        currentRooms={currentRooms}
        accmTitle={accmTitle}
      />
    </>
  );
};

export default TimelineCard;