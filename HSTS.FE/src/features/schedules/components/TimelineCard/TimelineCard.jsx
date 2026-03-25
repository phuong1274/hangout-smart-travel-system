import React, { useState } from 'react';
import { Card, Typography, Tag, Button, Collapse, Radio, Space, Carousel, Image } from 'antd';
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
        return { icon: <HomeOutlined /> };
      case 'Transport':
        return { icon: <CarOutlined /> };
      case 'Rest':
        return { icon: <CoffeeOutlined /> };
      case 'Visit':
      default:
        return { icon: <EnvironmentOutlined /> };
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

  const ticketCost = event.ticketCost || 0;
  const extraCost = event.extraSpendingCost || 0;
  const photos = event.photos || [];

  const mainTitle = isTransport && hasTransportOptions ? currentTransport.description : accmTitle;
  
  let displayCost = 0;
  if (isTransport && hasTransportOptions) {
    displayCost = currentTransport.totalCost;
  } else if (isAccommodation) {
    displayCost = accmCost;
  } else if (event.type === 'Visit') {
    displayCost = ticketCost + extraCost;
  } else {
    displayCost = event.cost || 0;
  }
  
  const displayMethod = hasTransportOptions ? currentTransport.method : (event.transportOptions?.[0]?.method || 'Taxi');

  const cardHeaderContent = (
    <div className={styles.cardHeader}>
      <div className={styles.titleArea}>
        <div className={styles.iconBox}>
          {config.icon}
        </div>
        <div className={styles.titleContent}>
          <Text className={styles.mainTitle}>{mainTitle}</Text>
          
          {event.type === 'Visit' && (
            <div style={{ marginTop: 4 }}>
              <StarFilled style={{ color: '#B89D71', fontSize: 12, marginRight: 6 }} />
              <Text style={{ fontSize: 12, color: '#6B6B6B' }}>4.5 (1,248 Reviews)</Text>
            </div>
          )}
          
          {event.type === 'CheckIn' && (
            <Tag icon={<WarningOutlined />} className={styles.customTag}>
              Early arrival: Check-in at {event.checkInTime || '14:00'}
            </Tag>
          )}

          {isTransport && (
            <Tag className={styles.customTag}>
              Booked externally: {displayMethod}
            </Tag>
          )}

          {event.type === 'Visit' && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {event.ticketCost !== null && event.ticketCost !== undefined && (
                <span className={styles.customTag} style={{ marginTop: 0 }}>
                  TICKET: {event.ticketCost === 0 ? 'FREE' : formatVND(event.ticketCost)}
                </span>
              )}
              {extraCost > 0 && (
                <span className={styles.customTag} style={{ marginTop: 0 }}>
                  EXTRA: {formatVND(extraCost)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.rightArea}>
        {(event.type === 'Visit' || event.type === 'Accommodation' || event.type === 'CheckIn') && (
          photos && photos.length > 0 ? (
            <div className={styles.imageSliderContainer}>
              <Carousel autoplay dots={false} effect="fade">
                {photos.map((photo, index) => (
                  <div key={index}>
                    <Image 
                      src={photo} 
                      alt={`Location photo ${index + 1}`}
                      className={styles.sliderImage}
                      preview={false}
                    />
                  </div>
                ))}
              </Carousel>
            </div>
          ) : (
            <div className={styles.imagePlaceholderSmall} />
          )
        )}
        
        {displayCost > 0 && (
          <Text className={styles.costText}>{formatVND(displayCost)}</Text>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.cardOuterWrapper}>
        <div className={styles.cardContainer}>
          <div className={styles.timeCol}>
            <Text className={styles.timeText}>{event.time}</Text>
          </div>
          
          <Card 
            className={`${styles.eventCard} ${isTransport ? styles.transportCard : ''}`} 
            bodyStyle={{ padding: isTransport ? '12px 32px' : '16px 24px' }}
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
                              <Text style={{ fontFamily: "'Lora', serif", fontSize: 16 }}>{opt.method}</Text>
                              {opt.recommended && <Tag className={styles.luxuryRecTag}>RECOMMENDED</Tag>}
                              <div className={styles.subInfo}>
                                <Text style={{fontSize: 13, color: '#8C8C8C'}}>
                                  {Math.round(opt.travelTimeMinutes)} mins • {opt.pros}
                                </Text>
                              </div>
                            </div>
                            <Text className={styles.optionCost}>
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
                    <Button block className={styles.manageAccmBtn} onClick={() => setIsAccmModalVisible(true)}>
                      Manage Accommodation
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {!isTransport && (
          <div className={styles.deleteAction}>
            <Button type="text" style={{ color: '#DC2626' }} icon={<DeleteOutlined />} shape="circle" />
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