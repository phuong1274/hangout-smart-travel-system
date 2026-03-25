import React, { useState, useEffect } from 'react';
import { Typography, Tag, Button, Collapse, Modal, Tabs } from 'antd';
import { HomeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import styles from '../../styles/TimelineCard.module.css';

const { Text } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const AccommodationModal = ({ 
  visible, 
  onClose, 
  event, 
  activeHotel, 
  setActiveHotel, 
  activeRoomIdx, 
  setActiveRoomIdx,
  currentRooms,
  accmTitle
}) => {
  const [activeTab, setActiveTab] = useState("1");

  useEffect(() => {
    if (visible) {
      setActiveTab("1");
    }
  }, [visible]);

  const renderRoomOption = (opt, idx, showSelectBtn, isSelected) => (
    <div key={idx} className={styles.roomCard}>
      <div className={styles.roomHeader}>
        <div>
          <span className={styles.roomTitle}>{opt.roomType}</span>
          {opt.recommended && <Tag className={styles.luxuryRecTag}>RECOMMENDED</Tag>}
        </div>
        <div className={styles.roomPriceBox}>
          <span className={styles.roomTotal}>{formatVND(opt.totalCost)}</span>
          {opt.pricePerNight > 0 && (
            <span className={styles.roomPerNight}>{formatVND(opt.pricePerNight)} / night</span>
          )}
        </div>
      </div>
      
      <span className={styles.roomDesc}>{opt.description}</span>
      
      <div className={styles.amenitiesList}>
        {opt.amenities?.map((am, i) => <Tag key={i} className={styles.amTag}>{am}</Tag>)}
      </div>
      
      <div className={styles.prosCons}>
        {opt.pros && (
          <div className={styles.proItem}>
            <CheckCircleOutlined className={styles.proIcon} />
            <Text className={styles.proText}>{opt.pros}</Text>
          </div>
        )}
        {opt.cons && (
          <div className={styles.conItem}>
            <CloseCircleOutlined className={styles.conIcon} />
            <Text className={styles.conText}>{opt.cons}</Text>
          </div>
        )}
      </div>
      
      {showSelectBtn && (
        <Button 
          className={`${styles.roomSelectBtn} ${isSelected ? styles.roomSelected : ''}`}
          block 
          onClick={() => setActiveRoomIdx(idx)}
        >
          {isSelected ? 'SELECTED' : 'SELECT ROOM'}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      className={styles.luxuryModal}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HomeOutlined style={{ color: '#1A1A1A', fontSize: '20px' }} />
          <span style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 400, color: '#1A1A1A' }}>
            {accmTitle.replace('Hotel Check-in: ', '').replace('Accommodation: ', '')}
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={750}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} className={styles.customTabs}>
        <TabPane tab="ROOM OPTIONS" key="1">
          <div className={styles.modalScrollArea}>
            {currentRooms?.map((opt, idx) => renderRoomOption(opt, idx, true, activeRoomIdx === idx))}
          </div>
        </TabPane>
        
        <TabPane tab="ALTERNATIVE HOTELS" key="2">
          <div className={styles.modalScrollArea}>
            <Collapse ghost className={styles.altAccmCollapse}>
              {event.alternativeAccommodations?.map((alt, altIdx) => {
                const isCurrentlySelectedHotel = activeHotel.isAlternative && activeHotel.altIndex === altIdx;

                const newHeader = (
                  <div className={styles.altHotelHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.altHotelTitle}>{alt.name}</span>
                      <Tag className={styles.altHotelDistance}>
                        {alt.distance} km away
                      </Tag>
                    </div>
                    
                    <Button 
                      size="small"
                      className={`${styles.altSelectBtn} ${isCurrentlySelectedHotel ? styles.altSelected : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCurrentlySelectedHotel) {
                          setActiveHotel({ isAlternative: true, altIndex: altIdx });
                          setActiveRoomIdx(0);
                          setActiveTab("1");
                        }
                      }}
                    >
                      {isCurrentlySelectedHotel ? 'SELECTED' : 'SELECT HOTEL'}
                    </Button>
                  </div>
                );

                return (
                  <Panel 
                    header={newHeader}
                    key={altIdx}
                    className={styles.altPanel}
                  >
                    <Text style={{ display: 'block', marginBottom: 20, fontSize: 13, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Available Rooms (Preview)
                    </Text>
                    {alt.options?.map((opt, optIdx) => renderRoomOption(opt, optIdx, false, false))}
                  </Panel>
                );
              })}
            </Collapse>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default AccommodationModal;