import React, { useState } from 'react';
import { Card, Typography, Button, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useTransportModes } from '../hooks/useTransportModes';
import TransportModeTable from '../components/TransportModeTable';
import TransportModeForm from '../components/TransportModeForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteTransportModeApi, getTransportModeByIdApi } from '../api';

const { Title } = Typography;

const CATEGORY_OPTIONS = [
  { value: 1, label: 'Dynamic Local' },
  { value: 2, label: 'Fixed Intercity' },
];

const TransportModesPage = () => {
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    handleCategoryFilterChange,
    fetchTransportModes,
  } = useTransportModes();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (record) => { setEditing(record); setFormOpen(true); };
  const handleFormClose = () => { setFormOpen(false); setEditing(null); };
  const handleFormSuccess = () => fetchTransportModes();

  const handleView = async (record) => {
    try {
      const detail = await getTransportModeByIdApi(record.id);
      setViewing(detail);
      setDetailOpen(true);
    } catch {
      message.error('Failed to load details');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteTransportModeApi(record.id);
      message.success('Deleted successfully');
      fetchTransportModes();
    } catch {
      // Handled by global interceptor
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: '#1A535C', marginBottom: 24 }}>
        Transport Mode Management
      </Title>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchFilter onSearch={handleSearch} loading={loading} placeholder="Search transport modes..." />
            <Select
              allowClear
              placeholder="Filter by category"
              style={{ width: 180 }}
              options={CATEGORY_OPTIONS}
              onChange={handleCategoryFilterChange}
            />
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Transport Mode
          </Button>
        </div>

        <TransportModeTable
          data={data}
          loading={loading}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <AppPagination
            current={pagination?.current}
            pageSize={pagination?.pageSize}
            total={pagination?.total}
            onChange={(page, pageSize) => handleTableChange({ current: page, pageSize })}
          />
        </div>
      </Card>

      <TransportModeForm
        open={formOpen}
        transportMode={editing}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      <DetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setViewing(null); }}
        data={viewing}
        type="transportMode"
      />
    </div>
  );
};

export default TransportModesPage;
