import React from 'react';
import { Modal, Descriptions, Tag, Space, Image, Divider, Table } from 'antd';
import { EnvironmentOutlined, DollarOutlined, UserOutlined, CalendarOutlined, LinkOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined, PictureOutlined, CloudOutlined } from '@ant-design/icons';
import { MONTH_NAMES, DAYS_OF_WEEK } from '@/utils/locationConstants';

// Helper to convert dayOfWeek number to name
const getDayName = (dayOfWeek) => {
  if (dayOfWeek === null || dayOfWeek === undefined) return 'N/A';
  
  // Normalize: ensure it's a number
  let dayNum = typeof dayOfWeek === 'string' ? parseInt(dayOfWeek, 10) : Number(dayOfWeek);
  
  // Handle invalid values
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
    return `Invalid day (${dayOfWeek})`;
  }
  
  const day = DAYS_OF_WEEK.find(d => d.value === dayNum);
  return day ? day.label : `Day ${dayNum}`;
};

/**
 * Reusable Detail Modal for displaying entity information
 * Supports: locations, tags, districts, locationTypes, amenities
 */
const DetailModal = ({ open, onClose, data, type }) => {
  if (!data) return null;

  const renderContent = () => {
    switch (type) {
      case 'location':
        return (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {data.description || 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Location Type">
              <Tag color="blue">{data.locationTypeName || 'N/A'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="District">
              <Tag color="green">{data.districtName || 'N/A'}</Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="Address">
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {data.address}
            </Descriptions.Item>
            
            <Descriptions.Item label="Coordinates">
              <Space direction="vertical" size="small">
                <div>Latitude: {data.latitude?.toFixed(6) || 'N/A'}</div>
                <div>Longitude: {data.longitude?.toFixed(6) || 'N/A'}</div>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Ticket Price">
              <DollarOutlined style={{ color: '#52c41a' }} />{' '}
              {data.ticketPrice ? `$${data.ticketPrice.toFixed(2)}` : 'Free'}
            </Descriptions.Item>
            
            <Descriptions.Item label="Price Range" span={2}>
              {(data.priceMinUsd || data.priceMaxUsd) ? (
                <Space>
                  <DollarOutlined />
                  ${data.priceMinUsd?.toFixed(2) || '0'} - ${data.priceMaxUsd?.toFixed(2) || '0'}
                </Space>
              ) : 'N/A'}
            </Descriptions.Item>
            
            <Descriptions.Item label="Minimum Age">
              <UserOutlined /> {data.minimumAge || 0}+
            </Descriptions.Item>
            
            <Descriptions.Item label="Recommended Duration">
              <ClockCircleOutlined /> {data.recommendedDurationMinutes ? `${data.recommendedDurationMinutes} min` : 'N/A'}
            </Descriptions.Item>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <Descriptions.Item label="Contact Information" span={2}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {data.telephone && (
                  <div><PhoneOutlined /> <strong>Phone:</strong> {data.telephone}</div>
                )}
                {data.email && (
                  <div><MailOutlined /> <strong>Email:</strong> {data.email}</div>
                )}
                {!data.telephone && !data.email && 'No contact information'}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Social Links" span={2}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {data.socialLinks && data.socialLinks.length > 0 ? (
                  data.socialLinks.map((link, index) => (
                    <div key={link.id || index}>
                      <Tag color="blue">{link.platformName || link.platform}</Tag>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <LinkOutlined /> {link.url}
                      </a>
                    </div>
                  ))
                ) : (
                  'No social links'
                )}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Tags" span={2}>
              <Space wrap>
                {data.tags && data.tags.length > 0 ? (
                  data.tags.map((tag, index) => (
                    <Tag key={tag.id || index} color="purple">{tag.name}</Tag>
                  ))
                ) : (
                  'No tags'
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Amenities" span={2}>
              <Space wrap>
                {data.amenities && data.amenities.length > 0 ? (
                  data.amenities.map((amenity, index) => (
                    <Tag key={amenity.id || index} color="green">{amenity.name}</Tag>
                  ))
                ) : (
                  'No amenities'
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Images" span={2}>
              <Space wrap>
                {data.mediaLinks && data.mediaLinks.length > 0 ? (
                  data.mediaLinks.map((link, index) => (
                    <Image
                      key={index}
                      src={link}
                      alt={`Location image ${index + 1}`}
                      width={100}
                      height={100}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                    />
                  ))
                ) : (
                  'No images'
                )}
              </Space>
            </Descriptions.Item>

            {/* Opening Hours */}
            {data.openingHours && data.openingHours.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Descriptions.Item label="Opening Hours" span={2}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {data.openingHours.map((oh, index) => (
                      <div
                        key={oh.id || index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: index % 2 === 0 ? '#f5f5f5' : '#fff',
                          borderRadius: '6px',
                          border: '1px solid #e8e8e8'
                        }}
                      >
                        <div style={{ width: 120, fontWeight: 600, color: '#1890ff' }}>
                          {oh.dayName || oh.DayName || getDayName(oh.dayOfWeek) || getDayName(oh.DayOfWeek)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#52c41a' }}>
                            <ClockCircleOutlined />
                            <strong>Open:</strong> {oh.openTime || 'N/A'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4d4f' }}>
                            <ClockCircleOutlined />
                            <strong>Close:</strong> {oh.closeTime || 'N/A'}
                          </span>
                          {oh.note && (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>
                              • {oh.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              </>
            )}

            {/* Seasonal Weather */}
            {data.seasons && data.seasons.length > 0 && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Descriptions.Item label="Best Seasons to Visit" span={2}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {data.seasons.map((season, index) => (
                      <div key={index} style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div><CloudOutlined /> <strong>{season.description || 'Season'}</strong></div>
                          <div>
                            <strong>Months:</strong>{' '}
                            <Space wrap>
                              {season.months && season.months.split(',').map((month, i) => (
                                <Tag key={i} color="blue">{MONTH_NAMES[month.trim()] || month}</Tag>
                              ))}
                            </Space>
                          </div>
                        </Space>
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              </>
            )}

            <Divider style={{ margin: '8px 0' }} />
            
            <Descriptions.Item label="Created At">
              <CalendarOutlined /> {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <CalendarOutlined /> {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        );

      case 'tag':
        return (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              <CalendarOutlined /> {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <CalendarOutlined /> {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        );

      case 'district':
        return (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="English Name">{data.englishName || 'N/A'}</Descriptions.Item>

            <Descriptions.Item label="Coordinates">
              <Space direction="vertical" size="small">
                <div>Latitude: {data.latitude?.toFixed(6) || 'N/A'}</div>
                <div>Longitude: {data.longitude?.toFixed(6) || 'N/A'}</div>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Province">
              <Tag color="green">{data.provinceName || 'N/A'}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Created At">
              <CalendarOutlined /> {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <CalendarOutlined /> {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        );

      case 'locationType':
        return (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              <CalendarOutlined /> {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <CalendarOutlined /> {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        );

      case 'amenity':
        return (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {data.description || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              <CalendarOutlined /> {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <CalendarOutlined /> {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        );

      default:
        return <div>Unknown entity type</div>;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'location':
        return `📍 ${data.name}`;
      case 'tag':
        return `🏷️ ${data.name}`;
      case 'district':
        return `🧭 ${data.name}`;
      case 'locationType':
        return `📋 ${data.name}`;
      case 'amenity':
        return `🏢 ${data.name}`;
      default:
        return 'Details';
    }
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      {renderContent()}
    </Modal>
  );
};

export default DetailModal;