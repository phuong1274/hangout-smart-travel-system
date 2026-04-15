import React, { useState, useEffect } from 'react';
import { Card, Button, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { useTransitHubs } from '../hooks/useTransportation';
import TransitHubTable from '../components/TransitHubTable';
import TransitHubForm from '../components/TransitHubForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteTransitHubApi, getTransitHubByIdApi, getTransitHubTypesApi, getTransportModesApi } from '../api';
import apiClient from '@/lib/axios';
import styles from '../styles/TransitHubsPage.module.css';

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
      } catch (error) {}
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
    } catch (error) {
      message.error('Failed to load details');
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteTransitHubApi(record.id);
      message.success('Deleted successfully');
      fetchTransitHubs();
    } catch (error) {}
  };

  return (
    <>
      <Card className={styles.dataCard} bordered={false}>
        <div className={styles.toolbarWrapper}>
          <div className={styles.searchSection}>
            <div className={styles.filterGroup}>
              <SearchFilter onSearch={handleSearch} loading={loading} placeholder="Search transit hubs..." />
              <Select
                allowClear
                placeholder="District"
                className={styles.filterSelect}
                popupClassName={styles.filterDropdown}
                showSearch
                optionFilterProp="label"
                options={districts.map(d => ({ value: d.id, label: d.name }))}
                onChange={(v) => handleFilterChange('districtId', v)}
              />
              <Select
                allowClear
                placeholder="Transport Mode"
                className={styles.filterSelect}
                popupClassName={styles.filterDropdown}
                showSearch
                optionFilterProp="label"
                options={transportModes.map(t => ({ value: t.id, label: t.name }))}
                onChange={(v) => handleFilterChange('transportationId', v)}
              />
              <Select
                allowClear
                placeholder="Hub Type"
                className={styles.filterSelect}
                popupClassName={styles.filterDropdown}
                showSearch
                optionFilterProp="label"
                options={transitHubTypes.map(t => ({ value: t.id, label: t.name }))}
                onChange={(v) => handleFilterChange('transitHubTypeId', v)}
              />
            </div>
          </div>
          <Button className={styles.ctaBtn} icon={<PlusOutlined />} onClick={handleCreate}>
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

        <div className={styles.paginationWrapper}>
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
    </>
  );
};

export default TransitHubsPage;