import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useLocations } from '../hooks/useLocations';
import LocationTable from '../components/LocationTable';
import LocationForm from '../components/LocationForm';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { deleteLocationApi } from '../api';

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

  const handleCreate = () => {
    setEditingLocation(null);
    setFormOpen(true);
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingLocation(null);
  };

  const handleFormSuccess = () => {
    fetchLocations();
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
            <SearchFilter
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
              onDelete={handleDelete}
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
    </Layout>
  );
};

export default LocationsPage;
