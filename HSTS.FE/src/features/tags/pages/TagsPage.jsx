import React, { useState } from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter/SearchFilter';
import { useTags } from '../hooks/useTags';
import TagTable from '../components/TagTable';
import TagForm from '../components/TagForm';
import DetailModal from '@/components/UI/DetailModal/DetailModal';
import { message } from 'antd';
import { deleteTagApi, getTagByIdApi } from '../api';
import styles from '../styles/TagsPage.module.css';

const { Title } = Typography;

const TagsPage = () => {
  const {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchTags,
  } = useTags();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [viewingTag, setViewingTag] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleCreate = () => {
    setEditingTag(null);
    setFormOpen(true);
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTag(null);
  };

  const handleFormSuccess = () => {
    fetchTags();
  };

  const handleView = async (tag) => {
    try {
      const detail = await getTagByIdApi(tag.id);
      setViewingTag(detail);
      setDetailModalOpen(true);
    } catch (error) {
      message.error('Failed to load tag details');
    }
  };

  const handleDelete = async (tag) => {
    try {
      await deleteTagApi(tag.id);
      message.success('Tag deleted successfully');
      fetchTags();
    } catch (error) {
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <div className={styles.ambientCircle1} />
        <div className={styles.ambientCircle2} />
        <Space direction="vertical" size="large" className={styles.mainContainer}>
          <div className={styles.pageHeader}>
            <Title level={2} className={styles.mainHeading}>Tag Management</Title>
          </div>
          <Card className={styles.tropicalCard}>
            <div className={styles.cardInner}>
              <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                  <SearchFilter
                    onSearch={handleSearch}
                    loading={loading}
                    placeholder="Search tags..."
                  />
                </div>
                <Button type="primary" className={styles.ctaButton} icon={<PlusOutlined />} onClick={handleCreate}>
                  Add Tag
                </Button>
              </div>
              <div className={styles.tableWrapper}>
                <TagTable
                  data={data}
                  loading={loading}
                  pagination={pagination}
                  onTableChange={handleTableChange}
                  onEdit={handleEdit}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          </Card>
        </Space>
      </div>
      <TagForm
        open={formOpen}
        tag={editingTag}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingTag(null);
        }}
        data={viewingTag}
        type="tag"
      />
    </div>
  );
};

export default TagsPage;