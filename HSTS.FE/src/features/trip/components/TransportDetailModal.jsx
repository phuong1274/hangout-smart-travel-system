import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, Descriptions, Typography, Divider, Spin } from 'antd';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getLocationByIdApi } from '../api';
import { getOsrmRoute } from '../api/osrm';

const { Text } = Typography;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const parseCoordinate = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const getEnglishPreferredName = (item) => {
  const englishName = String(item?.englishName || item?.EnglishName || '').trim();
  const localName = String(item?.name || item?.Name || '').trim();
  return englishName || localName || '';
};

const resolvePointFromLocation = async (locationId, fallbackName) => {
  if (!locationId) return null;
  const location = await getLocationByIdApi(locationId);
  const latitude = parseCoordinate(location?.latitude ?? location?.Latitude);
  const longitude = parseCoordinate(location?.longitude ?? location?.Longitude);

  if (latitude == null || longitude == null) {
    return null;
  }

  return {
    lat: latitude,
    lng: longitude,
    name: getEnglishPreferredName(location) || fallbackName || `Location #${locationId}`,
  };
};

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) return;
    map.fitBounds(points, { padding: [28, 28] });
  }, [map, points]);

  return null;
};

const formatMoney = (moneyDto) => {
  if (!moneyDto) return 'N/A';
  const amount = moneyDto.amount ?? moneyDto.Amount ?? 0;
  const currency = moneyDto.currency || moneyDto.Currency || 'VND';
  return `${amount.toLocaleString()} ${currency}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
};

const TransportDetailModal = ({ open, data, onClose }) => {
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [fromPoint, setFromPoint] = useState(null);
  const [toPoint, setToPoint] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeMeta, setRouteMeta] = useState(null);

  const payload = data || {};
  const title = payload.title || payload.Title || 'Transport';
  const startTime = payload.startTime || payload.StartTime;
  const endTime = payload.endTime || payload.EndTime;
  const costForGroup = payload.costForGroup || payload.CostForGroup;
  const ticketCost = payload.ticketCost || payload.TicketCost;
  const note = payload.note || payload.Note;
  const travelDetail = payload.travelDetail || payload.TravelDetail || null;
  // Extract travel leg details
  const fromName = pickFirst(
    travelDetail?.fromEnglishName,
    travelDetail?.FromEnglishName,
    travelDetail?.fromName,
    travelDetail?.FromName,
    travelDetail?.from,
    travelDetail?.From,
    '',
  );
  const toName = pickFirst(
    travelDetail?.toEnglishName,
    travelDetail?.ToEnglishName,
    travelDetail?.toName,
    travelDetail?.ToName,
    travelDetail?.to,
    travelDetail?.To,
    '',
  );
  const distanceKm = travelDetail?.distanceKm || travelDetail?.DistanceKm || travelDetail?.distance || travelDetail?.Distance;
  const durationMinutes = travelDetail?.durationMinutes || travelDetail?.DurationMinutes || travelDetail?.duration || travelDetail?.Duration;
  const mode = travelDetail?.mode || travelDetail?.Mode || travelDetail?.transportMode || travelDetail?.TransportMode || '';
  const price = travelDetail?.price || travelDetail?.Price || travelDetail?.cost || travelDetail?.Cost;

  const fromLocationId = pickFirst(travelDetail?.fromLocationId, travelDetail?.FromLocationId);
  const toLocationId = pickFirst(travelDetail?.toLocationId, travelDetail?.ToLocationId);

  const hasDirectCoordinates = useMemo(() => {
    const fromLat = parseCoordinate(pickFirst(travelDetail?.fromLatitude, travelDetail?.FromLatitude));
    const fromLng = parseCoordinate(pickFirst(travelDetail?.fromLongitude, travelDetail?.FromLongitude));
    const toLat = parseCoordinate(pickFirst(travelDetail?.toLatitude, travelDetail?.ToLatitude));
    const toLng = parseCoordinate(pickFirst(travelDetail?.toLongitude, travelDetail?.ToLongitude));

    if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
      return null;
    }

    return {
      from: { lat: fromLat, lng: fromLng, name: fromName || 'Start' },
      to: { lat: toLat, lng: toLng, name: toName || 'Destination' },
    };
  }, [fromName, toName, travelDetail]);

  useEffect(() => {
    if (!open || !travelDetail) {
      setFromPoint(null);
      setToPoint(null);
      setRoutePath([]);
      setRouteMeta(null);
      setMapError('');
      return;
    }

    let cancelled = false;

    const loadRoute = async () => {
      setMapLoading(true);
      setMapError('');

      try {
        let from = hasDirectCoordinates?.from || null;
        let to = hasDirectCoordinates?.to || null;

        if (!from && fromLocationId) {
          from = await resolvePointFromLocation(fromLocationId, fromName);
        }
        if (!to && toLocationId) {
          to = await resolvePointFromLocation(toLocationId, toName);
        }

        if (!from || !to) {
          throw new Error('Insufficient coordinates to draw route map.');
        }

        const route = await getOsrmRoute(from, to);
        if (!route) {
          throw new Error('OSRM did not return a route geometry.');
        }

        if (!cancelled) {
          setFromPoint(from);
          setToPoint(to);
          setRoutePath(route.path || []);
          setRouteMeta(route);
        }
      } catch (error) {
        if (!cancelled) {
          setRoutePath([]);
          setRouteMeta(null);
          setMapError(error?.message || 'Unable to load route map.');
        }
      } finally {
        if (!cancelled) {
          setMapLoading(false);
        }
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [open, travelDetail, hasDirectCoordinates, fromLocationId, toLocationId, fromName, toName]);

  const osrmDistanceKm = routeMeta?.distanceMeters != null
    ? Number((routeMeta.distanceMeters / 1000).toFixed(1))
    : null;
  const osrmDurationMinutes = routeMeta?.durationSeconds != null
    ? Math.round(routeMeta.durationSeconds / 60)
    : null;
  const boundsPoints = routePath.length > 0
    ? routePath
    : [
      fromPoint ? [fromPoint.lat, fromPoint.lng] : null,
      toPoint ? [toPoint.lat, toPoint.lng] : null,
    ].filter(Boolean);

  if (!open || !data) return null;

  return (
    <Drawer
      title={`🚌 ${title}`}
      open={open}
      onClose={onClose}
      placement="right"
      width={860}
      destroyOnClose
    >
      {/* Route */}
      <Divider orientation="left" plain>Route</Divider>
      <Descriptions size="small" column={1} bordered>
        {fromName && (
          <Descriptions.Item label="📍 Departure">{fromName}</Descriptions.Item>
        )}
        {toName && (
          <Descriptions.Item label="📍 Destination">{toName}</Descriptions.Item>
        )}
        {startTime && (
          <Descriptions.Item label="🕐 Departure Time">{formatTime(startTime)}</Descriptions.Item>
        )}
        {endTime && (
          <Descriptions.Item label="🕐 Arrival Time">{formatTime(endTime)}</Descriptions.Item>
        )}
        {durationMinutes && (
          <Descriptions.Item label="⏱️ Duration">
            {durationMinutes >= 60
              ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60 > 0 ? durationMinutes % 60 + ' min' : ''}`
              : `${durationMinutes} min`}
          </Descriptions.Item>
        )}
        {distanceKm && (
          <Descriptions.Item label="📏 Distance">{distanceKm} km</Descriptions.Item>
        )}
        {mode && (
          <Descriptions.Item label="🚗 Transport Mode">{mode}</Descriptions.Item>
        )}
      </Descriptions>

      {/* OSRM Map */}
      <Divider orientation="left" plain>Map (OSRM)</Divider>
      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 8,
          minHeight: 280,
          background: '#fafafa',
          marginBottom: 12,
        }}
      >
        {mapLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 250 }}>
            <Spin />
          </div>
        ) : mapError ? (
          <Text type="secondary">{mapError}</Text>
        ) : fromPoint && toPoint && boundsPoints.length > 0 ? (
          <MapContainer
            center={[fromPoint.lat, fromPoint.lng]}
            zoom={11}
            style={{ width: '100%', height: 260, borderRadius: 6 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[fromPoint.lat, fromPoint.lng]} />
            <Marker position={[toPoint.lat, toPoint.lng]} />
            {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#1677ff', weight: 5 }} />}
            <FitBounds points={boundsPoints} />
          </MapContainer>
        ) : (
          <Text type="secondary">No route map data available for this leg.</Text>
        )}
      </div>
      {(osrmDistanceKm != null || osrmDurationMinutes != null) && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            OSRM estimate: {osrmDistanceKm != null ? `${osrmDistanceKm} km` : 'N/A'}
            {' • '}
            {osrmDurationMinutes != null ? `${osrmDurationMinutes} min` : 'N/A'}
          </Text>
        </div>
      )}

      {/* Cost */}
      <Divider orientation="left" plain>Fare</Divider>
      <Descriptions size="small" column={1} bordered>
        {ticketCost && (
          <Descriptions.Item label="💰 Price/person">{formatMoney(ticketCost)}</Descriptions.Item>
        )}
        {costForGroup && (
          <Descriptions.Item label="💰 Group Total">{formatMoney(costForGroup)}</Descriptions.Item>
        )}
        {price && !ticketCost && (
          <Descriptions.Item label="💰 Cost">{formatMoney(price)}</Descriptions.Item>
        )}
      </Descriptions>

      {/* Note */}
      {note && (
        <>
          <Divider orientation="left" plain>Note</Divider>
          <Text type="secondary">{note}</Text>
        </>
      )}
    </Drawer>
  );
};

export default TransportDetailModal;
