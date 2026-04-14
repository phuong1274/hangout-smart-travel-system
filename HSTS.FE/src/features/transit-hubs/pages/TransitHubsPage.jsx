import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useTransitHubs } from '../hooks/useTransitHubs';
import TransitHubTable from '../components/TransitHubTable';
import TransitHubForm from '../components/TransitHubForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteTransitHubApi, getTransitHubByIdApi, getTransitHubTypesApi } from '../api';
import { getTransportModesApi } from '@/features/transport-modes/api';
import apiClient from '@/lib/axios';

const { Title } = Typography;

const TransitHubsPage = () => {
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    handleFilterChange,
    fetchTransitHubs,
  } = useTransitHubs();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Dropdown data for filters and form
  const [districts, setDistricts] = useState([]);
  const [transportModes, setTransportModes] = useState([]);
  const [transitHubTypes, setTransitHubTypes] = useState([]);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [distRes, tmRes, thtRes] = await Promise.all([
          apiClient.get('/api/common/districts').then(r => r.data),
          getTransportModesApi({ pageIndex: 1, pageSize: 999 }),
          getTransitHubTypesApi(),
        ]);
        setDistricts(Array.isArray(distRes) ? distRes : distRes?.items || []);
        setTransportModes(tmRes?.items || tmRes?.Items || (Array.isArray(tmRes) ? tmRes : []));
        setTransitHubTypes(Array.isArray(thtRes) ? thtRes : thtRes?.items || []);
      } catch {
        // Handled by global interceptor
      }
    };
    loadDropdowns();
  }, []);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (record) => { setEditing(record); setFormOpen(true); };
  const handleFormClose = () => { setFormOpen(false); setEditing(null); };
  const handleFormSuccess = () => fetchTransitHubs();

  const handleView = async (record) => {
    try {
      const detail = await getTransitHubByIdApi(record.id);
      setViewing(detail);
      setDetailOpen(true);
    } catch {
      message.error('Failed to load details');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteTransitHubApi(record.id);
      message.success('Deleted successfully');
      fetchTransitHubs();
    } catch {
      // Handled by global interceptor
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: '#1A535C', marginBottom: 24 }}>
        Transit Hub Management
      </Title>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchFilter onSearch={handleSearch} loading={loading} placeholder="Search transit hubs..." />
            <Select
              allowClear
              placeholder="District"
              style={{ width: 170 }}
              showSearch
              optionFilterProp="label"
              options={districts.map(d => ({ value: d.id, label: d.name }))}
              onChange={(v) => handleFilterChange('districtId', v)}
            />
            <Select
              allowClear
              placeholder="Transport Mode"
              style={{ width: 170 }}
              showSearch
              optionFilterProp="label"
              options={transportModes.map(t => ({ value: t.id, label: t.name }))}
              onChange={(v) => handleFilterChange('transportationId', v)}
            />
            <Select
              allowClear
              placeholder="Hub Type"
              style={{ width: 160 }}
              showSearch
              optionFilterProp="label"
              options={transitHubTypes.map(t => ({ value: t.id, label: t.name }))}
              onChange={(v) => handleFilterChange('transitHubTypeId', v)}
            />
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Transit Hub
          </Button>
        </div>

        <TransitHubTable
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

      <TransitHubForm
        open={formOpen}
        transitHub={editing}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        districts={districts}
        transportModes={transportModes}
        transitHubTypes={transitHubTypes}
      />

      <DetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setViewing(null); }}
        data={viewing}
        type="transitHub"
      />
    </div>
  );
};

export default TransitHubsPage;
