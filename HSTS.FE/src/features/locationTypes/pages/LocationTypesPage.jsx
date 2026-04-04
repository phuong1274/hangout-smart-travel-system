import React, { useState } from 'react';
import { Card, Typography, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import { useLocationTypes } from '../hooks/useLocationTypes';
import LocationTypeTable from '../components/LocationTypeTable';
import LocationTypeForm from '../components/LocationTypeForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteLocationTypeApi, getLocationTypeByIdApi } from '../api';
import styles from '../styles/LocationTypesPage.module.css';

const { Title } = Typography;

const LocationTypesPage = () => {
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchLocationTypes,
  } = useLocationTypes();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLocationType, setEditingLocationType] = useState(null);
  const [viewingLocationType, setViewingLocationType] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleCreate = () => {
    setEditingLocationType(null);
    setFormOpen(true);
  };

  const handleEdit = (locationType) => {
    setEditingLocationType(locationType);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingLocationType(null);
  };

  const handleFormSuccess = () => {
    fetchLocationTypes();
  };

  const handleView = async (locationType) => {
    try {
      const detail = await getLocationTypeByIdApi(locationType.id);
      setViewingLocationType(detail);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load location type details');
    }
  };

  const handleDelete = async (locationType) => {
    try {
      await deleteLocationTypeApi(locationType.id);
      message.success('Location type deleted successfully');
      fetchLocationTypes();
    } catch (error) {
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div className={styles.titleGroup}>
            <Title level={2} className={styles.mainTitle}>Location Type Management</Title>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
            className={styles.addBtn}
          >
            ADD LOCATION TYPE
          </Button>
        </div>
        
        <Card className={styles.mainCard}>
          <div className={styles.filterSection}>
            <SearchFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search location types..."
            />
          </div>
          <LocationTypeTable
            data={data}
            loading={loading}
            pagination={pagination}
            onTableChange={handleTableChange}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
          />
        </Card>
      </div>

      <LocationTypeForm
        open={formOpen}
        locationType={editingLocationType}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingLocationType(null);
        }}
        data={viewingLocationType}
        type="locationType"
      />
    </div>
  );
};

export default LocationTypesPage;