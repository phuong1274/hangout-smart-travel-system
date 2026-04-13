import React from 'react';
import { Modal, Descriptions, Tag, Space, Image, Divider } from 'antd';
import { MONTH_NAMES } from '@/utils/locationConstants';
import styles from './DetailModal.module.css';

const DetailModal = ({ open, onClose, data, type }) => {
  if (!data) return null;

  const renderContent = () => {
    switch (type) {
      case 'location':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {data.description || 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Location Type">
              <Tag className={styles.customTag} color="blue">{data.locationTypeName || 'N/A'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="District">
              <Tag className={styles.customTag} color="green">{data.districtName || 'N/A'}</Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="Address">
              <div className={styles.iconText}>
                {data.address}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="Coordinates">
              <Space direction="vertical" size="small">
                <div>Latitude: {data.latitude?.toFixed(6) || 'N/A'}</div>
                <div>Longitude: {data.longitude?.toFixed(6) || 'N/A'}</div>
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Ticket Price">
              <div className={styles.iconText}>
                {data.ticketPrice ? `$${data.ticketPrice.toFixed(2)}` : 'Free'}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="Price Range" span={2}>
              {(data.priceMinUsd || data.priceMaxUsd) ? (
                <Space className={styles.iconText}>
                  ${data.priceMinUsd?.toFixed(2) || '0'} - ${data.priceMaxUsd?.toFixed(2) || '0'}
                </Space>
              ) : 'N/A'}
            </Descriptions.Item>
            
            <Descriptions.Item label="Minimum Age">
              <div className={styles.iconText}>
                {data.minimumAge || 0}+
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="Recommended Duration">
              <div className={styles.iconText}>
                {data.recommendedDurationMinutes ? `${data.recommendedDurationMinutes} min` : 'N/A'}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="Contact Information" span={2}>
              <Space direction="vertical" size="small" className={styles.fullWidth}>
                {data.telephone && (
                  <div className={styles.iconText}><strong>Phone:</strong> {data.telephone}</div>
                )}
                {data.email && (
                  <div className={styles.iconText}><strong>Email:</strong> {data.email}</div>
                )}
                {!data.telephone && !data.email && 'No contact information'}
              </Space>
            </Descriptions.Item>
            
            <Descriptions.Item label="Social Links" span={2}>
              <Space direction="vertical" size="small" className={styles.fullWidth}>
                {data.socialLinks && data.socialLinks.length > 0 ? (
                  data.socialLinks.map((link, index) => (
                    <div key={link.id || index} className={styles.socialLinkRow}>
                      <Tag className={styles.customTag} color="blue">{link.platformName || link.platform}</Tag>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.hoverLink}>
                        {link.url}
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
                {data.tagNames && data.tagNames.length > 0 ? (
                  data.tagNames.map((tagName, index) => (
                    <Tag key={index} className={styles.customTag} color="purple">{tagName}</Tag>
                  ))
                ) : (
                  'No tags'
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Amenities" span={2}>
              <Space wrap>
                {data.amenityNames && data.amenityNames.length > 0 ? (
                  data.amenityNames.map((amenityName, index) => (
                    <Tag key={index} className={styles.customTag} color="green">{amenityName}</Tag>
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
                      className={styles.locationImage}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                    />
                  ))
                ) : (
                  'No images'
                )}
              </Space>
            </Descriptions.Item>

            {data.openingHours && data.openingHours.length > 0 && (
              <Descriptions.Item label="Opening Hours" span={2}>
                <Space direction="vertical" size="small" className={styles.fullWidth}>
                  {data.openingHours.map((oh, index) => (
                    <div key={oh.id || index} className={index % 2 === 0 ? styles.hoursRowEven : styles.hoursRowOdd}>
                      <div className={styles.dayNameBadge}>
                        {oh.dayName}
                      </div>
                      <div className={styles.hoursContent}>
                        <span className={styles.timeBlockOpen}>
                          <strong>Open:</strong> {oh.openTime || 'N/A'}
                        </span>
                        <span className={styles.timeBlockClose}>
                          <strong>Close:</strong> {oh.closeTime || 'N/A'}
                        </span>
                        {oh.note && (
                          <span className={styles.noteText}>
                            • {oh.note}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            {data.seasons && data.seasons.length > 0 && (
              <Descriptions.Item label="Best Seasons to Visit" span={2}>
                <Space direction="vertical" size="small" className={styles.fullWidth}>
                  {data.seasons.map((season, index) => (
                    <div key={index} className={styles.seasonCard}>
                      <Space direction="vertical" size="small" className={styles.fullWidth}>
                        <div className={styles.seasonTitle}><strong>{season.description || 'Season'}</strong></div>
                        <div>
                          <strong className={styles.seasonLabel}>Months:</strong>{' '}
                          <Space wrap>
                            {season.months && season.months.split(',').map((month, i) => (
                              <Tag key={i} className={styles.customTag} color="blue">{MONTH_NAMES[month.trim()] || month}</Tag>
                            ))}
                          </Space>
                        </div>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>
                {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>
                {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
              </div>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'tag':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'district':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
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
              <Tag className={styles.customTag} color="green">{data.provinceName || 'N/A'}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'locationType':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'amenity':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {data.description || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
          </Descriptions>
        );

      default:
        return <div className={styles.unknownText}>Unknown entity type</div>;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'location': return ` ${data.name}`;
      case 'tag': return ` ${data.name}`;
      case 'district': return ` ${data.name}`;
      case 'locationType': return ` ${data.name}`;
      case 'amenity': return ` ${data.name}`;
      default: return 'Details';
    }
  };

  return (
    <Modal
      title={<span className={styles.modalTitle}>{getTitle()}</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={750}
      className={styles.tropicalModal}
      rootClassName={styles.tropicalModal}
      wrapClassName={styles.tropicalModal}
    >
      <div className={styles.modalContentWrapper}>
        {renderContent()}
      </div>
    </Modal>
  );
};

export default DetailModal;