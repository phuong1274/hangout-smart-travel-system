import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useAmenities } from '../hooks/useAmenities';
import AmenityTable from '../components/AmenityTable';
import AmenityForm from '../components/AmenityForm';
import DetailModal from '@/components/DetailModal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { deleteAmenityApi, getAmenityByIdApi } from '../api';

const { Title } = Typography;
const { Header, Content } = Layout;

const AmenitiesPage = () => {
  const navigate = useNavigate();
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
      // Handled by global interceptor for other errors
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Hangout - Amenities</Title>
        </div>
        <Button type="primary" onClick={() => navigate(PATHS.AUTH.LOGIN)}>
          Login
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>Amenity Management</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Amenity
            </Button>
          </div>
          <Card>
            <SearchFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search amenities..."
            />
            <AmenityTable
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
      </Content>
      <AmenityForm
        open={formOpen}
        amenity={editingAmenity}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingAmenity(null);
        }}
        data={viewingAmenity}
        type="amenity"
      />
    </Layout>
  );
};

export default AmenitiesPage;
