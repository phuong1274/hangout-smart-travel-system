import React from 'react';
import { Table, Button, Space, Popconfirm, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, EnvironmentOutlined, EyeOutlined, PhoneOutlined, MailOutlined, LinkOutlined, LockOutlined, UnlockOutlined, HistoryOutlined } from '@ant-design/icons';
import AppPagination from '@/components/UI/AppPagination/AppPagination';
import styles from '../styles/LocationTable.module.css';

const LocationStatus = {
  Active: 1,
  TemporarilyClosed: 2,
  Inactive: 3,
};

const LocationTable = ({ data, loading, pagination, onTableChange, onEdit, onDelete, onView, onCloseLocation, onOpenLocation, onViewClosureHistory }) => {
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text, record) => (
        <div className={styles.nameCell}>
          <strong className={styles.cellTitle}>{text}</strong>
          {record.destinationName && (
            <div className={styles.subText}>
              <EnvironmentOutlined className={styles.iconSub} />
              {record.destinationName}
            </div>
          )}
          {record.socialLinks && record.socialLinks.length > 0 && (
            <div className={styles.linkText}>
              <LinkOutlined className={styles.iconSub} />
              {record.socialLinks.length} link(s)
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'locationTypeName',
      key: 'locationTypeName',
      width: 100,
      render: (text) => <span className={styles.bodyText}>{text || 'N/A'}</span>,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 120,
      ellipsis: true,
      render: (text) => <span className={styles.bodyText}>{text}</span>,
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 120,
      render: (_, record) => (
        <div className={styles.bodyText}>
          {record.telephone && (
            <div><PhoneOutlined className={styles.iconSub} />{record.telephone}</div>
          )}
          {record.email && (
            <div className={styles.subText}><MailOutlined className={styles.iconSub} />{record.email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      width: 120,
      render: (_, record) => (
        <div className={styles.bodyText}>
          {record.ticketPrice > 0 && <div className={styles.priceHighlight}>${record.ticketPrice.toFixed(2)}</div>}
          {record.priceRange && <Tag className={styles.customTagInfo}>{record.priceRange}</Tag>}
          {(record.priceMinUsd || record.priceMaxUsd) && (
            <div className={styles.subText}>
              ${record.priceMinUsd?.toFixed(2) || '0'} - ${record.priceMaxUsd?.toFixed(2) || '0'}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'effectiveStatus',
      width: 120,
      render: (_, record) => {
        const status = record.effectiveStatus || LocationStatus.Active;
        if (status === LocationStatus.TemporarilyClosed) {
          return <Tag className={styles.customTagDanger}>CLOSED</Tag>;
        }
        if (status === LocationStatus.Inactive) {
          return <Tag className={styles.customTagDefault}>INACTIVE</Tag>;
        }
        return <Tag className={styles.customTagSuccess}>ACTIVE</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const status = record.effectiveStatus || LocationStatus.Active;
        const isClosed = status === LocationStatus.TemporarilyClosed;
        const isInactive = status === LocationStatus.Inactive;

        return (
          <Space direction="vertical" size="small">
            <Tooltip title="View details & reviews">
              <Button
                type="text"
                className={styles.actionBtnInfo}
                icon={<EyeOutlined />}
                onClick={() => onView(record)}
                aria-label="View details & reviews"
              >
                VIEW
              </Button>
            </Tooltip>
            {!isInactive && (
              <Tooltip title="Edit location">
                <Button
                  type="text"
                  className={styles.actionBtnPrimary}
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  aria-label="Edit location"
                >
                  EDIT
                </Button>
              </Tooltip>
            )}
            {!isInactive && (
              <Tooltip title="View closure history">
                <Button
                  type="text"
                  className={styles.actionBtnInfo}
                  icon={<HistoryOutlined />}
                  onClick={() => onViewClosureHistory?.(record)}
                  aria-label="View closure history"
                >
                  HISTORY
                </Button>
              </Tooltip>
            )}
            {isClosed ? (
              <Popconfirm title="Open Location" onConfirm={() => onOpenLocation(record)} okText="Yes, Open" cancelText="Cancel">
                <Button type="text" className={styles.actionBtnSuccess} icon={<UnlockOutlined />} aria-label="Open location">
                  OPEN
                </Button>
              </Popconfirm>
            ) : !isInactive ? (
              <Tooltip title="Temporarily close location">
                <Button
                  type="text"
                  className={styles.actionBtnWarning}
                  icon={<LockOutlined />}
                  onClick={() => onCloseLocation(record)}
                  aria-label="Temporarily close location"
                >
                  CLOSE
                </Button>
              </Tooltip>
            ) : null}
            <Popconfirm
              title="Delete Location"
              description="Are you sure you want to delete this location?"
              onConfirm={() => onDelete(record)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete location">
                <Button type="text" className={styles.actionBtnDanger} icon={<DeleteOutlined />} aria-label="Delete location">
                  DELETE
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const handlePaginationChange = (page, pageSize) => {
    if (onTableChange) {
      onTableChange({ current: page, pageSize });
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <Table
        className={styles.tropicalTable}
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        pagination={false}
        onChange={onTableChange}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <AppPagination
          current={pagination?.current}
          pageSize={pagination?.pageSize}
          total={pagination?.total}
          onChange={handlePaginationChange}
        />
      </div>
    </div>
  );
};

export default LocationTable;