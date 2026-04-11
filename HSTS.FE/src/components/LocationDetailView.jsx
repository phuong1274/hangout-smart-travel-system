import React from 'react';
import { Descriptions, Tag, Space, Image, Divider } from 'antd';
import { 
  EnvironmentOutlined, 
  DollarOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  LinkOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  ClockCircleOutlined, 
  PictureOutlined, 
  CloudOutlined 
} from '@ant-design/icons';
import { MONTH_NAMES, DAYS_OF_WEEK, SOCIAL_PLATFORMS } from '@/utils/locationConstants';

// Helper to convert dayOfWeek number to name
const getDayName = (dayOfWeek) => {
  if (dayOfWeek === null || dayOfWeek === undefined) return 'N/A';

  let dayNum = typeof dayOfWeek === 'string' ? parseInt(dayOfWeek, 10) : Number(dayOfWeek);

  if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
    return `Invalid day (${dayOfWeek})`;
  }

  const day = DAYS_OF_WEEK.find(d => d.value === dayNum);
  return day ? day.label : `Day ${dayNum}`;
};

// Helper to get platform name from enum value or string
const getPlatformName = (platform) => {
  if (!platform) return 'Unknown';
  if (typeof platform === 'string') return platform;
  
  const platformObj = SOCIAL_PLATFORMS.find(p => p.enumValue === platform);
  return platformObj ? platformObj.value : String(platform);
};

/**
 * Reusable component for displaying location/submission detail information
 * Can handle both Location and Submission data with null-safe rendering
 * 
 * @param {Object} data - The location or submission data
 * @param {Object} options - Display options
 * @param {boolean} options.showSubmissionInfo - Show submission-specific fields (status, rejection reason, etc.)
 * @param {boolean} options.showId - Show ID field
 * @param {boolean} options.showTimestamps - Show created/updated timestamps
 */
