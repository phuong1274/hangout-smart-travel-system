import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import SearchFilter from '@/components/UI/SearchFilter';
import { useTags } from '../hooks/useTags';
import TagTable from '../components/TagTable';
import TagForm from '../components/TagForm';
import DetailModal from '@/components/DetailModal';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import { message } from 'antd';
import { deleteTagApi, getTagByIdApi } from '../api';

const { Title } = Typography;
const { Header, Content } = Layout;

const TagsPage = () => {
  const navigate = useNavigate();
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
      // Handled by global interceptor
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HomeOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>Hangout - Tags</Title>
        </div>
        <Button type="primary" onClick={() => navigate(PATHS.AUTH.LOGIN)}>
          Login
        </Button>
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>Tag Management</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Tag
            </Button>
          </div>
          <Card>
            <SearchFilter
              onSearch={handleSearch}
              loading={loading}
              placeholder="Search tags..."
            />
            <TagTable
              data={data}
              loading={loading}
              pagination={pagination}
              onTableChange={handleTableChange}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
            />
          </Card>
        </Space>
      </Content>
      <TagForm
        open={formOpen}
        tag={editingTag}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingTag(null);
        }}
        data={viewingTag}
        type="tag"
      />
    </Layout>
  );
};

export default TagsPage;
