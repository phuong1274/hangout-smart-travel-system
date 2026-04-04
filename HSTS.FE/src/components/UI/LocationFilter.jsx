import React, { useState, useEffect } from 'react';
import { Input, Select, Button, DatePicker } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { getAllTagsApi, getAllLocationTypesApi, getAllDistrictsApi } from '@/features/locations/api';
import styles from './LocationFilter.module.css';

const { Option } = Select;
const { RangePicker } = DatePicker;

const LocationFilter = ({
  onSearch,
  loading = false,
  extra,
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedLocationTypeIds, setSelectedLocationTypeIds] = useState([]);
  const [selectedDistrictIds, setSelectedDistrictIds] = useState([]);
  const [dateRange, setDateRange] = useState([]);

  const [tags, setTags] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [tagsRes, typesRes, districtsRes] = await Promise.all([
        getAllTagsApi(),
        getAllLocationTypesApi(),
        getAllDistrictsApi()
      ]);

      setTags(tagsRes?.items || tagsRes?.Items || tagsRes || []);
      setLocationTypes(typesRes?.items || typesRes?.Items || typesRes || []);
      setDistricts(districtsRes?.items || districtsRes?.Items || districtsRes || []);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const handleApplyFilter = () => {
    const filters = {
      searchTerm: searchTerm || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      locationTypeIds: selectedLocationTypeIds.length > 0 ? selectedLocationTypeIds : undefined,
      districtIds: selectedDistrictIds.length > 0 ? selectedDistrictIds : undefined,
      fromDate: dateRange && dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
      toDate: dateRange && dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined
    };
    onSearch(filters);
  };

  const handleSearchKeyPress = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedTagIds([]);
    setSelectedLocationTypeIds([]);
    setSelectedDistrictIds([]);
    setDateRange([]);
    onSearch({});
  };

  const hasActiveFilters = searchTerm || selectedTagIds.length > 0 ||
    selectedLocationTypeIds.length > 0 || selectedDistrictIds.length > 0 ||
    (dateRange && dateRange.length > 0 && (dateRange[0] || dateRange[1]));

  return (
    <div className={styles.filterContainer}>
      <div className={styles.topRow}>
        <div className={styles.customSearchPill}>
          <Input
            className={styles.pillInput}
            placeholder="Search locations by name or description..."
            value={searchTerm}
            onChange={handleSearchKeyPress}
            onPressEnter={handleApplyFilter}
            allowClear
            bordered={false}
          />
          <Button
            className={styles.pillButton}
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handleApplyFilter}
          />
        </div>

        <div className={styles.actionButtons}>
          <Button 
            className={styles.applyBtn}
            icon={<FilterOutlined />} 
            onClick={handleApplyFilter}
            loading={loading}
          >
            Apply Filters
          </Button>
          <Button 
            className={styles.resetBtn}
            icon={<ReloadOutlined />} 
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <Select
          className={styles.tropicalSelect}
          mode="multiple"
          placeholder="Filter by Tags"
          value={selectedTagIds}
          onChange={setSelectedTagIds}
          allowClear
          maxTagCount="responsive"
          popupClassName={styles.tropicalDropdown}
        >
          {tags.map(tag => (
            <Option key={tag.id} value={tag.id}>{tag.name}</Option>
          ))}
        </Select>

        <Select
          className={styles.tropicalSelect}
          mode="multiple"
          placeholder="Filter by Location Types"
          value={selectedLocationTypeIds}
          onChange={setSelectedLocationTypeIds}
          allowClear
          maxTagCount="responsive"
          popupClassName={styles.tropicalDropdown}
        >
          {locationTypes.map(type => (
            <Option key={type.id} value={type.id}>{type.name}</Option>
          ))}
        </Select>

        <Select
          className={styles.tropicalSelect}
          mode="multiple"
          placeholder="Filter by Districts"
          value={selectedDistrictIds}
          onChange={setSelectedDistrictIds}
          allowClear
          maxTagCount="responsive"
          popupClassName={styles.tropicalDropdown}
        >
          {districts.map(district => (
            <Option key={district.id} value={district.id}>{district.name}</Option>
          ))}
        </Select>

        <RangePicker
          className={styles.tropicalDatePicker}
          placeholder={['From Date', 'To Date']}
          value={dateRange}
          onChange={setDateRange}
          allowClear
        />
      </div>
      
      {extra && <div className={styles.extraWrapper}>{extra}</div>}
    </div>
  );
};

export default LocationFilter;