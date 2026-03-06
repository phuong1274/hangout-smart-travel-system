import React, { useEffect, useRef, useState } from 'react';
import { Modal, Input, Space, Button, message } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { GOOGLE_MAPS_KEY } from '@/config/constants';

const GoogleMapPicker = ({ open, onClose, onConfirm, initialLat, initialLng }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [latitude, setLatitude] = useState(initialLat || 10.823099); // Default to Ho Chi Minh City
  const [longitude, setLongitude] = useState(initialLng || 106.629664);
  const [searchAddress, setSearchAddress] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);

  // Initialize map
  useEffect(() => {
    if (open && window.google && mapRef.current && !mapInstanceRef.current) {
      const initialPosition = { lat: initialLat || 10.823099, lng: initialLng || 106.629664 };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: initialPosition,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      // Add marker
      markerRef.current = new window.google.maps.Marker({
        position: initialPosition,
        map: mapInstanceRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      // Handle marker drag
      markerRef.current.addListener('dragend', (event) => {
        const position = event.latLng;
        setLatitude(position.lat());
        setLongitude(position.lng());
      });

      // Handle map click
      mapInstanceRef.current.addListener('click', (event) => {
        const position = event.latLng;
        markerRef.current.setPosition(position);
        setLatitude(position.lat());
        setLongitude(position.lng());
      });

      // Setup autocomplete
      if (window.google.maps.places) {
        const autocompleteInstance = new window.google.maps.places.Autocomplete(
          document.getElementById('map-search-input'),
          {
            types: ['geocode'],
          }
        );

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          if (place.geometry && place.geometry.location) {
            const location = place.geometry.location;
            mapInstanceRef.current.setCenter(location);
            mapInstanceRef.current.setZoom(15);
            markerRef.current.setPosition(location);
            setLatitude(location.lat());
            setLongitude(location.lng());
            message.success('Location found!');
          }
        });

        setAutocomplete(autocompleteInstance);
      }
    }
  }, [open, initialLat, initialLng]);

  // Update marker when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && latitude && longitude) {
      const newPosition = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
      markerRef.current.setPosition(newPosition);
      mapInstanceRef.current.setCenter(newPosition);
    }
  }, [latitude, longitude]);

  const handleConfirm = () => {
    onConfirm({ lat: latitude, lng: longitude });
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: userLat, longitude: userLng } = position.coords;
          setLatitude(userLat);
          setLongitude(userLng);
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
    >
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            id="map-search-input"
            placeholder="Search for a place (e.g., 'Ben Thanh Market, Ho Chi Minh City')"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onPressEnter={(e) => {
              // Trigger search if user presses enter
              if (autocomplete) {
                const event = new Event('place_changed', { bubbles: true });
                document.getElementById('map-search-input').dispatchEvent(event);
              }
            }}
            prefix={<SearchOutlined />}
          />
          <Button onClick={handleUseCurrentLocation} icon={<EnvironmentOutlined />}>
            Use My Location
          </Button>
        </Space.Compact>
      </div>

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '450px',
          borderRadius: '8px',
          border: '1px solid #d9d9d9',
        }}
      />

      <div style={{ marginTop: 16, padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Selected Coordinates:</div>
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

      {!GOOGLE_MAPS_KEY && (
        <div style={{ marginTop: 16, padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '6px' }}>
          <strong>⚠️ Google Maps API Key Not Configured</strong>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Please add <code>VITE_GOOGLE_MAPS_KEY</code> to your <code>.env</code> file to enable the map.
            <br />
            You can still manually enter coordinates in the form.
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GoogleMapPicker;
