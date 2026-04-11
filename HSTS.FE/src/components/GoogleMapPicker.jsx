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

// Component to fly to a new position
const FlyToPosition = ({ lat, lng }) => {
  const map = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (lat && lng) {
      const key = `${lat},${lng}`;
      if (prevRef.current !== key) {
        prevRef.current = key;
        map.flyTo([lat, lng], 15, { duration: 1 });
      }
    }
  }, [lat, lng, map]);
  return null;
};

// Component to fix Leaflet size when rendered inside a modal
const InvalidateSizeOnMount = () => {
  const map = useMap();
  useEffect(() => {
    // Wait for the modal open animation to finish, then recalculate map size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const GoogleMapPicker = ({ open, onClose, onConfirm, initialLat, initialLng }) => {
  const DEFAULT_LAT = 10.823099;
  const DEFAULT_LNG = 106.629664;

  const [latitude, setLatitude] = useState(initialLat || DEFAULT_LAT);
  const [longitude, setLongitude] = useState(initialLng || DEFAULT_LNG);
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  // Sync initial coordinates when modal opens
  useEffect(() => {
    if (open) {
      setLatitude(initialLat || DEFAULT_LAT);
      setLongitude(initialLng || DEFAULT_LNG);
      setSearchValue('');
      setSearchOptions([]);
    }
  }, [open, initialLat, initialLng]);

  const markerPosition = useMemo(() => [latitude, longitude], [latitude, longitude]);

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
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          message.success('Current location detected!');
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
    setLatitude(option.lat);
    setLongitude(option.lon);
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
      okText="Confirm Location"
      cancelText="Cancel"
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
            center={markerPosition}
            zoom={12}
            style={{ width: '100%', height: '450px' }}
            key={`${initialLat}-${initialLng}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={markerPosition}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  setLatitude(lat);
                  setLongitude(lng);
                },
              }}
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <FlyToPosition lat={latitude} lng={longitude} />
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
            💡 Tip: Click anywhere on the map or drag the marker to adjust the location
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default GoogleMapPicker;
