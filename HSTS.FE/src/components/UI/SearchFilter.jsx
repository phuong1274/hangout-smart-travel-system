import React from 'react';
import { Input, Space } from 'antd';

const { Search } = Input;

const SearchFilter = ({ 
  onSearch, 
  placeholder = "Search...", 
  loading = false,
  extra,
  ...props 
}) => {
  return (
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        <Search
          placeholder={placeholder}
          onSearch={onSearch}
          loading={loading}
          allowClear
          enterButton
          style={{ width: 300 }}
          {...props}
        />
      </Space>
      {extra && <div className="filter-extra">{extra}</div>}
    </div>
  );
};

export default SearchFilter;
