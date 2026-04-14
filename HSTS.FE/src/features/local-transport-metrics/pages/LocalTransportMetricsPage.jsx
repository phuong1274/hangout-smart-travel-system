import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Select, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useLocalTransportMetrics } from '../hooks/useLocalTransportMetrics';
import LocalTransportMetricsTable from '../components/LocalTransportMetricsTable';
import LocalTransportMetricsForm from '../components/LocalTransportMetricsForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteLocalTransportMetricApi, getLocalTransportMetricByIdApi } from '../api';
import { getTransportModesApi } from '@/features/transport-modes/api';
import styles from '../styles/LocalTransportMetricsPage.module.css';

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
    } catch (error) {
      message.error('Failed to load details');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteLocalTransportMetricApi(record.transportationId);
      message.success('Deleted successfully');
      fetchMetrics();
    } catch (error) {
    }
  };

  return (
    <div className={styles.appWrapper}>
      <div className={styles.content}>
        <div className={styles.floatingCircle1}></div>
        <div className={styles.floatingCircle2}></div>

        <Space direction="vertical" size="large" className={styles.mainContainer}>
          <div className={styles.pageHeader}>
            <Title level={2} className={styles.mainHeading}>Local Transport Metrics Management</Title>
          </div>

          <Card className={styles.dataCard} bordered={false}>
            <div className={styles.toolbarWrapper}>
              <div className={styles.searchSection}>
                <div className={styles.filterGroup}>
                  <Select
                    allowClear
                    placeholder="Filter by Transport Mode"
                    className={styles.filterSelect}
                    popupClassName={styles.filterDropdown}
                    showSearch
                    optionFilterProp="label"
                    options={transportModes.map(t => ({ value: t.id, label: t.name }))}
                    onChange={handleTransportationFilter}
                  />
                </div>
              </div>
              <Button className={styles.ctaBtn} icon={<PlusOutlined />} onClick={handleCreate}>
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

            <div className={styles.paginationWrapper}>
              <AppPagination
                current={pagination?.current}
                pageSize={pagination?.pageSize}
                total={pagination?.total}
                onChange={(page, pageSize) => handleTableChange({ current: page, pageSize })}
              />
            </div>
          </Card>
        </Space>
      </div>

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