import React, { useState } from 'react';
import { Button, Card, Typography, Space } from 'antd';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import { useUsers } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserFilters } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import styles from '../styles/UsersPage.module.css';

const { Title, Text } = Typography;

const UsersPage = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const {
    data,
    loading,
    pagination,
    filterState,
    handleTableChange,
    handleSearch,
    setRoleFilter,
    setStatusFilter,
    fetchUsers,
  } = useUsers();
  const { roles } = useRoles();

  return (
    <div className={styles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={1} className={styles.headingMain}>User Management</Title>
          <Text className={styles.subHeading}>Create users, review lifecycle state, and manage governance actions.</Text>
        </div>
        <Card className={styles.cardWrapper}>
          <SearchFilter
            onSearch={handleSearch}
            loading={loading}
            placeholder="Search by name or email"
            extra={(
              <Space wrap>
                <UserFilters
                  roles={roles}
                  filterState={filterState}
                  onRoleChange={setRoleFilter}
                  onStatusChange={setStatusFilter}
                />
                <Button type="primary" onClick={() => setCreateModalOpen(true)}>
                  Create user
                </Button>
              </Space>
            )}
          />
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
  );
};

export default UsersPage;