import { Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateProfile, useUpdateProfile } from '../api/users.query';
import type { ProfileDto } from '../types/users.type';

interface ProfileFormModalProps {
  open: boolean;
  profile: ProfileDto | null;
  onClose: () => void;
}

export const ProfileFormModal = ({ open, profile, onClose }: ProfileFormModalProps) => {
  const [form] = Form.useForm();
  const createMutation = useCreateProfile();
  const updateMutation = useUpdateProfile();
  const { t } = useTranslation('profile');
  const isEditing = !!profile;

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        profile
          ? {
              profileName: profile.profileName,
              address: profile.address,
              avatarUrl: profile.avatarUrl,
            }
          : { profileName: '', address: '', avatarUrl: '' },
      );
    }
  }, [open, profile, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    if (isEditing) {
      updateMutation.mutate({ profileId: profile.id, ...values }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(values, { onSuccess: () => onClose() });
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? t('profiles.edit') : t('profiles.create')}
      okText={isEditing ? t('profiles.save') : t('profiles.create')}
      cancelText={t('profiles.cancel')}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="profileName"
          label={t('profiles.name')}
          rules={[
            { required: true, message: t('profiles.nameRequired') },
            { max: 100, message: t('profiles.nameMax') },
          ]}
        >
          <Input size="large" />
        </Form.Item>

        <Form.Item
          name="address"
          label={t('profiles.address')}
          rules={[{ max: 500, message: t('profiles.addressMax') }]}
        >
          <Input size="large" />
        </Form.Item>

        <Form.Item
          name="avatarUrl"
          label={t('profiles.avatarUrl')}
          rules={[{ max: 500, message: t('profiles.avatarUrlMax') }]}
        >
          <Input size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
