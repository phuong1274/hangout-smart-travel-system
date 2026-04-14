import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useLocalTransportMetrics } from '../hooks/useLocalTransportMetrics';
import LocalTransportMetricsTable from '../components/LocalTransportMetricsTable';
import LocalTransportMetricsForm from '../components/LocalTransportMetricsForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteLocalTransportMetricApi, getLocalTransportMetricByIdApi } from '../api';
import { getTransportModesApi } from '@/features/transport-modes/api';

const { Title } = Typography;

const LocalTransportMetricsPage = () => {
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleTransportationFilter,
    fetchMetrics,
  } = useLocalTransportMetrics();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [transportModes, setTransportModes] = useState([]);

  useEffect(() => {
    getTransportModesApi({ pageIndex: 1, pageSize: 999 })
      .then(res => setTransportModes(res?.items || res?.Items || (Array.isArray(res) ? res : [])))
      .catch(() => {});
  }, []);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (record) => { setEditing(record); setFormOpen(true); };
  const handleFormClose = () => { setFormOpen(false); setEditing(null); };
  const handleFormSuccess = () => fetchMetrics();

  const handleView = async (record) => {
    try {
      const detail = await getLocalTransportMetricByIdApi(record.transportationId);
      setViewing(detail);
      setDetailOpen(true);
    } catch {
      message.error('Failed to load details');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteLocalTransportMetricApi(record.transportationId);
      message.success('Deleted successfully');
      fetchMetrics();
    } catch {
      // Handled by global interceptor
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: '#1A535C', marginBottom: 24 }}>
        Local Transport Metrics Management
      </Title>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <Select
            allowClear
            placeholder="Filter by Transport Mode"
            style={{ width: 220 }}
            showSearch
            optionFilterProp="label"
            options={transportModes.map(t => ({ value: t.id, label: t.name }))}
            onChange={handleTransportationFilter}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Metrics
          </Button>
        </div>

        <LocalTransportMetricsTable
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

      <LocalTransportMetricsForm
        open={formOpen}
        metric={editing}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        transportModes={transportModes}
      />

      <DetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setViewing(null); }}
        data={viewing}
        type="localTransportMetrics"
      />
    </div>
  );
};

export default LocalTransportMetricsPage;
