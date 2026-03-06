import React from 'react';
import { Modal, Descriptions, Tag, Space, Image } from 'antd';
import { EnvironmentOutlined, DollarOutlined, UserOutlined, CalendarOutlined, LinkOutlined } from '@ant-design/icons';

/**
 * Reusable Detail Modal for displaying entity information
 * Supports: locations, tags, destinations, locationTypes
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
            <Descriptions.Item label="Address">
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              {data.address}
            </Descriptions.Item>
            <Descriptions.Item label="Location Type">
              <Tag color="blue">{data.locationTypeName || 'N/A'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Destination">
              <Tag color="green">{data.destinationName || 'N/A'}</Tag>
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
            <Descriptions.Item label="Minimum Age">
              <UserOutlined /> {data.minimumAge || 0}+
            </Descriptions.Item>
            <Descriptions.Item label="Social Link">
              {data.socialLink ? (
                <a href={data.socialLink} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined /> Visit
                </a>
              ) : (
                'N/A'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Tags" span={2}>
              <Space wrap>
                {data.tags && data.tags.length > 0 ? (
                  data.tags.map((tag, index) => (
                    <Tag key={index} color="purple">{tag.name || tag}</Tag>
                  ))
                ) : (
                  'No tags'
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
