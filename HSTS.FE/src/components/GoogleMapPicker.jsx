import React, { useEffect, useRef, useState } from 'react';
import { Modal, Input, Space, Button, message } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { GOOGLE_MAPS_KEY } from '@/config/constants';

const GoogleMapPicker = ({ open, onClose, onConfirm, initialLat, initialLng }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  
  const [latitude, setLatitude] = useState(initialLat || 10.823099);
  const [longitude, setLongitude] = useState(initialLng || 106.629664);
  const [searchAddress, setSearchAddress] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize map when modal opens
  useEffect(() => {
    if (!open) return;

    // Wait for Google Maps to load
    if (!window.google || !window.google.maps) {
      setMapError('Google Maps API is not loaded. Please refresh the page.');
      return;
    }

    // Only initialize once
    if (mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapContainerRef.current) return;

      try {
        const initialPosition = { 
          lat: parseFloat(latitude) || 10.823099, 
          lng: parseFloat(longitude) || 106.629664 
        };

        // Create map with smooth fade-in
        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
          zoom: 12,
          center: initialPosition,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          disableDefaultUI: false,
        });
        
        // Add fade-in effect
        if (mapContainerRef.current) {
          mapContainerRef.current.style.opacity = '0';
          mapContainerRef.current.style.transition = 'opacity 0.5s ease-in-out';
          setTimeout(() => {
            mapContainerRef.current.style.opacity = '1';
          }, 100);
        }

        // Create marker with drop animation
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
        const searchInput = document.getElementById('map-search-input');
        if (searchInput && window.google.maps.places) {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInput, {
            types: ['geocode'],
          });

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry && place.geometry.location) {
              const location = place.geometry.location;
              
              // Smooth pan to location
              mapInstanceRef.current.panTo(location);
              
              // Smooth zoom with animation
              const currentZoom = mapInstanceRef.current.getZoom();
              const targetZoom = 15;
              const zoomStep = (targetZoom - currentZoom) / 20;
              let zoomLevel = currentZoom;
              
              const zoomAnimation = setInterval(() => {
                zoomLevel += zoomStep;
                if ((zoomStep > 0 && zoomLevel >= targetZoom) || 
                    (zoomStep < 0 && zoomLevel <= targetZoom)) {
                  clearInterval(zoomAnimation);
                  mapInstanceRef.current.setZoom(targetZoom);
                } else {
                  mapInstanceRef.current.setZoom(Math.round(zoomLevel));
                }
              }, 30);
              
              markerRef.current.setPosition(location);
              setLatitude(location.lat());
              setLongitude(location.lng());
              message.success('Location found!');
            }
          });
        }

        setIsMapLoaded(true);
      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError('Failed to initialize map. Please check your API key.');
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, [open]);

  // Update marker position when coordinates change (with smooth animation)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && latitude && longitude) {
      const newPosition = { 
        lat: parseFloat(latitude), 
        lng: parseFloat(longitude) 
      };
      
      // Smooth pan to new location
      mapInstanceRef.current.panTo(newPosition);
      
      // Smooth zoom in animation
      const currentZoom = mapInstanceRef.current.getZoom();
      const targetZoom = 17; // Zoom in closer for better detail
      const zoomDiff = targetZoom - currentZoom;
      
      if (Math.abs(zoomDiff) > 0.5) {
        const zoomSteps = 20;
        const zoomStep = zoomDiff / zoomSteps;
        let step = 0;
        
        const zoomAnimation = setInterval(() => {
          step++;
          const newZoom = currentZoom + (zoomStep * step);
          
          if (step >= zoomSteps) {
            clearInterval(zoomAnimation);
            mapInstanceRef.current.setZoom(targetZoom);
          } else {
            mapInstanceRef.current.setZoom(Math.round(newZoom));
          }
        }, 25);
      }
      
      // Animate marker drop
      markerRef.current.setPosition(newPosition);
      markerRef.current.setAnimation(window.google.maps.Animation.BOUNCE);
      
      // Stop bounce after animation
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.setAnimation(null);
        }
      }, 1000);
    }
  }, [latitude, longitude]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!open) {
      // Clear references but don't destroy map (for performance)
      setIsMapLoaded(false);
      setMapError(null);
      setSearchAddress('');
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm({ lat: latitude, lng: longitude });
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          // Update coordinates (will trigger smooth pan via useEffect)
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
      destroyOnClose={false}
    >
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            id="map-search-input"
            placeholder="Search for a place (e.g., 'Ben Thanh Market, Ho Chi Minh City')"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            prefix={<SearchOutlined />}
            disabled={!isMapLoaded}
          />
          <Button 
            onClick={handleUseCurrentLocation} 
            icon={<EnvironmentOutlined />} 
            disabled={!isMapLoaded}
          >
            Use My Location
          </Button>
        </Space.Compact>
      </div>

      {mapError && (
        <div style={{ 
          marginBottom: 16, 
          padding: '12px', 
          background: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '6px' 
        }}>
          <strong>⚠️ {mapError}</strong>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            You can still manually enter coordinates in the form below.
          </div>
        </div>
      )}

      {/* Map Container - wrapped in a div to prevent React from managing its children */}
      <div style={{ 
        position: 'relative',
        marginBottom: 16,
        borderRadius: '8px',
        border: '1px solid #d9d9d9',
        overflow: 'hidden',
      }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: isMapLoaded ? '450px' : '200px',
            background: isMapLoaded ? '#fff' : '#f5f5f5',
          }}
        />
        
        {/* Loading/Error Overlay */}
        {!isMapLoaded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#888',
            background: '#f5f5f5',
            pointerEvents: 'none',
          }}>
            <EnvironmentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>{mapError ? 'Map unavailable' : 'Loading map...'}</div>
            {mapError && (
              <div style={{ fontSize: 12, marginTop: 8 }}>
                You can still manually enter coordinates
              </div>
            )}
          </div>
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

      {!GOOGLE_MAPS_KEY && (
        <div style={{ 
          padding: '12px', 
          background: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '6px' 
        }}>
          <strong>⚠️ Google Maps API Key Not Configured</strong>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Please add <code>VITE_GOOGLE_MAPS_KEY</code> to your <code>.env</code> file.
            <br />
            You can still manually enter coordinates in the form.
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GoogleMapPicker;
