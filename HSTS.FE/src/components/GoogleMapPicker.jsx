import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Modal, Input, Space, Button, message, AutoComplete } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map clicks
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to re-center map when position changes
const MapPositionUpdater = ({ lat, lng }) => {
  const map = useMap();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (!map) return;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    if (!isFinite(lat) || !isFinite(lng)) return;
    try {
      map.panTo([lat, lng]);
    } catch { /* ignore bad coord */ }
  }, [lat, lng, map]);
  return null;
};

// Component to fix Leaflet size when rendered inside a modal
const InvalidateSizeOnMount = () => {
  const map = useMap();
  useEffect(() => {
    // Re-invalidate a few times to avoid blank map when opened over another modal.
    const timeouts = [150, 350, 650].map((delay) => setTimeout(() => {
      map.invalidateSize();
    }, delay));

    return () => {
      timeouts.forEach((timer) => clearTimeout(timer));
    };
  }, [map]);
  return null;
};

const GoogleMapPicker = ({ open, onClose, onConfirm, initialLat, initialLng, zIndex = 1300 }) => {
  const DEFAULT_LAT = 10.823099;
  const DEFAULT_LNG = 106.629664;

  const sanitizeCoord = (val, fallback) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  };

  const [latitude, setLatitude] = useState(() => sanitizeCoord(initialLat, DEFAULT_LAT));
  const [longitude, setLongitude] = useState(() => sanitizeCoord(initialLng, DEFAULT_LNG));
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  // Sync initial coordinates when modal opens
  useEffect(() => {
    if (open) {
      setLatitude(sanitizeCoord(initialLat, DEFAULT_LAT));
      setLongitude(sanitizeCoord(initialLng, DEFAULT_LNG));
      setSearchValue('');
      setSearchOptions([]);
    }
  }, [open, initialLat, initialLng]);

  const safeLat = Number.isFinite(latitude) ? latitude : DEFAULT_LAT;
  const safeLng = Number.isFinite(longitude) ? longitude : DEFAULT_LNG;
  const centerPosition = useMemo(() => [safeLat, safeLng], [safeLat, safeLng]);

  const handleMapClick = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleConfirm = () => {
    onConfirm(latitude, longitude);
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setLatitude(lat);
            setLongitude(lng);
            message.success('Current location detected!');
          } else {
            message.error('Invalid location data from browser');
          }
        },
        () => {
          message.error('Unable to get current location');
        }
      );
    } else {
      message.error('Geolocation is not supported by this browser');
    }
  };

  // Nominatim search (OSM geocoding)
  const handleSearch = (value) => {
    setSearchValue(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value || value.length < 3) {
      setSearchOptions([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSearchOptions(
          data.map((item) => ({
            value: `${item.lat},${item.lon}`,
            label: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          }))
        );
      } catch {
        setSearchOptions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectPlace = (value, option) => {
    const lat = Number(option.lat);
    const lon = Number(option.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      message.warning('Invalid location data received');
      return;
    }
    setLatitude(lat);
    setLongitude(lon);
    setSearchValue(option.label);
    message.success('Location found!');
  };

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined />
          Pick Location on Map
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      width={900}
      zIndex={zIndex}
      okText="Confirm Location"
      cancelText="Cancel"
      maskClosable={false}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <AutoComplete
            style={{ flex: 1 }}
            options={searchOptions}
            value={searchValue}
            onSearch={handleSearch}
            onSelect={handleSelectPlace}
            placeholder="Search for a place (e.g., 'Ben Thanh Market, Ho Chi Minh City')"
          >
            <Input prefix={<SearchOutlined />} />
          </AutoComplete>
          <Button
            onClick={handleUseCurrentLocation}
            icon={<EnvironmentOutlined />}
          >
            Use My Location
          </Button>
        </Space.Compact>
      </div>

      {/* Map Container */}
      <div style={{
        position: 'relative',
        marginBottom: 16,
        borderRadius: '8px',
        border: '1px solid #d9d9d9',
        overflow: 'hidden',
      }}>
        {open && (
          <MapContainer
            center={centerPosition}
            zoom={12}
            style={{ width: '100%', height: '450px' }}
            key={`map-${safeLat.toFixed(6)}-${safeLng.toFixed(6)}`}
          >
            <TileLayer
              url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
              maxZoom={20}
            />
            <Marker
              position={centerPosition}
              draggable={false}
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <MapPositionUpdater lat={safeLat} lng={safeLng} />
            <InvalidateSizeOnMount />
          </MapContainer>
        )}
      </div>

      {/* Coordinates Display */}
      <div style={{
        padding: '12px',
        background: '#f5f5f5',
        borderRadius: '6px',
        marginBottom: 16,
      }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Selected Coordinates:
          </div>
          <Space direction="horizontal" size="large">
            <div>
              <strong>Latitude:</strong> {latitude?.toFixed(6) || 'N/A'}
            </div>
            <div>
              <strong>Longitude:</strong> {longitude?.toFixed(6) || 'N/A'}
            </div>
          </Space>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            💡 Tip: Click anywhere on the map to adjust the location
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default GoogleMapPicker;
