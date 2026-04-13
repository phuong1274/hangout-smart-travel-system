import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Space, AutoComplete, message, Row, Col } from 'antd';
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createTransitHubApi, updateTransitHubApi } from '../api';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const MapPositionUpdater = ({ lat, lng }) => {
  const map = useMap();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try { map.panTo([lat, lng]); } catch { /* ignore */ }
  }, [lat, lng, map]);
  return null;
};

const InvalidateSizeOnMount = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const DEFAULT_LAT = 10.823099;
const DEFAULT_LNG = 106.629664;

const TransitHubForm = ({ open, transitHub, onClose, onSuccess, districts, transportModes, transitHubTypes }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState([]);
  const searchTimerRef = useRef(null);
  const isEdit = !!transitHub;

  useEffect(() => {
    if (open) {
      if (transitHub) {
        form.setFieldsValue({
          code: transitHub.code,
          name: transitHub.name,
          districtId: transitHub.districtId,
          transportationId: transitHub.transportationId,
          transitHubTypeId: transitHub.transitHubTypeId,
        });
        setLatitude(transitHub.latitude || DEFAULT_LAT);
        setLongitude(transitHub.longitude || DEFAULT_LNG);
      } else {
        form.resetFields();
        setLatitude(DEFAULT_LAT);
        setLongitude(DEFAULT_LNG);
      }
      setSearchValue('');
      setSearchOptions([]);
    }
  }, [transitHub, form, open]);

  const safeLat = Number.isFinite(latitude) ? latitude : DEFAULT_LAT;
  const safeLng = Number.isFinite(longitude) ? longitude : DEFAULT_LNG;
  const centerPosition = useMemo(() => [safeLat, safeLng], [safeLat, safeLng]);

  const handleMapClick = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSearchPlace = (value) => {
    setSearchValue(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value || value.length < 3) { setSearchOptions([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSearchOptions(data.map((item) => ({
          value: `${item.lat},${item.lon}`,
          label: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        })));
      } catch { setSearchOptions([]); }
    }, 400);
  };

  const handleSelectPlace = (_value, option) => {
    const lat = Number(option.lat);
    const lon = Number(option.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setLatitude(lat);
      setLongitude(lon);
      setSearchValue(option.label);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          message.success('Current location detected!');
        },
        () => message.error('Unable to get current location')
      );
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = { ...values, latitude: safeLat, longitude: safeLng };
      if (isEdit) {
        await updateTransitHubApi(transitHub.id, payload);
      } else {
        await createTransitHubApi(payload);
      }
      onSuccess();
      onClose();
    } catch {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined />
          {isEdit ? 'Edit Transit Hub' : 'Create Transit Hub'}
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      width={900}
      okText={isEdit ? 'Update' : 'Create'}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: 'Please enter code' }]}>
              <Input placeholder="e.g., SGN, HAN" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter name' }]}>
              <Input placeholder="e.g., Tan Son Nhat Airport" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="districtId" label="District" rules={[{ required: true, message: 'Please select district' }]}>
              <Select
                showSearch
                placeholder="Select district"
                optionFilterProp="label"
                options={(districts || []).map(d => ({ value: d.id, label: d.name }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="transportationId" label="Transport Mode" rules={[{ required: true, message: 'Please select transport mode' }]}>
              <Select
                showSearch
                placeholder="Select transport mode"
                optionFilterProp="label"
                options={(transportModes || []).map(t => ({ value: t.id, label: t.name }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="transitHubTypeId" label="Hub Type" rules={[{ required: true, message: 'Please select hub type' }]}>
              <Select
                showSearch
                placeholder="Select hub type"
                optionFilterProp="label"
                options={(transitHubTypes || []).map(t => ({ value: t.id, label: t.name }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* Map Section */}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#1A535C' }}>
          Pick Location on Map
        </div>
        <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
          <AutoComplete
            style={{ flex: 1 }}
            options={searchOptions}
            value={searchValue}
            onSearch={handleSearchPlace}
            onSelect={handleSelectPlace}
            placeholder="Search for a place..."
          >
            <Input prefix={<SearchOutlined />} />
          </AutoComplete>
          <Button onClick={handleUseCurrentLocation} icon={<EnvironmentOutlined />}>
            My Location
          </Button>
        </Space.Compact>

        <div style={{ borderRadius: 8, border: '1px solid #d9d9d9', overflow: 'hidden', marginBottom: 12 }}>
          {open && (
            <MapContainer
              center={centerPosition}
              zoom={12}
              style={{ width: '100%', height: 350 }}
              key={`map-${isEdit ? transitHub?.id : 'new'}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={centerPosition}
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
              <MapPositionUpdater lat={safeLat} lng={safeLng} />
              <InvalidateSizeOnMount />
            </MapContainer>
          )}
        </div>

        <div style={{ padding: 10, background: '#f5f5f5', borderRadius: 6, display: 'flex', gap: 24 }}>
          <div><strong>Latitude:</strong> {safeLat.toFixed(6)}</div>
          <div><strong>Longitude:</strong> {safeLng.toFixed(6)}</div>
        </div>
      </div>
    </Modal>
  );
};

export default TransitHubForm;
