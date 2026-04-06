import React, { useState } from 'react';
import { Card, Typography, Tag, Button, Image, Carousel } from 'antd';
import { 
  CarOutlined, 
  EnvironmentOutlined,
  DeleteOutlined,
  CoffeeOutlined
} from '@ant-design/icons';
import AccommodationModal from './AccommodationModal'; 

const { Text } = Typography;
const formatVND = (val) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)} VND`;
const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/80x80.png?text=No+Image';

const TimelineCard = ({ event }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => setIsModalVisible(true);
  const handleOk = () => setIsModalVisible(false);
  const handleCancel = () => setIsModalVisible(false);

  const getEventIcon = (type) => {
    switch(type) {
      case 'meal': return <CoffeeOutlined />;
      case 'visit': return <EnvironmentOutlined />;
      case 'intercity-transfer':
      case 'return-transfer': return <CarOutlined />;
      default: return <EnvironmentOutlined />;
    }
  };

  const isTransport = event.eventType.includes('transfer');
  const cardStyle = isTransport ? { background: '#F7F9F9', border: '1px dashed #BEE3F8' } : {};

  const displayName = event.locationDetail?.name || event.title;
  const displayAddress = event.locationDetail?.address || "";
  const displayImages = event.locationDetail?.images || [];
  const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : "";

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ width: 96, flexShrink: 0 }}>
          <Text>{formatTime(event.startTime)}</Text>
        </div>

        <div style={{ flexGrow: 1 }}>
          <Card 
            bodyStyle={{ padding: '16px 20px', display: 'flex', gap: '16px' }} 
            style={{ ...cardStyle, cursor: 'pointer' }}
            onClick={showModal} 
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ marginTop: 2 }}>{getEventIcon(event.eventType)}</div>
                  <div>
                    <Text strong style={{ fontSize: 15 }}>{displayName}</Text>
                    
                    {event.tags && event.tags.length > 0 && (
                      <div style={{ marginTop: 4, marginBottom: 4 }}>
                        {event.tags.map((tag, idx) => (
                          <Tag key={idx} color={tag.color || 'blue'} style={{ borderRadius: 4, fontSize: 11 }}>
                            {tag.name}
                          </Tag>
                        ))}
                      </div>
                    )}
                    
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">
                        {isTransport ? displayAddress : (displayAddress || event.note)}
                      </Text>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {event.costForGroup > 0 && (
                     <div><Text strong style={{ color: '#1A535C' }}>{formatVND(event.costForGroup)}</Text></div>
                  )}
                </div>
              </div>
            </div>

            {!isTransport && (
              <div style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                {displayImages && displayImages.length > 0 ? (
                  <Carousel autoplay effect="fade" dots={false}>
                    {displayImages.map((src, index) => (
                      <div key={index}>
                        <Image src={src} width={80} height={80} style={{ objectFit: 'cover' }} preview={false} />
                      </div>
                    ))}
                  </Carousel>
                ) : (
                  <Image src={DEFAULT_IMAGE_URL} width={80} height={80} style={{ objectFit: 'cover' }} preview={false} />
                )}
              </div>
            )}
          </Card>
        </div>

        <div style={{ marginLeft: 16, width: 32 }}>
          <Button type="text" style={{ color: '#FF6B6B' }} icon={<DeleteOutlined />} shape="circle" />
        </div>
      </div>

      <AccommodationModal visible={isModalVisible} onOk={handleOk} onCancel={handleCancel} />
    </>
  );
};

export default TimelineCard;