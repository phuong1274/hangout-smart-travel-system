import React from 'react';
import { Card, Typography, Space } from 'antd';
import SearchFilter from '@/components/UI/SearchFilter';
import { useUsers } from '../hooks/useUsers';
import { UserTable } from '../components/UserTable';
import styles from '../styles/UsersPage.module.css';

const { Title, Text } = Typography;

const UsersPage = () => {
  const { 
    data, 
    loading, 
    pagination, 
    handleTableChange, 
    handleSearch 
  } = useUsers();

  return (
    <div className={styles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={1} className={styles.headingMain}>User Management</Title>
          <Text className={styles.subHeading}>Manage the Explorers</Text>
        </div>
        <Card className={styles.cardWrapper}>
          <SearchFilter 
            onSearch={handleSearch} 
            loading={loading} 
            placeholder="Search by name or email"
          />
          <UserTable
            data={data}
            loading={loading}
            pagination={pagination}
            onTableChange={handleTableChange}
          />
        </Card>
      </Space>
    </div>
  );
};

export default UsersPage;