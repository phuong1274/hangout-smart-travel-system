import React from 'react';
import { Modal, Descriptions, Tag, Space, Image, Divider } from 'antd';
import { MONTH_NAMES, SOCIAL_PLATFORMS } from '@/utils/locationConstants';
import styles from './DetailModal.module.css';

const DetailModal = ({ open, onClose, data, type, children }) => {
  if (!data) return null;

  const getPlatformLabel = (platform) => {
    if (!platform) return '';
    const platformObj = SOCIAL_PLATFORMS.find(p => p.enumValue === platform || p.value === platform);
    return platformObj ? platformObj.label : platform;
  };

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
                {data.ticketPrice ? `${data.ticketPrice.toFixed(2)}` : 'Free'}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="Price Range" span={2}>
              {(data.priceMinUsd || data.priceMaxUsd) ? (
                <Space className={styles.iconText}>
                  {data.priceMinUsd?.toFixed(2) || '0'} - {data.priceMaxUsd?.toFixed(2) || '0'}
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
                      <Tag className={styles.customTag} color="blue">
                        {link.platformName || getPlatformLabel(link.platform)}
                      </Tag>
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

      case 'transportMode':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="Category">
              <Tag color={data.category === 1 ? 'blue' : 'green'}>
                {data.category === 1 ? 'Dynamic Local' : data.category === 2 ? 'Fixed Intercity' : data.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Capacity">{data.capacity}</Descriptions.Item>
            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'transitHub':
        return (
          <Descriptions column={1} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="ID">{data.id}</Descriptions.Item>
            <Descriptions.Item label="Code"><Tag>{data.code}</Tag></Descriptions.Item>
            <Descriptions.Item label="Name">{data.name}</Descriptions.Item>
            <Descriptions.Item label="District">{data.districtName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Transport Mode">{data.transportModeName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Hub Type">{data.transitHubTypeName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Coordinates">
              <Space direction="vertical" size="small">
                <div>Latitude: {data.latitude?.toFixed(6) || 'N/A'}</div>
                <div>Longitude: {data.longitude?.toFixed(6) || 'N/A'}</div>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              <div className={styles.iconText}>{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Updated At">
              <div className={styles.iconText}>{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}</div>
            </Descriptions.Item>
          </Descriptions>
        );

      case 'localTransportMetrics':
        return (
          <Descriptions column={2} size="small" bordered className={styles.tropicalDescriptions}>
            <Descriptions.Item label="Transport Mode" span={2}>{data.transportModeName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Base Fare (VND)">{data.baseFare !== null && data.baseFare !== undefined ? `${data.baseFare.toLocaleString()} ₫` : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Base Distance (km)">{data.baseDistance?.toLocaleString() ?? 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Price per Km (VND)">{data.pricePerKm !== null && data.pricePerKm !== undefined ? `${data.pricePerKm.toLocaleString()} ₫` : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Speed (km/h)">{data.speedKmh?.toLocaleString() ?? 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Long Dist. Threshold (km)">{data.longDistanceThreshold?.toLocaleString() ?? 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Long Dist. Price/Km (VND)">{data.longDistancePricePerKm !== null && data.longDistancePricePerKm !== undefined ? `${data.longDistancePricePerKm.toLocaleString()} ₫` : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Congestion Fee (VND/min)">{data.congestionFeePerMinute !== null && data.congestionFeePerMinute !== undefined ? `${data.congestionFeePerMinute.toLocaleString()} ₫` : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Max Rec. Distance (km)">{data.maxRecommendedDistance?.toLocaleString() ?? 'Unlimited'}</Descriptions.Item>            <Descriptions.Item label="Created At">
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
      case 'transportMode': return ` ${data.name}`;
      case 'transitHub': return ` ${data.name}`;
      case 'localTransportMetrics': return ` ${data.transportModeName || 'Metrics'}`;
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
        {children}
      </div>
    </Modal>
  );
};

export default DetailModal;