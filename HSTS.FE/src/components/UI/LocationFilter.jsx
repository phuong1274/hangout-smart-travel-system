import React, { useState, useEffect } from 'react';
import { Input, Space, Select, Row, Col, Button, DatePicker } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { getRootTagsApi, getChildTagsApi } from '@/features/tags/api';
import { getAllLocationTypesApi, getAllDistrictsApi } from '@/features/locations/api';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const LocationFilter = ({
  onSearch,
  loading = false,
  extra,
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentTagIds, setSelectedParentTagIds] = useState([]);
  const [selectedChildTagIds, setSelectedChildTagIds] = useState([]);
  const [selectedLocationTypeIds, setSelectedLocationTypeIds] = useState([]);
  const [selectedDistrictIds, setSelectedDistrictIds] = useState([]);
  const [dateRange, setDateRange] = useState([]);

  const [rootTags, setRootTags] = useState([]);
  const [availableChildTags, setAvailableChildTags] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [districts, setDistricts] = useState([]);

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

    // Fetch child tags for all selected parents
    if (parentIds.length > 0) {
      try {
        const childTagPromises = parentIds.map(parentId => getChildTagsApi(parentId));
        const childTagResults = await Promise.all(childTagPromises);

        // Flatten and deduplicate child tags
        const allChildTags = childTagResults.flatMap(res => res?.items || res?.Items || res || []);
        const uniqueChildTags = allChildTags.filter(
          (tag, index, self) => index === self.findIndex(t => t.id === tag.id)
        );
        setAvailableChildTags(uniqueChildTags);

        // Clear selected child tags that are no longer available
        const availableIds = new Set(uniqueChildTags.map(t => t.id));
        setSelectedChildTagIds(prev => prev.filter(id => availableIds.has(id)));
      } catch (error) {
        console.error('Failed to load child tags:', error);
        setAvailableChildTags([]);
        setSelectedChildTagIds([]);
      }
    } else {
      setAvailableChildTags([]);
      setSelectedChildTagIds([]);
    }
  };

  const handleApplyFilter = () => {
    // Send both parent and child tag IDs to backend
    // Backend will resolve parent IDs to child locations
    const allTagIds = [...selectedParentTagIds, ...selectedChildTagIds];

    const filters = {
      searchTerm: searchTerm || undefined,
      TagIds: allTagIds.length > 0 ? allTagIds : undefined,
      LocationTypeIds: selectedLocationTypeIds.length > 0 ? selectedLocationTypeIds : undefined,
      DistrictIds: selectedDistrictIds.length > 0 ? selectedDistrictIds : undefined,
      FromDate: dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
      ToDate: dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined
    };
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
    onSearch({});
  };

  const hasActiveFilters = searchTerm || selectedParentTagIds.length > 0 ||
    selectedChildTagIds.length > 0 ||
    selectedLocationTypeIds.length > 0 || selectedDistrictIds.length > 0 ||
    (dateRange && dateRange.length > 0 && (dateRange[0] || dateRange[1]));

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Search Box */}
        <Row gutter={16} align="middle">
          <Col flex="300px">
            <Search
              placeholder="Search locations by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleApplyFilter}
              loading={loading}
              allowClear
              enterButton
              onPressEnter={handleApplyFilter}
            />
          </Col>
          <Col flex="auto">
            <Button 
              type="primary" 
              icon={<FilterOutlined />} 
              onClick={handleApplyFilter}
              loading={loading}
            >
              Apply Filters
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReset}
              disabled={!hasActiveFilters}
              style={{ marginLeft: 8 }}
            >
              Reset
            </Button>
          </Col>
        </Row>

        {/* Filter Dropdowns */}
        <Row gutter={16}>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Filter by Parent Tags"
              style={{ width: '100%' }}
              value={selectedParentTagIds}
              onChange={handleParentTagChange}
              allowClear
              maxTagCount="responsive"
            >
              {rootTags.map(tag => (
                <Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Filter by Child Tags"
              style={{ width: '100%' }}
              value={selectedChildTagIds}
              onChange={setSelectedChildTagIds}
              allowClear
              maxTagCount="responsive"
              disabled={selectedParentTagIds.length === 0}
            >
              {availableChildTags.map(tag => (
                <Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="Filter by Location Types"
              style={{ width: '100%' }}
              value={selectedLocationTypeIds}
              onChange={setSelectedLocationTypeIds}
              allowClear
              maxTagCount="responsive"
            >
              {locationTypes.map(type => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              mode="multiple"
              placeholder="Filter by Districts"
              style={{ width: '100%' }}
              value={selectedDistrictIds}
              onChange={setSelectedDistrictIds}
              allowClear
              maxTagCount="responsive"
            >
              {districts.map(district => (
                <Option key={district.id} value={district.id}>
                  {district.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['From Date', 'To Date']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
        </Row>
      </Space>
      {extra && <div className="filter-extra" style={{ marginTop: 16 }}>{extra}</div>}
    </div>
  );
};

export default LocationFilter;
