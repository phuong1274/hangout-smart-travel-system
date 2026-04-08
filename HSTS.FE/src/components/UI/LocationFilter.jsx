import React, { useState, useEffect } from 'react';
import { Select, Row, Col, Button, DatePicker, Popover } from 'antd';
import { FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { getRootTagsApi, getChildTagsApi } from '@/features/tags/api';
import { getAllLocationTypesApi, getAllDistrictsApi } from '@/features/locations/api';
import dayjs from 'dayjs';
import styles from './LocationFilter.module.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const LocationFilter = ({
  onSearch,
  loading = false,
  actionButton,
  extra,
  ...props
}) => {
  // State quản lý giá trị đang nhập (chưa apply)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentTagIds, setSelectedParentTagIds] = useState([]);
  const [selectedChildTagIds, setSelectedChildTagIds] = useState([]);
  const [selectedLocationTypeIds, setSelectedLocationTypeIds] = useState([]);
  const [selectedDistrictIds, setSelectedDistrictIds] = useState([]);
  const [dateRange, setDateRange] = useState([]);

  // State lưu trữ dữ liệu dropdown
  const [rootTags, setRootTags] = useState([]);
  const [availableChildTags, setAvailableChildTags] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [districts, setDistricts] = useState([]);

  // LOGIC ĐỒNG NGHIỆP: State lưu trữ bộ lọc ĐÃ ĐƯỢC ÁP DỤNG
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [rootTagsRes, typesRes, districtsRes] = await Promise.all([
        getRootTagsApi(),
        getAllLocationTypesApi(),
        getAllDistrictsApi()
      ]);

      setRootTags(rootTagsRes?.items || rootTagsRes?.Items || rootTagsRes || []);
      setLocationTypes(typesRes?.items || typesRes?.Items || typesRes || []);
      setDistricts(districtsRes?.items || districtsRes?.Items || districtsRes || []);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const handleParentTagChange = async (parentIds) => {
    setSelectedParentTagIds(parentIds);

    if (parentIds.length > 0) {
      try {
        const childTagPromises = parentIds.map(parentId => getChildTagsApi(parentId));
        const childTagResults = await Promise.all(childTagPromises);

        const allChildTags = childTagResults.flatMap(res => res?.items || res?.Items || res || []);
        const uniqueChildTags = allChildTags.filter(
          (tag, index, self) => index === self.findIndex(t => t.id === tag.id)
        );
        setAvailableChildTags(uniqueChildTags);

        const availableIds = new Set(uniqueChildTags.map(t => t.id));
        setSelectedChildTagIds(prev => prev.filter(id => availableIds.has(id)));
      } catch (error) {
        setAvailableChildTags([]);
        setSelectedChildTagIds([]);
      }
    } else {
      setAvailableChildTags([]);
      setSelectedChildTagIds([]);
    }
  };

  const handleApplyFilter = () => {
    const allTagIds = [...selectedParentTagIds, ...selectedChildTagIds];

    const filters = {
      searchTerm: searchTerm || undefined,
      TagIds: allTagIds.length > 0 ? allTagIds : undefined,
      LocationTypeIds: selectedLocationTypeIds.length > 0 ? selectedLocationTypeIds : undefined,
      DistrictIds: selectedDistrictIds.length > 0 ? selectedDistrictIds : undefined,
      FromDate: dateRange && dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
      ToDate: dateRange && dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined
    };
    

    setAppliedFilters(filters);
    onSearch(filters);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedParentTagIds([]);
    setSelectedChildTagIds([]);
    setAvailableChildTags([]);
    setSelectedLocationTypeIds([]);
    setSelectedDistrictIds([]);
    setDateRange([]);
    setAppliedFilters({});
    onSearch({});
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value === '') {
      const newFilters = { ...appliedFilters, searchTerm: undefined };
      setAppliedFilters(newFilters);
      onSearch(newFilters);
    }
  };

  const hasActiveFilters = Object.keys(appliedFilters).length > 0 && 
    (appliedFilters.searchTerm || 
     appliedFilters.TagIds || 
     appliedFilters.LocationTypeIds || 
     appliedFilters.DistrictIds || 
     appliedFilters.FromDate || 
     appliedFilters.ToDate);

 
  const filterContent = (
    <div className={styles.popoverContent}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div className={styles.filterLabel}>Parent Tags</div>
          <Select
            mode="multiple"
            placeholder="Select parent tags"
            style={{ width: '100%' }}
            value={selectedParentTagIds}
            onChange={handleParentTagChange}
            allowClear
            maxTagCount="responsive"
            popupMatchSelectWidth={false}
          >
            {rootTags.map(tag => (
              <Option key={tag.id} value={tag.id}>{tag.name}</Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <div className={styles.filterLabel}>Child Tags</div>
          <Select
            mode="multiple"
            placeholder="Select child tags"
            style={{ width: '100%' }}
            value={selectedChildTagIds}
            onChange={setSelectedChildTagIds}
            allowClear
            maxTagCount="responsive"
            disabled={selectedParentTagIds.length === 0}
            popupMatchSelectWidth={false}
          >
            {availableChildTags.map(tag => (
              <Option key={tag.id} value={tag.id}>{tag.name}</Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <div className={styles.filterLabel}>Location Types</div>
          <Select
            mode="multiple"
            placeholder="Select types"
            style={{ width: '100%' }}
            value={selectedLocationTypeIds}
            onChange={setSelectedLocationTypeIds}
            allowClear
            maxTagCount="responsive"
            popupMatchSelectWidth={false}
          >
            {locationTypes.map(type => (
              <Option key={type.id} value={type.id}>{type.name}</Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <div className={styles.filterLabel}>Districts</div>
          <Select
            mode="multiple"
            placeholder="Select districts"
            style={{ width: '100%' }}
            value={selectedDistrictIds}
            onChange={setSelectedDistrictIds}
            allowClear
            maxTagCount="responsive"
            popupMatchSelectWidth={false}
          >
            {districts.map(district => (
              <Option key={district.id} value={district.id}>{district.name}</Option>
            ))}
          </Select>
        </Col>
        <Col span={24}>
          <div className={styles.filterLabel}>Date Range</div>
          <RangePicker
            placeholder={['From Date', 'To Date']}
            value={dateRange}
            onChange={setDateRange}
            style={{ width: '100%' }}
            allowClear
          />
        </Col>
      </Row>
      <div className={styles.popoverFooter}>
        <Button 
          className={styles.btnResetInner}
          icon={<ReloadOutlined />} 
          onClick={handleReset}
          disabled={!hasActiveFilters}
        >
          RESET
        </Button>
        <Button 
          className={styles.btnApplyInner}
          icon={<FilterOutlined />} 
          onClick={handleApplyFilter}
          loading={loading}
        >
          APPLY FILTERS
        </Button>
      </div>
    </div>
  );

  return (
    <div className={styles.filterWrapper}>
      <div className={styles.topRow}>
        <div className={styles.leftActions}>
          <div className={styles.tropicalSearchContainer}>
            <input
              type="text"
              placeholder="Search locations by name..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              className={styles.customSearchInput}
            />
            <button 
              type="button"
              className={styles.customSearchBtn}
              onClick={handleApplyFilter}
              disabled={loading}
            >
              <SearchOutlined />
            </button>
          </div>

         
          <Popover 
            content={filterContent} 
            trigger="click" 
            placement="bottomLeft"
            overlayClassName={styles.customPopover}
          >
            <Button 
              className={styles.btnTrigger}
              icon={<FilterOutlined />}
            >
              ADVANCED FILTERS
              {hasActiveFilters && <div className={styles.activeDot} />}
            </Button>
          </Popover>
        </div>
        
        {actionButton && (
          <div className={styles.rightActions}>
            {actionButton}
          </div>
        )}
      </div>
      {extra && <div className={styles.filterExtra}>{extra}</div>}
    </div>
  );
};

export default LocationFilter;
