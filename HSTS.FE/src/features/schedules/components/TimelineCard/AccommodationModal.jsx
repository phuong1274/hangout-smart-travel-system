import React, { useState, useEffect } from 'react';
import { Typography, Tag, Button, Collapse, Modal, Tabs } from 'antd';
import { 
  HomeOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';
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
  baseHotelName,
  currentRooms,
  accmTitle
}) => {
  const [activeTab, setActiveTab] = useState("1");

  useEffect(() => {
    if (visible) {
      setActiveTab("1");
    }
  }, [visible]);

  // Hàm render chung cho thẻ Room, nhận cờ showSelectBtn để quyết định có hiện nút chọn phòng hay không
  const renderRoomOption = (opt, idx, showSelectBtn, isSelected) => (
    <div key={idx} className={styles.roomCard}>
      <div className={styles.roomHeader}>
        <div>
          <Text strong className={styles.roomTitle}>{opt.roomType}</Text>
          {opt.recommended && <Tag color="success" className={styles.roomRecTag}>Recommended</Tag>}
        </div>
        <div className={styles.roomPriceBox}>
          <Text strong className={styles.roomTotal}>{formatVND(opt.totalCost)}</Text>
          {opt.pricePerNight > 0 && (
            <Text type="secondary" className={styles.roomPerNight}>{formatVND(opt.pricePerNight)} / night</Text>
          )}
        </div>
      </div>
      
      <Text className={styles.roomDesc}>{opt.description}</Text>
      
      <div className={styles.amenitiesList}>
        {opt.amenities?.map((am, i) => <Tag key={i} className={styles.amTag}>{am}</Tag>)}
      </div>
      
      <div className={styles.prosCons}>
        {opt.pros && (
          <div className={styles.proItem}>
            <CheckCircleOutlined className={styles.proIcon} />
            <Text type="success" style={{fontSize: 13}}>{opt.pros}</Text>
          </div>
        )}
        {opt.cons && (
          <div className={styles.conItem}>
            <CloseCircleOutlined className={styles.conIcon} />
            <Text type="danger" style={{fontSize: 13}}>{opt.cons}</Text>
          </div>
        )}
      </div>
      
      {showSelectBtn && (
        <Button 
          type={isSelected ? "primary" : "default"} 
          block 
          style={{marginTop: 12}}
          onClick={() => setActiveRoomIdx(idx)}
        >
          {isSelected ? 'Selected Room' : 'Select this room'}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HomeOutlined style={{ color: '#faad14' }} />
          <span>{accmTitle.replace('Hotel Check-in: ', '').replace('Accommodation: ', '')}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={750}
      bodyStyle={{ padding: '0 24px 24px 24px' }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Room Options" key="1">
          <div className={styles.modalScrollArea}>
            {/* Tab 1: Luôn hiện nút chọn phòng */}
            {currentRooms?.map((opt, idx) => renderRoomOption(opt, idx, true, activeRoomIdx === idx))}
          </div>
        </TabPane>
        
        <TabPane tab="Alternative Hotels" key="2">
          <div className={styles.modalScrollArea}>
            <Collapse ghost className={styles.altAccmCollapse}>
              {event.alternativeAccommodations?.map((alt, altIdx) => {
                const isCurrentlySelectedHotel = activeHotel.isAlternative && activeHotel.altIndex === altIdx;

                // CHỈNH SỬA TẠI ĐÂY: Tạo khối Header mới, tích hợp nút "Select Hotel" vào cùng dòng
                const newHeader = (
                  <div className={styles.altHotelHeader}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: '15px' }}>{alt.name}</Text>
                      <Tag color="cyan" style={{ border: 'none', marginLeft: '8px' }}>
                        {alt.distance} km away
                      </Tag>
                    </div>
                    
                    {/* Nút Chọn Khách sạn, di chuyển lên đây */}
                    <Button 
                      type={isCurrentlySelectedHotel ? "primary" : "default"} 
                      size="small" // Kích thước nhỏ để vừa với dòng header
                      style={{ marginLeft: 'auto' }} // Đẩy nút về sát góc phải
                      onClick={(e) => {
                        e.stopPropagation(); // CỰC KỲ QUAN TRỌNG: Ngăn chặn Collapse bị toggle
                        if (!isCurrentlySelectedHotel) {
                          setActiveHotel({ isAlternative: true, altIndex: altIdx });
                          setActiveRoomIdx(0); // Reset về phòng đầu tiên của KS mới
                          setActiveTab("1");   // Nhảy về Tab 1 để confirm room
                        }
                      }}
                    >
                      {isCurrentlySelectedHotel ? 'Currently Selected' : 'Select Hotel'}
                    </Button>
                  </div>
                );

                return (
                  <Panel 
                    header={newHeader} // Sử dụng Header mới đã tích hợp nút
                    key={altIdx}
                    className={styles.altPanel}
                  >
                    {/* Phần thân của Panel cũ (các thông tin "Recommended Room", "From" và Button cũ) ĐÃ ĐƯỢC XÓA BỎ BỞI VÌ ĐÃ LÊN HEADER HOẶC KHÔNG CẦN THIẾT */}
                    
                    <Text strong style={{display: 'block', marginBottom: 12, paddingLeft: 4}}>Available Rooms (Preview):</Text>

                    {/* Danh sách phòng xem trước (Không hiện nút chọn) */}
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