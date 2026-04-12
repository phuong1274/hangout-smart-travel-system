import React, { useState } from 'react';
import { Button, Card, Typography, Space, ConfigProvider } from 'antd';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import { useUsers } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserFilters } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import styles from '../styles/UsersPage.module.css';

const { Title } = Typography;

const UsersPage = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const {
    data,
    loading,
    pagination,
    filterState,
    handleTableChange,
    handleSearch,
    handleRoleFilterChange,
    handleStatusFilterChange,
    fetchUsers,
  } = useUsers();
  const { roles } = useRoles();

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FFE66D',
          borderRadius: 16,
          colorText: '#1A535C',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <div className={styles.container}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={1} className={styles.headingMain}>User Management</Title>
          </div>
          <Card className={styles.cardWrapper}>
            <div className={styles.filterToolbar}>
              <div className={styles.leftActions}>
                <div className={styles.searchSection}>
                  <SearchFilter
                    onSearch={handleSearch}
                    loading={loading}
                    placeholder="Search by name or email"
                  />
                </div>
                <UserFilters
                  roles={roles}
                  filterState={filterState}
                  onRoleChange={handleRoleFilterChange}
                  onStatusChange={handleStatusFilterChange}
                />
              </div>
              <div className={styles.rightActions}>
                <Button type="primary" onClick={() => setCreateModalOpen(true)}>
                  Create user
                </Button>
              </div>
            </div>
            <UserTable
              data={data}
              loading={loading}
              pagination={pagination}
              onTableChange={handleTableChange}
              onChanged={fetchUsers}
            />
          </Card>
        </Space>

        <CreateUserModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreated={fetchUsers}
          roles={roles}
        />
      </div>
    </ConfigProvider>
  );
};

export default UsersPage;