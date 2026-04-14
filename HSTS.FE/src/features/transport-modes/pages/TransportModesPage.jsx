import React, { useState } from 'react';
import { Card, Typography, Button, Select, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useTransportModes } from '../hooks/useTransportModes';
import TransportModeTable from '../components/TransportModeTable';
import TransportModeForm from '../components/TransportModeForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteTransportModeApi, getTransportModeByIdApi } from '../api';
import styles from '../styles/TransportModesPage.module.css';

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
    } catch (error) {
      message.error('Failed to load details');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteTransportModeApi(record.id);
      message.success('Deleted successfully');
      fetchTransportModes();
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
            <Title level={2} className={styles.mainHeading}>Transport Mode Management</Title>
          </div>

          <Card className={styles.dataCard} bordered={false}>
            <div className={styles.toolbarWrapper}>
              <div className={styles.searchSection}>
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <SearchFilter onSearch={handleSearch} loading={loading} placeholder="Search transport modes..." />
                  <Select
                    allowClear
                    placeholder="Filter by category"
                    style={{ width: 180 }}
                    options={CATEGORY_OPTIONS}
                    onChange={handleCategoryFilterChange}
                  />
                </div>
              </div>
              <Button className={styles.ctaBtn} icon={<PlusOutlined />} onClick={handleCreate}>
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