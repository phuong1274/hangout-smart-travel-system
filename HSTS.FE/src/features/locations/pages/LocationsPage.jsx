import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, Layout, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import LocationFilter from '@/components/UI/LocationFilter';
import { useLocations } from '../hooks/useLocations';
import LocationTable from '../components/LocationTable';
import LocationForm from '../components/LocationForm';
import DetailModal from '@/components/DetailModal';
import ClosureModal from '../components/ClosureModal';
import ClosureHistoryModal from '../components/ClosureHistoryModal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { deleteLocationApi, getLocationByIdApi } from '../api';
import { getClosuresByLocationApi, endClosureApi } from '../api/closures';
import { fetchReferenceData, getCachedReferenceData } from '@/utils/locationCache';
import { transformLocationForDisplay } from '@/utils/locationMappers';

const { Title } = Typography;
const { Header, Content } = Layout;

const LocationsPage = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchLocations,
  } = useLocations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [viewingLocation, setViewingLocation] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Closure states
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureHistoryModalOpen, setClosureHistoryModalOpen] = useState(false);
  const [selectedLocationForClosure, setSelectedLocationForClosure] = useState(null);
  const [closingLocation, setClosingLocation] = useState(null);
  
  // Reference data for mapping IDs to names (cached to prevent duplicate API calls)
  const [referenceData, setReferenceData] = useState({ allTags: [], locationTypes: [], amenities: [] });
  const [referenceDataLoading, setReferenceDataLoading] = useState(false);

  // Fetch reference data once on mount (cached for reuse)
  useEffect(() => {
    const loadReferenceData = async () => {
      // Check cache first
      const cached = getCachedReferenceData();
      if (cached) {
        setReferenceData(cached);
        return;
      }

      setReferenceDataLoading(true);
      try {
        const refData = await fetchReferenceData();
        setReferenceData(refData);
      } catch (error) {
        console.error('Failed to load reference data:', error);
        message.error('Failed to load reference data');
      } finally {
        setReferenceDataLoading(false);
      }
    };

    loadReferenceData();
  }, []);

  const handleCreate = () => {
    setEditingLocation(null);
    setFormOpen(true);
  };

  const handleEdit = async (location) => {
    try {
      // Fetch full location details including opening hours and seasons
      const fullLocation = await getLocationByIdApi(location.id);
      setEditingLocation(fullLocation);
      setFormOpen(true);
    } catch (error) {
      message.error('Failed to load location details for editing');
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingLocation(null);
  };

  const handleFormSuccess = () => {
    fetchLocations();
  };

  const handleView = async (location) => {
    try {
      const detail = await getLocationByIdApi(location.id);
      // Transform data: map IDs to readable names using cached reference data
      const transformedData = transformLocationForDisplay(detail, referenceData);
      setViewingLocation(transformedData);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Failed to load location details:', error);
      message.error('Failed to load location details');
    }
  };

  const handleDelete = async (location) => {
    try {
      await deleteLocationApi(location.id);
      message.success('Location deleted successfully');
      fetchLocations();
    } catch (error) {
      // Handled by global interceptor
    }
  };

  // Closure handlers
  const handleCloseLocation = (location) => {
    setClosingLocation(location);
    setClosureModalOpen(true);
  };

  const handleOpenLocation = async (location) => {
    try {
      const closures = await getClosuresByLocationApi(location.id);
      const activeClosure = closures?.find(c => c.isActive);
      if (activeClosure) {
        await endClosureApi(activeClosure.id);
        message.success(`"${location.name}" is now open.`);
        fetchLocations();
      } else {
        message.warning('No active closure found. The location may already be open.');
        fetchLocations();
      }
    } catch (error) {
      message.error('Failed to open location.');
    }
  };

  const handleViewClosureHistory = (location) => {
    setSelectedLocationForClosure(location);
    setClosureHistoryModalOpen(true);
  };

  const handleClosureSuccess = () => {
    setClosureModalOpen(false);
    setClosingLocation(null);
    fetchLocations();
  };

  const handleClosureModalClose = () => {
    setClosureModalOpen(false);
    setClosingLocation(null);
  };

  const handleClosureHistoryModalClose = () => {
    setClosureHistoryModalOpen(false);
    setSelectedLocationForClosure(null);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Hangout - Locations</Title>
        </div>
        <Button type="primary" onClick={() => navigate(PATHS.AUTH.LOGIN)}>
          Login
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>Location Management</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Location
            </Button>
          </div>
          <Card>
            <LocationFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search locations..."
            />
            <LocationTable
              data={data}
              loading={loading}
              pagination={pagination}
              onTableChange={handleTableChange}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
              onCloseLocation={handleCloseLocation}
              onOpenLocation={handleOpenLocation}
              onViewClosureHistory={handleViewClosureHistory}
            />
          </Card>
        </Space>
      </Content>
      <LocationForm
        open={formOpen}
        location={editingLocation}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingLocation(null);
        }}
        data={viewingLocation}
        type="location"
      />

      {/* Closure Modal */}
      <ClosureModal
        open={closureModalOpen}
        onClose={handleClosureModalClose}
        onSuccess={handleClosureSuccess}
        locationId={closingLocation?.id}
        locationName={closingLocation?.name}
      />

      {/* Closure History Modal */}
      <ClosureHistoryModal
        open={closureHistoryModalOpen}
        onClose={handleClosureHistoryModalClose}
        locationId={selectedLocationForClosure?.id}
        locationName={selectedLocationForClosure?.name}
        onClosureChange={fetchLocations}
      />
    </Layout>
  );
};

export default LocationsPage;
