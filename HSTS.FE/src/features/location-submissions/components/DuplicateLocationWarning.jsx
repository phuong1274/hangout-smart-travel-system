import React, { useState, useEffect } from 'react';
import { Alert, Button, Space, Modal, Descriptions, Tag } from 'antd';
import { WarningOutlined, EnvironmentOutlined, EyeOutlined, AimOutlined } from '@ant-design/icons';
import { checkDuplicateLocationApi, getLocationByIdApi } from '../../locations/api';
import styles from '../styles/LocationSubmissionsReviewPage.module.css';

const SimilarityTag = ({ score }) => {
  let color = 'green';
  if (score >= 0.85) color = 'red';
  else if (score >= 0.7) color = 'orange';
  return <Tag color={color}>{Math.round(score * 100)}%</Tag>;
};

// Haversine distance in km
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DuplicateLocationWarning = ({ submissionName, submissionLat, submissionLng }) => {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, location: null });
  const [distances, setDistances] = useState({});

  useEffect(() => {
    if (!submissionName || submissionName.length < 3) return;
    let mounted = true;
    const check = async () => {
      setLoading(true);
      try {
        const params = { name: submissionName };
        if (submissionLat != null && submissionLng != null) {
          params.latitude = submissionLat;
          params.longitude = submissionLng;
          params.radiusKm = 10;
        }
        const results = await checkDuplicateLocationApi(params);
        if (mounted) setDuplicates(results || []);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, [submissionName, submissionLat, submissionLng]);

  // Fetch location details to compute distance
  const loadDistance = async (dup) => {
    if (!submissionLat || !submissionLng || distances[dup.id] != null) return;
    try {
      const loc = await getLocationByIdApi(dup.id);
      if (loc && loc.latitude != null && loc.longitude != null) {
        const dist = haversineKm(submissionLat, submissionLng, loc.latitude, loc.longitude);
        setDistances(prev => ({ ...prev, [dup.id]: dist }));
      }
    } catch { /* ignore */ }
  };

  if (!duplicates.length) return null;

  const handleViewDetails = async (dup) => {
    try {
      const loc = await getLocationByIdApi(dup.id);
      setDetailModal({ open: true, location: loc });
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Alert
        type="warning"
        showIcon={false}
        className={styles.duplicateWarning}
        style={{ marginBottom: 16, borderRadius: 8 }}
        message={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span><strong>Possible Duplicate Detected</strong> — {duplicates.length} similar location{duplicates.length > 1 ? 's' : ''} found</span>
          </Space>
        }
        description={
          <div style={{ marginTop: 12 }}>
            {duplicates.map((dup, idx) => (
              <div
                key={dup.id}
                onMouseEnter={() => loadDistance(dup)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: idx % 2 === 0 ? '#fffbe6' : '#fff',
                  borderRadius: 6,
                  marginBottom: idx < duplicates.length - 1 ? 4 : 0,
                }}
              >
                <div style={{ flex: 1 }}>
                  <Space direction="vertical" size={0}>
                    <Space>
                      <EnvironmentOutlined style={{ color: '#888' }} />
                      <strong>{dup.name}</strong>
                    </Space>
                    {distances[dup.id] != null && (
                      <span style={{ fontSize: 11, color: '#888', paddingLeft: 20 }}>
                        <AimOutlined /> ~{distances[dup.id].toFixed(1)} km away
                      </span>
                    )}
                  </Space>
                </div>
                <Space>
                  <SimilarityTag score={dup.finalScore} />
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetails(dup)}
                  >
                    View Details
                  </Button>
                </Space>
              </div>
            ))}
          </div>
        }
      />

      <Modal
        title={<span><EnvironmentOutlined /> Existing Location Details</span>}
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, location: null })}
        footer={null}
        width={700}
      >
        {detailModal.location && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Name">{detailModal.location.name}</Descriptions.Item>
            <Descriptions.Item label="English Name">{detailModal.location.englishName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Address">{detailModal.location.address || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="District">{detailModal.location.districtName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Province">{detailModal.location.provinceName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Coordinates">
              {detailModal.location.latitude?.toFixed(6)}, {detailModal.location.longitude?.toFixed(6)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default DuplicateLocationWarning;
