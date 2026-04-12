import React, { useMemo, useState } from 'react';
import { Button, Form, Select, message } from 'antd';
import { usersApi } from '../api';
import styles from '../styles/ChangeUserRoleForm.module.css';

export const ChangeUserRoleForm = ({ user, roles, onChanged }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles]
  );

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      await usersApi.changeUserRole({ userId: user.id, roleId: values.roleId });
      message.success('User role updated. The user must sign in again.');
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className={styles.form}
      initialValues={{ roleId: roles.find((role) => user.roles?.includes(role.name))?.id }}
      onFinish={handleFinish}
    >
      <Form.Item name="roleId" label="Role" rules={[{ required: true, message: 'Role is required.' }]}>
        <Select options={roleOptions} placeholder="Select a role" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={submitting}>Update role</Button>
    </Form>
  );
};