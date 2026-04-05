import React from 'react';
import { Drawer, Descriptions, Typography, Tag, Space, Divider } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const getEnglishPreferredName = (item) => {
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  const localName = String(item?.name || item?.Name || '').trim();
  return englishName || localName || '';
};

const formatRatingOutOfFive = (value) => {
  if (value == null || value === '') return null;

  const match = String(value).match(/([0-9]+(?:[.,][0-9]+)?)/);
  if (!match) return null;

  const numeric = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;

  let normalized = numeric;
  if (numeric > 10) {
    normalized = numeric / 20;
  } else if (numeric > 5) {
    normalized = numeric / 2;
  }

  const rounded = Math.min(5, Math.max(0, Math.ceil(normalized)));
  return `${rounded}/5`;
};

const formatMoney = (moneyDto) => {
  if (!moneyDto) return 'N/A';
  const amount = moneyDto.amount ?? moneyDto.Amount ?? 0;
  const currency = moneyDto.currency || moneyDto.Currency || 'VND';
  return `${amount.toLocaleString()} ${currency}`;
};

const AccommodationDetailModal = ({ open, data, onClose }) => {
  if (!open || !data) return null;

  const name = data.englishName || data.EnglishName || data.name || data.Name || data.hotelName || data.HotelName || 'Hotel';
  const address = data.address || data.Address || '';
  const description = data.description || data.Description || '';
  const rating = data.rating || data.Rating || data.starRating || data.StarRating;
  const pricePerNight = data.pricePerNight || data.PricePerNight || data.estimatedCost || data.EstimatedCost;
  const amenities = data.amenities || data.Amenities || [];
  const images = data.images || data.Images || [];
  const checkIn = data.checkInTime || data.CheckInTime;
  const checkOut = data.checkOutTime || data.CheckOutTime;
  const roomType = data.roomType || data.RoomType || '';
  const displayRating = formatRatingOutOfFive(rating);

  return (
    <Drawer
      title={`🏨 ${name}`}
      open={open}
      onClose={onClose}
      placement="right"
      width={600}
      destroyOnClose
    >
      {/* Rating */}
      {displayRating && (
        <div style={{ marginBottom: 12 }}>
          {'⭐'.repeat(Number(displayRating.split('/')[0]))} {displayRating}
        </div>
      )}

      {/* Basic Info */}
      <Descriptions size="small" column={1} bordered>
        {address && (
          <Descriptions.Item label="📍 Address">{address}</Descriptions.Item>
        )}
        {roomType && (
          <Descriptions.Item label="🛏️ Room Type">{roomType}</Descriptions.Item>
        )}
        {pricePerNight && (
          <Descriptions.Item label="💰 Price/room/night">{formatMoney(pricePerNight)}</Descriptions.Item>
        )}
        {checkIn && (
          <Descriptions.Item label="📥 Check-in">{checkIn}</Descriptions.Item>
        )}
        {checkOut && (
          <Descriptions.Item label="📤 Check-out">{checkOut}</Descriptions.Item>
        )}
      </Descriptions>

      {/* Amenities */}
      {amenities.length > 0 && (
        <>
          <Divider orientation="left" plain>Amenities</Divider>
          <Space wrap>
            {amenities.map((a, i) => {
              const amenName = typeof a === 'string' ? a : getEnglishPreferredName(a);
              return (
                <Tag key={i} icon={<CheckCircleOutlined />} color="green">
                  {amenName}
                </Tag>
              );
            })}
          </Space>
        </>
      )}

      {/* Description */}
      {description && (
        <>
          <Divider orientation="left" plain>Description</Divider>
          <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: 'Show more' }}>
            {description}
          </Paragraph>
        </>
      )}
    </Drawer>
  );
};

export default AccommodationDetailModal;
