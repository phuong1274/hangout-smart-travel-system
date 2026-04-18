import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { ArrowRightOutlined, CalendarOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { createTripApi, getProvincesApi } from '../api';
import { PATHS } from '@/routes/paths';
import { useAuthStore } from '@/store/authStore';
import styles from './ManualTripSetupPage.module.css';

const { Title, Text } = Typography;

const ManualTripSetupPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const response = await getProvincesApi();
        const items = Array.isArray(response) ? response : response?.items || response?.Items || [];
        if (!mounted) return;

        const options = items
          .map((item) => {
            const id = Number(item?.id ?? item?.Id);
            if (!Number.isFinite(id) || id <= 0) return null;

            const englishName = String(item?.englishName || item?.EnglishName || '').trim();
            const localName = String(item?.name || item?.Name || '').trim();
            const name = englishName || localName || `Province #${id}`;

            return { id, name };
          })
          .filter(Boolean);

        setProvinces(options);
      } catch {
        if (mounted) {
          setProvinces([]);
          message.error('Cannot load provinces.');
        }
      } finally {
        if (mounted) {
          setLoadingProvinces(false);
        }
      }
    };

    loadProvinces();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const selectedProvinceId = Number(values.startProvinceId);
      const selectedProvince = provinces.find((province) => province.id === selectedProvinceId) || null;
      const selectedProvinceName = selectedProvince?.name || null;

      const payload = {
        tripName: values.tripName.trim(),
        description: values.description?.trim() || null,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        groupSize: values.groupSize || 1,
        startingLocation: selectedProvinceName,
        currency: values.currency || 'VND',
        profileId: user?.id,
      };

      const result = await createTripApi(payload);
      const createdTripId = result?.id || result?.Id;

      if (!createdTripId) {
        message.error('Cannot get created trip ID.');
        return;
      }

      message.success('Trip created. Continue adding day and location details.');
      navigate(`${PATHS.CREATE_TRIP_MANUAL_BUILDER}?tripId=${createdTripId}`, {
        state: {
          tripInfo: {
            ...result,
            startingLocation: selectedProvinceName,
            StartingLocation: selectedProvinceName,
          },
          tripId: createdTripId,
          defaultProvinceId: selectedProvince?.id || null,
        },
      });
    } catch (error) {
      const errorMsg = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to create trip';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FF6B6B',
          colorText: '#1A535C',
          borderRadius: 16,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <div className={styles.pageShell}>
        <div className={styles.pageContent}>
          <Card className={styles.heroCard} bordered={false}>
            <Space direction="vertical" size={6}>
              <Text className={styles.heroEyebrow}>Manual Trip Flow</Text>
              <Title level={2} className={styles.heroTitle}>Create trip and add each day/location manually</Title>
              <Text className={styles.heroSubtitle}>
                This is a dedicated manual flow page. After this step, you will add each day and destination one by one.
              </Text>
            </Space>
          </Card>

          <Card className={styles.formCard} bordered={false}>
            <Form
              layout="vertical"
              form={form}
              onFinish={handleSubmit}
              initialValues={{ groupSize: 1, currency: 'VND' }}
            >
              <Row gutter={[16, 12]}>
                <Col xs={24}>
                  <Form.Item
                    label="Trip Name"
                    name="tripName"
                    rules={[
                      { required: true, message: 'Please enter trip name' },
                      { min: 1, message: 'Trip name cannot be empty' },
                      { max: 200, message: 'Trip name cannot exceed 200 characters' },
                    ]}
                  >
                    <Input placeholder="e.g., Central Vietnam Road Trip" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label="Description"
                    name="description"
                    rules={[{ max: 2000, message: 'Description cannot exceed 2000 characters' }]}
                  >
                    <Input.TextArea rows={3} placeholder="Optional" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Space><CalendarOutlined />Start Date</Space>}
                    name="startDate"
                    rules={[{ required: true, message: 'Please select start date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Space><CalendarOutlined />End Date</Space>}
                    name="endDate"
                    rules={[{ required: true, message: 'Please select end date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      disabledDate={(current) => {
                        const startDate = form.getFieldValue('startDate');
                        return current && (
                          current.isBefore(dayjs().startOf('day')) ||
                          (startDate && current.isBefore(startDate, 'day'))
                        );
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label={<Space><TeamOutlined />Group Size</Space>}
                    name="groupSize"
                    rules={[{ required: true, message: 'Please enter group size' }]}
                  >
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label={<Space><EnvironmentOutlined />Province</Space>}
                    name="startProvinceId"
                    rules={[{ required: true, message: 'Please select province' }]}
                  >
                    <Select
                      showSearch
                      allowClear
                      placeholder="Select province"
                      loading={loadingProvinces}
                      optionFilterProp="label"
                      options={provinces.map((province) => ({
                        label: province.name,
                        value: province.id,
                      }))}
                      notFoundContent={loadingProvinces ? 'Loading provinces...' : 'No provinces'}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Currency"
                    name="currency"
                    rules={[{ required: true, message: 'Please select currency' }]}
                  >
                    <Select
                      options={[
                        { label: 'VND (Vietnamese Dong)', value: 'VND' },
                        { label: 'USD (US Dollar)', value: 'USD' },
                        { label: 'EUR (Euro)', value: 'EUR' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div className={styles.footerAction}>
                <Button type="primary" htmlType="submit" loading={submitting} icon={<ArrowRightOutlined />}>
                  Continue to Day/Location Builder
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ManualTripSetupPage;
