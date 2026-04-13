import React from 'react';
import { Table, Button, Space, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import { PAGINATION } from '@/config/constants';
import styles from '../styles/TagTable.module.css';

const TagTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView }) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <span className={styles.tagNameContainer} style={{ paddingLeft: record.level > 1 ? 20 : 0 }}>
          {record.level > 1 && <span className={styles.treeIcon}>└</span>}
          <span className={styles.tagName}>{name}</span>
        </span>
      ),
    },
    {
      title: 'Parent Tag',
      dataIndex: 'parentTagName',
      key: 'parentTagName',
      width: 180,
      render: (parentTagName, record) => (
        parentTagName ? (
          <span className={styles.parentName}>{parentTagName}</span>
        ) : (
          <span className={styles.emptyDash}>—</span>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space direction="horizontal" size="small" className={styles.actionSpace}>
          <Button
            type="text"
            className={styles.actionBtnView}
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          />
          <Button
            type="text"
            className={styles.actionBtnEdit}
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="Delete Tag"
            description="Are you sure you want to delete this tag?"
            onConfirm={() => onDelete(record)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger className={styles.actionBtnDelete} icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handlePaginationChange = (page, pageSize) => {
    if (onTableChange) {
      onTableChange(
        { current: page, pageSize, total: pagination?.total },
        {},
        {}
      );
    }
  };

  return (
    <div className={styles.responsiveTable}>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        pagination={false}
        onChange={onTableChange}
        className={styles.tropicalTable}
      />
      <div className={styles.paginationWrapper}>
        <AppPagination
          current={pagination?.current || PAGINATION.DEFAULT_PAGE}
          pageSize={pagination?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE}
          total={pagination?.total || 0}
          onChange={handlePaginationChange}
        />
      </div>
    </div>
  );
};

export default TagTable;