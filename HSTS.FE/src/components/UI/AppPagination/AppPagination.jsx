import React from 'react';
import { Pagination } from 'antd';
import { PAGINATION } from '@/config/constants';
import styles from './AppPagination.module.css';

const AppPagination = ({ 
  current = PAGINATION.DEFAULT_PAGE, 
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE, 
  total = 0, 
  onChange,
  ...props 
}) => {
  return (
    <Pagination
      className={styles.tropicalPagination}
      current={current}
      pageSize={pageSize}
      total={total}
      showSizeChanger
      pageSizeOptions={PAGINATION.PAGE_SIZE_OPTIONS}
      showTotal={(totalCount) => `Total ${totalCount} items`}
      onChange={onChange}
      {...props}
    />
  );
};

export default AppPagination;