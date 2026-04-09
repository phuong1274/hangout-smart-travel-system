import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { createLocationTypeApi, updateLocationTypeApi } from '../api';
import styles from '../styles/LocationTypeForm.module.css';

const LocationTypeForm = ({ open, locationType, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const isEdit = !!locationType;

  useEffect(() => {
    if (locationType) {
      form.setFieldsValue({
        name: locationType.name,
      });
    } else {
      form.resetFields();
    }
  }, [locationType, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updateLocationTypeApi(locationType.id, values);
      } else {
        await createLocationTypeApi(values);
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
      title={<span className={styles.modalTitle}>{isEdit ? 'Update Destination Type' : 'New Destination Type'}</span>}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnClose
      className={styles.tropicalModal}
      okText={isEdit ? 'SAVE CHANGES' : 'CREATE NOW'}
      cancelText="CANCEL"
      centered
    >
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        className={styles.customForm}
      >
        <Form.Item
          name="name"
          label={<span className={styles.inputLabel}>LOCATION TYPE NAME</span>}
          rules={[
            { required: true, message: 'Please enter location type name' },
            { max: 100, message: 'Location type name cannot exceed 100 characters' }
          ]}
        >
          <Input 
            placeholder="e.g. Tropical Beach, Mountain Retreat" 
            className={styles.customInput}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LocationTypeForm;