const LocationDetailView = ({ data, options = {} }) => {
  const {
    showSubmissionInfo = false,
    showId = true,
    showTimestamps = true,
  } = options;

  if (!data) return null;

  // Normalize data - handle both camelCase and PascalCase
  const name = data.name || data.Name;
  const description = data.description || data.Description;
  const address = data.address || data.Address;
  const latitude = data.latitude ?? data.Latitude;
  const longitude = data.longitude ?? data.Longitude;
  const ticketPrice = data.ticketPrice ?? data.TicketPrice;
  const minimumAge = data.minimumAge ?? data.MinimumAge;
  const recommendedDurationMinutes = data.recommendedDurationMinutes ?? data.RecommendedDurationMinutes;
  const priceMinUsd = data.priceMinUsd ?? data.PriceMinUsd;
  const priceMaxUsd = data.priceMaxUsd ?? data.PriceMaxUsd;
  const telephone = data.telephone || data.Telephone;
  const email = data.email || data.Email;
  const locationTypeName = data.locationTypeName || data.LocationTypeName;
  const districtName = data.districtName || data.DistrictName;
  const tags = data.tags || data.Tags || [];
  const amenities = data.amenities || data.Amenities || [];
  const mediaLinks = data.mediaLinks || data.MediaLinks || [];
  const socialLinks = data.socialLinks || data.SocialLinks || [];
  const openingHours = data.openingHours || data.OpeningHours || [];
  const seasons = data.seasons || data.Seasons || [];
  const createdAt = data.createdAt || data.CreatedAt;
  const updatedAt = data.updatedAt || data.UpdatedAt;
  const id = data.id || data.Id;

  // Submission-specific fields
  const status = data.status || data.Status;
  const statusText = data.statusText || data.StatusText;
  const rejectionReason = data.rejectionReason || data.RejectionReason;
  const createdLocationId = data.createdLocationId || data.CreatedLocationId;
  const submissionType = data.submissionType || data.SubmissionType;
  const submittedBy = data.submittedBy || data.SubmittedBy;
  const submittedAt = data.submittedAt || data.SubmittedAt;
  const reviewedBy = data.reviewedBy || data.ReviewedBy;
  const reviewedAt = data.reviewedAt || data.ReviewedAt;

  // Helper to format status text
  const getStatusDisplay = () => {
    if (statusText) return statusText;
    
    const statusMap = {
      0: 'Pending',
      1: 'Approved',
      2: 'Rejected',
      3: 'Published',
      'Pending': 'Pending',
      'Approved': 'Approved',
      'Rejected': 'Rejected',
      'Published': 'Published'
    };
    
    return statusMap[status] || `Status ${status}`;
  };

  // Helper to get status color
  const getStatusColor = () => {
    const colorMap = {
      0: 'orange',
      1: 'green',
      2: 'red',
      3: 'blue',
      'Pending': 'orange',
      'Approved': 'green',
      'Rejected': 'red',
      'Published': 'blue'
    };
    
    return colorMap[status] || 'default';
  };

  return (
    <Descriptions column={1} size="small" bordered>
      {/* Basic Information */}
      {showId && <Descriptions.Item label="ID">{id}</Descriptions.Item>}
      
      {showSubmissionInfo && status && (
        <Descriptions.Item label="Status">
          <Tag color={getStatusColor()}>{getStatusDisplay()}</Tag>
        </Descriptions.Item>
      )}

      <Descriptions.Item label="Name">{name || 'N/A'}</Descriptions.Item>
      
      <Descriptions.Item label="Description" span={2}>
        {description || 'N/A'}
      </Descriptions.Item>

      {/* Location Type and District */}
      {(locationTypeName || districtName) && (
        <>
          {locationTypeName && (
            <Descriptions.Item label="Location Type">
              <Tag color="blue">{locationTypeName}</Tag>
            </Descriptions.Item>
          )}
          {districtName && (
            <Descriptions.Item label="District">
              <Tag color="green">{districtName}</Tag>
            </Descriptions.Item>
          )}
        </>
      )}

      {/* Address */}
      {address && (
        <Descriptions.Item label="Address">
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          {address}
        </Descriptions.Item>
      )}

      {/* Coordinates */}
      {(latitude || longitude) && (
        <Descriptions.Item label="Coordinates">
          <Space direction="vertical" size="small">
            <div>Latitude: {typeof latitude === 'number' ? latitude.toFixed(6) : latitude || 'N/A'}</div>
            <div>Longitude: {typeof longitude === 'number' ? longitude.toFixed(6) : longitude || 'N/A'}</div>
          </Space>
        </Descriptions.Item>
      )}

      {/* Pricing */}
      {(ticketPrice !== null && ticketPrice !== undefined) && (
        <Descriptions.Item label="Ticket Price">
          <DollarOutlined style={{ color: '#52c41a' }} />{' '}
          {ticketPrice > 0 ? `$${ticketPrice.toFixed(2)}` : 'Free'}
        </Descriptions.Item>
      )}

      {(priceMinUsd || priceMaxUsd) && (
        <Descriptions.Item label="Price Range" span={2}>
          <Space>
            <DollarOutlined />
            ${priceMinUsd?.toFixed(2) || '0'} - ${priceMaxUsd?.toFixed(2) || '0'}
          </Space>
        </Descriptions.Item>
      )}

      {/* Additional Info */}
      {(minimumAge !== null && minimumAge !== undefined) && (
        <Descriptions.Item label="Minimum Age">
          <UserOutlined /> {minimumAge}+
        </Descriptions.Item>
      )}

      {recommendedDurationMinutes && (
        <Descriptions.Item label="Recommended Duration">
          <ClockCircleOutlined /> {recommendedDurationMinutes} min
        </Descriptions.Item>
      )}

      <Divider style={{ margin: '8px 0' }} />

      {/* Contact Information */}
      <Descriptions.Item label="Contact Information" span={2}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {telephone && (
            <div><PhoneOutlined /> <strong>Phone:</strong> {telephone}</div>
          )}
          {email && (
            <div><MailOutlined /> <strong>Email:</strong> {email}</div>
          )}
          {!telephone && !email && 'No contact information'}
        </Space>
      </Descriptions.Item>

      {/* Social Links */}
      {socialLinks && socialLinks.length > 0 && (
        <Descriptions.Item label="Social Links" span={2}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {socialLinks.map((link, index) => (
              <div key={link.id || index}>
                <Tag color="blue">{link.platformName || link.PlatformName || getPlatformName(link.platform ?? link.Platform)}</Tag>
                <a href={link.url || link.Url} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined /> {link.url || link.Url}
                </a>
              </div>
            ))}
          </Space>
        </Descriptions.Item>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <Descriptions.Item label="Tags" span={2}>
          <Space wrap>
            {tags.map((tag, index) => (
              <Tag key={tag.id || index} color="purple">{tag.name}</Tag>
            ))}
          </Space>
        </Descriptions.Item>
      )}

      {/* Amenities */}
      {amenities && amenities.length > 0 && (
        <Descriptions.Item label="Amenities" span={2}>
          <Space wrap>
            {amenities.map((amenity, index) => (
              <Tag key={amenity.id || index} color="green">{amenity.name}</Tag>
            ))}
          </Space>
        </Descriptions.Item>
      )}

      {/* Images */}
      {mediaLinks && mediaLinks.length > 0 && (
        <Descriptions.Item label="Images" span={2}>
          <Space wrap>
            {mediaLinks.map((link, index) => (
              <Image
                key={index}
                src={link}
                alt={`Image ${index + 1}`}
                width={100}
                height={100}
                style={{ objectFit: 'cover', borderRadius: 4 }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
              />
            ))}
          </Space>
        </Descriptions.Item>
      )}

      {/* Opening Hours */}
      {openingHours && openingHours.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Descriptions.Item label="Opening Hours" span={2}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {openingHours.map((oh, index) => (
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
                    {oh.dayName || oh.DayName || getDayName(oh.dayOfWeek ?? oh.DayOfWeek)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#52c41a' }}>
                      <ClockCircleOutlined />
                      <strong>Open:</strong> {oh.openTime || oh.OpenTime || 'N/A'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4d4f' }}>
                      <ClockCircleOutlined />
                      <strong>Close:</strong> {oh.closeTime || oh.CloseTime || 'N/A'}
                    </span>
                    {(oh.note || oh.Note) && (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>
                        • {oh.note || oh.Note}
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
      {seasons && seasons.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Descriptions.Item label="Best Seasons to Visit" span={2}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {seasons.map((season, index) => (
                <div key={index} style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div><CloudOutlined /> <strong>{season.description || season.Description || 'Season'}</strong></div>
                    <div>
                      <strong>Months:</strong>{' '}
                      <Space wrap>
                        {(season.months ?? season.Months ?? '').split(',').filter(m => m).map((month, i) => (
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

      {/* Submission-specific Information */}
      {showSubmissionInfo && (
        <>
          <Divider style={{ margin: '8px 0' }} />

          {submittedBy && (
            <Descriptions.Item label="Submitted By">
              <UserOutlined /> {submittedBy}
            </Descriptions.Item>
          )}

          {submittedAt && (
            <Descriptions.Item label="Submitted At">
              <CalendarOutlined /> {new Date(submittedAt).toLocaleString()}
            </Descriptions.Item>
          )}

          {reviewedBy && (
            <Descriptions.Item label="Reviewed By">
              <UserOutlined /> {reviewedBy}
            </Descriptions.Item>
          )}

          {reviewedAt && (
            <Descriptions.Item label="Reviewed At">
              <CalendarOutlined /> {new Date(reviewedAt).toLocaleString()}
            </Descriptions.Item>
          )}

          {rejectionReason && (
            <Descriptions.Item label="Rejection Reason" span={2}>
              <div style={{ color: '#ff4d4f', padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '6px' }}>
                <strong>⚠️ </strong>
                <p style={{ margin: '8px 0 0 0' }}>{rejectionReason}</p>
              </div>
            </Descriptions.Item>
          )}

          {createdLocationId && (
            <Descriptions.Item label="Approval Status" span={2}>
              <div style={{ color: '#52c41a', padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
                <strong>✓ Approved - Location Created</strong>
                <p style={{ margin: '8px 0 0 0' }}>Location ID: {createdLocationId}</p>
              </div>
            </Descriptions.Item>
          )}
        </>
      )}

      {/* Timestamps */}
      {showTimestamps && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          {createdAt && (
            <Descriptions.Item label="Created At">
              <CalendarOutlined /> {new Date(createdAt).toLocaleString()}
            </Descriptions.Item>
          )}
          {updatedAt && (
            <Descriptions.Item label="Updated At">
              <CalendarOutlined /> {new Date(updatedAt).toLocaleString()}
            </Descriptions.Item>
          )}
        </>
      )}
    </Descriptions>
  );
};

export default LocationDetailView;
