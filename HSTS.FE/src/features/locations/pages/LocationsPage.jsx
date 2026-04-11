import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import LocationFilter from '@/components/UI/LocationFilter';
import { useLocations } from '../hooks/useLocations';
import LocationTable from '../components/LocationTable';
import LocationForm from '../components/LocationForm';
import DetailModal from '@/components/DetailModal';
import ClosureModal from '../components/ClosureModal';
import ClosureHistoryModal from '../components/ClosureHistoryModal';
import { deleteLocationApi, getLocationByIdApi } from '../api';
import { fetchReferenceData, getCachedReferenceData } from '@/utils/locationCache';
import { transformLocationForDisplay } from '@/utils/locationMappers';
import styles from '../styles/LocationsPage.module.css';

const { Title } = Typography;

const LocationsPage = () => {
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

  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureHistoryModalOpen, setClosureHistoryModalOpen] = useState(false);
  const [selectedLocationForClosure, setSelectedLocationForClosure] = useState(null);
  const [closingLocation, setClosingLocation] = useState(null);
  
  const [referenceData, setReferenceData] = useState({ allTags: [], locationTypes: [], amenities: [] });
  const [referenceDataLoading, setReferenceDataLoading] = useState(false);

  useEffect(() => {
    const loadReferenceData = async () => {
      const cached = getCachedReferenceData();
      if (cached) {
        setReferenceData(cached);
        return;
      }

      setReferenceDataLoading(true);
      try {
        const refData = await fetchReferenceData();
        setReferenceData(refData);
      } catch (error) {}
    };

    loadReferenceData();
  }, []);

  const handleCreate = () => {
    setEditingLocation(null);
    setFormOpen(true);
  };

  const handleEdit = async (location) => {
    try {
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
      const transformedData = transformLocationForDisplay(detail, referenceData);
      setViewingLocation(transformedData);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load location details');
    }
  };

  const handleDelete = async (location) => {
    try {
      await deleteLocationApi(location.id);
      message.success('Location deleted successfully');
      fetchLocations();
    } catch (error) {}
  };

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
    <div className={styles.layout}>
      <div className={styles.floatingCircle1}></div>
      <div className={styles.floatingCircle2}></div>
      
      <div className={styles.content}>
        <Space direction="vertical" size="large" className={styles.mainContainer}>
          <div className={styles.pageHeader}>
            <Title level={2} className={styles.pageTitle}>Location Management</Title>
          </div>
          <Card className={styles.mainCard} bordered={false}>
            <LocationFilter
              onSearch={handleSearch}
              loading={loading}
              actionButton={
                <Button className={styles.btnCreate} icon={<PlusOutlined />} onClick={handleCreate}>
                  ADD LOCATION
                </Button>
              }
            />
            <LocationTable
              data={data}
              loading={loading}
              pagination={pagination}
              onTableChange={handleTableChange}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
            />
          </Card>
        </Space>
      </div>

      <LocationForm
        open={formOpen}
        location={editingLocation}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
      
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingLocation(null);
        }}
        data={viewingLocation}
        type="location"
      />
      
      <ClosureModal
        open={closureModalOpen}
        onClose={handleClosureModalClose}
        onSuccess={handleClosureSuccess}
        locationId={closingLocation?.id}
        locationName={closingLocation?.name}
      />
      
      <ClosureHistoryModal
        open={closureHistoryModalOpen}
        onClose={handleClosureHistoryModalClose}
        locationId={selectedLocationForClosure?.id}
        locationName={selectedLocationForClosure?.name}
        onClosureChange={fetchLocations}
      />
    </div>
  );
};

export default LocationsPage;