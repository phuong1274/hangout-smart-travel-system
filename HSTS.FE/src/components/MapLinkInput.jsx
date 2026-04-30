import React, { useState } from 'react';
import { Input, Button, Space, Typography, message } from 'antd';
import { LinkOutlined, LoadingOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { parseMapLink, isShortLink, resolveShortLink } from '@/utils/map-link-parser';
import styles from './MapLinkInput.module.css';

const { Text } = Typography;

const MapLinkInput = ({ onParsed, onError, className }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const performParse = async (urlToParse) => {
    const trimmed = urlToParse.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const result = parseMapLink(trimmed);

      if (!result && !isShortLink(trimmed)) {
        message.warning('Could not extract location data from this URL');
        return;
      }

      let finalResult = { lat: null, lng: null, address: null, name: null };

      // Merge any client-side parsed data
      if (result && !result.needsServerResolution) {
        finalResult = { ...finalResult, lat: result.lat, lng: result.lng, address: result.address, name: result.name };
      }

      // If short link, resolve via backend
      if (isShortLink(trimmed)) {
        try {
          const resolved = await resolveShortLink(trimmed);
          if (resolved) {
            finalResult = {
              lat: resolved.latitude ?? finalResult.lat,
              lng: resolved.longitude ?? finalResult.lng,
              address: resolved.address ?? finalResult.address,
              name: resolved.name ?? finalResult.name,
            };
          }
        } catch (err) {
          console.error('Short link resolution failed:', err);
        }
      }

      const fields = [];
      if (finalResult.lat != null) fields.push('coordinates');
      if (finalResult.address) fields.push('address');
      if (finalResult.name) fields.push('name');

      if (fields.length > 0) {
        onParsed(finalResult);
        message.success(`Auto-filled: ${fields.join(', ')}`);
      } else {
        message.warning('No location data found in this link');
      }
    } catch (err) {
      message.error('Failed to parse map link');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleParse = () => {
    performParse(url);
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText && (pastedText.includes('maps.apple.com') ||
        pastedText.includes('google.com/maps') ||
        pastedText.includes('maps.app.goo.gl') ||
        pastedText.includes('goo.gl/maps'))) {
      e.preventDefault();
      setUrl(pastedText);
      performParse(pastedText);
    }
  };

  return (
    <div className={`${styles.wrapper} ${className || ''}`}>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          prefix={loading ? <LoadingOutlined /> : <LinkOutlined />}
          placeholder="Paste Google Maps or Apple Maps link..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          onPressEnter={handleParse}
          className={styles.input}
          allowClear
        />
        <Button
          type="primary"
          onClick={handleParse}
          loading={loading}
          disabled={!url.trim()}
          icon={<EnvironmentOutlined />}
        >
          Fill
        </Button>
      </Space.Compact>
      <Text type="secondary" className={styles.hint}>
        Paste a share link from Google Maps or Apple Maps to auto-fill location data
      </Text>
    </div>
  );
};

export default MapLinkInput;
