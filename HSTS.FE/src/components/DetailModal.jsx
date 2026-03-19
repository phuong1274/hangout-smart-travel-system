import React from 'react';
import { Modal, Descriptions, Tag, Space, Image, Divider, Table } from 'antd';
import { EnvironmentOutlined, DollarOutlined, UserOutlined, CalendarOutlined, LinkOutlined, PhoneOutlined, MailOutlined, ClockCircleOutlined, PictureOutlined, CloudOutlined } from '@ant-design/icons';

/**
 * Reusable Detail Modal for displaying entity information
 * Supports: locations, tags, destinations, locationTypes, amenities
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
            <Descriptions.Item label="Destination">
              <Tag color="green">{data.destinationName || 'N/A'}</Tag>
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
                    <div key={index}>
                      <Tag color="blue">{link.platform}</Tag>
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
                {data.tagIds && data.tagIds.length > 0 ? (
                  data.tagIds.map((tagId, index) => (
                    <Tag key={index} color="purple">Tag #{tagId}</Tag>
                  ))
                ) : (
                  'No tags'
                )}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Amenities" span={2}>
              <Space wrap>
                {data.amenityIds && data.amenityIds.length > 0 ? (
                  data.amenityIds.map((amenityId, index) => (
                    <Tag key={index} color="green">Amenity #{amenityId}</Tag>
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
                  <Table
                    dataSource={data.openingHours}
                    pagination={false}
                    size="small"
                    rowKey="id"
                    columns={[
                      {
                        title: 'Day',
                        dataIndex: 'dayName',
                        key: 'dayName',
                        width: 120
                      },
                      {
                        title: 'Open Time',
                        dataIndex: 'openTime',
                        key: 'openTime',
                        render: (value) => value || 'N/A'
                      },
                      {
                        title: 'Close Time',
                        dataIndex: 'closeTime',
                        key: 'closeTime',
                        render: (value) => value || 'N/A'
                      },
                      {
                        title: 'Status',
                        dataIndex: 'isClosed',
                        key: 'isClosed',
                        render: (isClosed) => (
                          <Tag color={isClosed ? 'red' : 'green'}>
                            {isClosed ? 'Closed' : 'Open'}
                          </Tag>
                        )
                      },
                      {
                        title: 'Note',
                        dataIndex: 'note',
                        key: 'note',
                        render: (value) => value || '-'
                      }
                    ]}
                  />
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
                              {season.months && season.months.split(',').map((month, i) => {
                                const monthNames = {
                                  '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr',
                                  '5': 'May', '6': 'Jun', '7': 'Jul', '8': 'Aug',
                                  '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
                                };
                                return (
                                  <Tag key={i} color="blue">{monthNames[month.trim()] || month}</Tag>
                                );
                              })}
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

      case 'destination':
        return (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="English Name">{data.englishName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Code">
              <Tag color="blue">{data.code || 'N/A'}</Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="Coordinates">
              <Space direction="vertical" size="small">
                <div>Latitude: {data.latitude?.toFixed(6) || 'N/A'}</div>
                <div>Longitude: {data.longitude?.toFixed(6) || 'N/A'}</div>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Type">
              <Tag color="green">{data.type || 'N/A'}</Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="State Information">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {data.stateName && <div><EnvironmentOutlined /> {data.stateName}</div>}
                {data.stateId && <div>State ID: {data.stateId}</div>}
                {!data.stateName && !data.stateId && 'N/A'}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Country ID">{data.countryId || 'N/A'}</Descriptions.Item>
            
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
      case 'destination':
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
