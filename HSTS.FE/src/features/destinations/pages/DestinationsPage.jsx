import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useDistricts } from '../hooks/useDestinations';
import DistrictTable from '../components/DestinationTable';
import DistrictForm from '../components/DestinationForm';
import DetailModal from '@/components/DetailModal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { deleteDistrictApi, getDistrictByIdApi } from '../api';

const { Title } = Typography;
const { Header, Content } = Layout;

const DistrictsPage = () => {
  const navigate = useNavigate();
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchDistricts,
  } = useDistricts();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);
  const [viewingDistrict, setViewingDistrict] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleCreate = () => {
    setEditingDistrict(null);
    setFormOpen(true);
  };

  const handleEdit = (district) => {
    setEditingDistrict(district);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingDistrict(null);
  };

  const handleFormSuccess = () => {
    fetchDistricts();
  };

  const handleView = async (district) => {
    try {
      const detail = await getDistrictByIdApi(district.id);
      setViewingDistrict(detail);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load district details');
    }
  };

  const handleDelete = async (district) => {
    try {
      await deleteDistrictApi(district.id);
      message.success('District deleted successfully');
      fetchDistricts();
    } catch (error) {
      // Handled by global interceptor
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Hangout - Districts</Title>
        </div>
        <Button type="primary" onClick={() => navigate(PATHS.AUTH.LOGIN)}>
          Login
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>District Management</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add District
            </Button>
          </div>
          <Card>
            <SearchFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search districts..."
            />
            <DistrictTable
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
      <DistrictForm
        open={formOpen}
        district={editingDistrict}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingDistrict(null);
        }}
        data={viewingDistrict}
        type="district"
      />
    </Layout>
  );
};

export default DistrictsPage;
