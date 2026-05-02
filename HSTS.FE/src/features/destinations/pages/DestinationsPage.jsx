import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Button, message, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import { useDistricts } from '../hooks/useDestinations';
import DistrictTable from '../components/DestinationTable';
import DistrictForm from '../components/DestinationForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { deleteDistrictApi, getDistrictByIdApi, getProvincesApi } from '../api';
import styles from '../styles/DestinationsPage.module.css';

const { Title } = Typography;
const { Option } = Select;

const DistrictsPage = () => {
  const {
    data,
    loading,
    pagination,
    provinceId,
    handleTableChange,
    handleSearch,
    handleProvinceChange,
    fetchDistricts,
  } = useDistricts();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);
  const [viewingDistrict, setViewingDistrict] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [fetchingProvinces, setFetchingProvinces] = useState(false);

  useEffect(() => {
    const fetchProvinces = async () => {
      setFetchingProvinces(true);
      try {
        const data = await getProvincesApi();
        setProvinces(Array.isArray(data) ? data : []);
      } catch (error) {
        message.error('Failed to load provinces');
      } finally {
        setFetchingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

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
    }
  };

  return (
    <div className={styles.appWrapper}>
      <div className={styles.content}>
        <div className={styles.floatingCircle1}></div>
        <div className={styles.floatingCircle2}></div>

        <Space direction="vertical" size="large" className={styles.mainContainer}>
          <div className={styles.pageHeader}>
            <Title level={2} className={styles.mainHeading}>District Management</Title>
          </div>

          <Card className={styles.dataCard} bordered={false}>
            <div className={styles.toolbarWrapper}>
              <div className={styles.searchSection}>
                <Space size="middle">
                  <SearchFilter
                    onSearch={handleSearch}
                    loading={loading}
                    placeholder="Search districts..."
                  />
                  <Select
                    placeholder="Filter by province"
                    style={{ width: 200 }}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    loading={fetchingProvinces}
                    value={provinceId}
                    onChange={handleProvinceChange}
                    className={styles.provinceFilter}
                  >
                    {provinces.map(p => (
                      <Option key={p.id} value={p.id}>{p.name}</Option>
                    ))}
                  </Select>
                </Space>
              </div>
              <Button className={styles.ctaBtn} icon={<PlusOutlined />} onClick={handleCreate}>
                Add District
              </Button>
            </div>
            
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
      </div>

      <DistrictForm
        open={formOpen}
        district={editingDistrict}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingDistrict(null);
        }}
        data={viewingDistrict}
        type="district"
      />
    </div>
  );
};

export default DistrictsPage;