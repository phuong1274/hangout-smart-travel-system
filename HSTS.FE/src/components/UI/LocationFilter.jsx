import React, { useState, useEffect } from 'react';
import { Input, Space, Select, Row, Col, Button, DatePicker } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined, CalendarOutlined } from '@ant-design/icons';
import { getAllTagsApi, getAllLocationTypesApi, getAllDestinationsApi } from '@/features/locations/api';
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
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedLocationTypeIds, setSelectedLocationTypeIds] = useState([]);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState([]);
  const [dateRange, setDateRange] = useState([]);
  
  const [tags, setTags] = useState([]);
  const [locationTypes, setLocationTypes] = useState([]);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [tagsRes, typesRes, destinationsRes] = await Promise.all([
        getAllTagsApi(),
        getAllLocationTypesApi(),
        getAllDestinationsApi()
      ]);
      
      // Handle both paged response {items, totalCount} and direct array
      setTags(tagsRes?.items || tagsRes?.Items || tagsRes || []);
      setLocationTypes(typesRes?.items || typesRes?.Items || typesRes || []);
      setDestinations(destinationsRes?.items || destinationsRes?.Items || destinationsRes || []);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const handleApplyFilter = () => {
    const filters = {
      searchTerm: searchTerm || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      locationTypeIds: selectedLocationTypeIds.length > 0 ? selectedLocationTypeIds : undefined,
      destinationIds: selectedDestinationIds.length > 0 ? selectedDestinationIds : undefined,
      fromDate: dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
      toDate: dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined
    };
    onSearch(filters);
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedTagIds([]);
    setSelectedLocationTypeIds([]);
    setSelectedDestinationIds([]);
    setDateRange([]);
    onSearch({});
  };

  const hasActiveFilters = searchTerm || selectedTagIds.length > 0 || 
    selectedLocationTypeIds.length > 0 || selectedDestinationIds.length > 0 ||
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
              placeholder="Filter by Tags"
              style={{ width: '100%' }}
              value={selectedTagIds}
              onChange={setSelectedTagIds}
              allowClear
              maxTagCount="responsive"
            >
              {tags.map(tag => (
                <Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
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
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Filter by Destinations"
              style={{ width: '100%' }}
              value={selectedDestinationIds}
              onChange={setSelectedDestinationIds}
              allowClear
              maxTagCount="responsive"
            >
              {destinations.map(dest => (
                <Option key={dest.id} value={dest.id}>
                  {dest.name}
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
