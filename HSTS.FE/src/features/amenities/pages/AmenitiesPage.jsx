import React, { useState } from 'react';
import { Card, Typography, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useAmenities } from '../hooks/useAmenities';
import AmenityTable from '../components/AmenityTable';
import AmenityForm from '../components/AmenityForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteAmenityApi, getAmenityByIdApi } from '../api';
import styles from '../styles/AmenitiesPage.module.css';

const { Title } = Typography;

const AmenitiesPage = () => {
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchAmenities,
  } = useAmenities();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [viewingAmenity, setViewingAmenity] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleCreate = () => {
    setEditingAmenity(null);
    setFormOpen(true);
  };

  const handleEdit = (amenity) => {
    setEditingAmenity(amenity);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingAmenity(null);
  };

  const handleFormSuccess = () => {
    fetchAmenities();
  };

  const handleView = async (amenity) => {
    try {
      const detail = await getAmenityByIdApi(amenity.id);
      setViewingAmenity(detail);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load amenity details');
    }
  };

  const handleDelete = async (amenity) => {
    try {
      await deleteAmenityApi(amenity.id);
      message.success('Amenity deleted successfully');
      fetchAmenities();
    } catch (error) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const inUseError = errors.find(e => e.code === 'Amenity.InUse');
        if (inUseError) {
          message.error(inUseError.description || 'Cannot delete amenity that is in use.');
          return;
        }
      }
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.ambientCircle1}></div>
      <div className={styles.ambientCircle2}></div>

      <div className={styles.content}>
        <div className={styles.contentContainer}>
          <div className={styles.sectionHeader}>
            <Title level={2} className={styles.pageHeading}>Amenity Management</Title>
          </div>

          <div className={styles.staggerReveal}>
            <Card>
              <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                  <SearchFilter
                    onSearch={handleSearch}
                    loading={loading}
                    placeholder="Search amenities..."
                  />
                </div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleCreate}
                  className={styles.addBtnTropical}
                >
                  Add Amenity
                </Button>
              </div>

              <AmenityTable
                data={data}
                loading={loading}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleDelete}
              />

              <div className={styles.paginationContainer}>
                <AppPagination
                  current={pagination?.current}
                  pageSize={pagination?.pageSize}
                  total={pagination?.total}
                  onChange={(page, pageSize) => handleTableChange({ current: page, pageSize })}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AmenityForm
        open={formOpen}
        amenity={editingAmenity}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingAmenity(null);
        }}
        data={viewingAmenity}
        type="amenity"
      />
    </div>
  );
};

export default AmenitiesPage;