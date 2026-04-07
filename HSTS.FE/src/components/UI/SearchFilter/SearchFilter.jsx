import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import styles from './SearchFilter.module.css';

const SearchFilter = ({ 
  onSearch, 
  placeholder = "Search...", 
  extra,
  ...props 
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    if (value === '' && onSearch) {
      onSearch('');
    }
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.customSearchPill}>
        <input
          type="text"
          className={styles.pillInput}
          placeholder={placeholder}
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <button
          type="button"
          className={styles.pillButton}
          onClick={handleSearch}
        >
          <SearchOutlined />
        </button>
      </div>
      {extra && <div className={styles.extraWrapper}>{extra}</div>}
    </div>
  );
};

export default SearchFilter;