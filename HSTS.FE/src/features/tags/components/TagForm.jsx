import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { createTagApi, updateTagApi, getTagsApi } from '../api';
import styles from '../styles/TagForm.module.css';

const TagForm = ({ open, tag, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [fetchingTags, setFetchingTags] = useState(false);

  const isEdit = !!tag;

  useEffect(() => {
    if (open) {
      setFetchingTags(true);
      getTagsApi({ pageSize: 1000 })
        .then(res => {
          const allTags = res.items || res || [];
          const filteredTags = isEdit ? allTags.filter(t => t.id !== tag.id) : allTags;
          setTags(filteredTags);
        })
        .catch(err => {
          message.error('Failed to load tags');
        })
        .finally(() => {
          setFetchingTags(false);
        });
    }
  }, [open, isEdit, tag?.id]);

  useEffect(() => {
    if (tag) {
      form.setFieldsValue({
        name: tag.name,
        parentTagId: tag.parentTagId,
      });
    } else {
      form.resetFields();
    }
  }, [tag, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        parentTagId: values.parentTagId || null
      };

      if (isEdit) {
        await updateTagApi(tag.id, payload);
      } else {
        await createTagApi(payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span className={styles.modalTitle}>{isEdit ? 'Edit Tag' : 'Create Tag'}</span>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      className={styles.tropicalModal}
      okButtonProps={{ className: styles.submitBtn }}
      cancelButtonProps={{ className: styles.cancelBtn }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className={styles.formContainer}>
        <Form.Item
          name="name"
          label={<span className={styles.formLabel}>Tag Name</span>}
          rules={[
            { required: true, message: 'Please enter tag name' },
            { max: 100, message: 'Tag name cannot exceed 100 characters' }
          ]}
        >
          <Input placeholder="Enter tag name" className={styles.inputField} />
        </Form.Item>

        <Form.Item
          name="parentTagId"
          label={<span className={styles.formLabel}>Parent Tag (Optional)</span>}
          tooltip="Select a parent tag to create a hierarchy. Leave empty for root level."
        >
          <Select
            placeholder="Select parent tag"
            allowClear
            loading={fetchingTags}
            showSearch
            optionFilterProp="children"
            className={styles.selectField}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={tags.map(t => ({
              value: t.id,
              label: `${'  '.repeat(t.level - 1)}${t.level > 1 ? '└ ' : ''}${t.name} (Level ${t.level})`
            }))}
          />
        </Form.Item>

        {!isEdit && (
          <Form.Item
            name="level"
            label={<span className={styles.formLabel}>Level</span>}
            tooltip="Automatically calculated based on parent tag"
          >
            <Input disabled value={form.getFieldValue('parentTagId') ? 'Level 2 (Child)' : 'Level 1 (Root)'} className={styles.inputDisabled} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default TagForm;