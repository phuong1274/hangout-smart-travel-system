import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useLocationTypes } from '../hooks/useLocationTypes';
import LocationTypeTable from '../components/LocationTypeTable';
import LocationTypeForm from '../components/LocationTypeForm';
import DetailModal from '@/components/DetailModal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { deleteLocationTypeApi, getLocationTypeByIdApi } from '../api';

const { Title } = Typography;
const { Header, Content } = Layout;

const LocationTypesPage = () => {
  const navigate = useNavigate();
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
      // Handled by global interceptor
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Hangout - Location Types</Title>
        </div>
        <Button type="primary" onClick={() => navigate(PATHS.AUTH.LOGIN)}>
          Login
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>Location Type Management</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Location Type
            </Button>
          </div>
          <Card>
            <SearchFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search location types..."
            />
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
        </Space>
      </Content>
      <LocationTypeForm
        open={formOpen}
        locationType={editingLocationType}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingLocationType(null);
        }}
        data={viewingLocationType}
        type="locationType"
      />
    </Layout>
  );
};

export default LocationTypesPage;
