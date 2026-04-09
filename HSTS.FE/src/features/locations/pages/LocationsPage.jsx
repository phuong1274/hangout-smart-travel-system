import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import LocationFilter from '@/components/UI/LocationFilter';
import { useLocations } from '../hooks/useLocations';
import LocationTable from '../components/LocationTable';
import LocationForm from '../components/LocationForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
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
      } catch (error) {
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
    } catch (error) {
    }
  };

  return (
    <div className={styles.appWrapper}>
      <div className={styles.content}>
        <div className={styles.floatingCircle1}></div>
        <div className={styles.floatingCircle2}></div>

        <Space direction="vertical" size="large" className={styles.mainContainer}>
          <div className={styles.pageHeader}>
            <Title level={2} className={styles.mainHeading}>Location Management</Title>
          </div>

          <Card className={styles.dataCard} bordered={false}>
            <div className={styles.cardHeader}>
              <Title level={4} className={styles.cardTitle}>Filter Locations</Title>
              <Button className={styles.ctaBtn} icon={<PlusOutlined />} onClick={handleCreate}>
                Add Location
              </Button>
            </div>

            <div className={styles.filterSection}>
              <LocationFilter
                onSearch={handleSearch}
                loading={loading}
              />
            </div>
            
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
    </div>
  );
};

export default LocationsPage;