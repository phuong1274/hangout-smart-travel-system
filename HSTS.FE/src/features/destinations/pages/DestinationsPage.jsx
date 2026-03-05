import React, { useState } from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useDestinations } from '../hooks/useDestinations';
import DestinationTable from '../components/DestinationTable';
import DestinationForm from '../components/DestinationForm';

const { Title } = Typography;

const DestinationsPage = () => {
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

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
        />
      </Card>
      <DestinationForm
        open={formOpen}
        destination={editingDestination}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </Space>
  );
};

export default DestinationsPage;
