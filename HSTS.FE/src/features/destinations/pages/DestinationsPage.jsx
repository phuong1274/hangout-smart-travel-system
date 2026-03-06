import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useDestinations } from '../hooks/useDestinations';
import DestinationTable from '../components/DestinationTable';
import DestinationForm from '../components/DestinationForm';
import DetailModal from '@/components/DetailModal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { deleteDestinationApi, getDestinationByIdApi } from '../api';

const { Title } = Typography;
const { Header, Content } = Layout;

const DestinationsPage = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchDestinations,
  } = useDestinations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [viewingDestination, setViewingDestination] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleCreate = () => {
    setEditingDestination(null);
    setFormOpen(true);
  };

  const handleEdit = (destination) => {
    setEditingDestination(destination);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingDestination(null);
  };

  const handleFormSuccess = () => {
    fetchDestinations();
  };

  const handleView = async (destination) => {
    try {
      const detail = await getDestinationByIdApi(destination.id);
      setViewingDestination(detail);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load destination details');
    }
  };

  const handleDelete = async (destination) => {
    try {
      await deleteDestinationApi(destination.id);
      message.success('Destination deleted successfully');
      fetchDestinations();
    } catch (error) {
      // Handled by global interceptor
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Hangout - Destinations</Title>
        </div>
        <Button type="primary" onClick={() => navigate(PATHS.AUTH.LOGIN)}>
          Login
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>Destination Management</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Destination
            </Button>
          </div>
          <Card>
            <SearchFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search destinations..."
            />
            <DestinationTable
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
      <DestinationForm
        open={formOpen}
        destination={editingDestination}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingDestination(null);
        }}
        data={viewingDestination}
        type="destination"
      />
    </Layout>
  );
};

export default DestinationsPage;
