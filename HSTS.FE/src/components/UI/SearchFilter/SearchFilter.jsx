import React, { useState } from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styles from './SearchFilter.module.css';

const SearchFilter = ({ 
  onSearch, 
  placeholder = "Search...", 
  loading = false,
  extra,
  ...props 
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const handleClear = (e) => {
    setSearchValue(e.target.value);
    if (e.type === 'click' && onSearch) {
      onSearch('');
    }
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.customSearchPill}>
        <Input
          className={styles.pillInput}
          placeholder={placeholder}
          value={searchValue}
          onChange={handleClear}
          onPressEnter={handleSearch}
          allowClear
          bordered={false}
          {...props}
        />
        <Button
          className={styles.pillButton}
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={handleSearch}
        />
      </div>
      {extra && <div className={styles.extraWrapper}>{extra}</div>}
    </div>
  );
};

export default SearchFilter;