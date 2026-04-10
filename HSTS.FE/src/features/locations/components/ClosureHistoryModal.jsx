import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Button, Popconfirm, message } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getClosuresByLocationApi, endClosureApi } from '../api/closures';
import styles from '../styles/ClosureHistoryModal.module.css';

const ClosureHistoryModal = ({ open, onClose, locationId, locationName, onClosureChange }) => {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [endingId, setEndingId] = useState(null);

  useEffect(() => {
    if (open && locationId) {
      fetchClosures();
    }
  }, [open, locationId]);

  const fetchClosures = async () => {
    setLoading(true);
    try {
      const data = await getClosuresByLocationApi(locationId);
      setClosures(data || []);
    } catch (error) {
      message.error('Failed to load closure history.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndClosure = async (closureId) => {
    setEndingId(closureId);
    try {
      await endClosureApi(closureId);
      message.success('Closure cancelled successfully.');
      await fetchClosures();
      if (onClosureChange) {
        onClosureChange();
      }
    } catch (error) {
      message.error('Failed to cancel closure.');
    } finally {
      setEndingId(null);
    }
  };

  const columns = [
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date) => <span className={styles.bodyText}>{dayjs(date).format('YYYY-MM-DD')}</span>,
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date) => <span className={styles.bodyText}>{dayjs(date).format('YYYY-MM-DD')}</span>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text) => <span className={styles.bodyText}>{text || '—'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      width: 100,
      render: (isActive) => (
        <Tag className={isActive ? styles.customTagDanger : styles.customTagDefault}>
          {isActive ? 'ACTIVE' : 'ENDED'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) =>
        record.isActive ? (
          <Popconfirm
            title="Cancel Closure"
            description="Are you sure you want to cancel this closure? The location will become active again."
            onConfirm={() => handleEndClosure(record.id)}
            okText="Yes, Cancel"
            cancelText="No"
          >
            <Button
              type="text"
              className={styles.actionBtnDanger}
              icon={<CloseCircleOutlined />}
              loading={endingId === record.id}
            >
              CANCEL
            </Button>
          </Popconfirm>
        ) : (
          <span className={styles.bodyText}>—</span>
        ),
    },
  ];

  return (
    <Modal
      title={<span className={styles.modalTitle}>Closure History: {locationName}</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
      rootClassName={styles.tropicalModal}
    >
      <div className={styles.tableWrapper}>
        <Table
          className={styles.tropicalTable}
          columns={columns}
          dataSource={closures}
          loading={loading}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'No closures found for this location.' }}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </Modal>
  );
};

export default ClosureHistoryModal;