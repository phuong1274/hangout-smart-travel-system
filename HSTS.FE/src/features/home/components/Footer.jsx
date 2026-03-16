import React from 'react';
import { Row, Col, Typography, Space } from 'antd';
import WebLogo from '../assets/WebLogo.png';
import styles from '../styles/Footer.module.css';

const { Text, Title } = Typography;

const AppFooter = () => (
  <footer className={styles.footerContainer}>
    <Row justify="space-between" align="middle">
      
      <Col xs={24} md={8}>
        <div className={styles.logoWrapper}>
          <img src={WebLogo} alt="Hangout Logo" className={styles.logoImage} />
          <h1 className={styles.brandName}>Hangout</h1>
        </div>
      </Col>

      <Col xs={12} md={4}>
        <Title level={4} className={styles.columnTitle}>Explore</Title>
        <Space direction="vertical" size="middle">
          <Text className={styles.linkText}>Itineraries</Text>
          <Text className={styles.linkText}>Popular Destinations</Text>
          <Text className={styles.linkText}>Community Guides</Text>
        </Space>
      </Col>

      <Col xs={12} md={4}>
        <Title level={4} className={styles.columnTitle}>Support</Title>
        <Space direction="vertical" size="middle">
          <Text className={styles.linkText}>Help Center</Text>
          <Text className={styles.linkText}>FAQs</Text>
          <Text className={styles.linkText}>Contact Us</Text>
        </Space>
      </Col>

      <Col xs={12} md={4}>
        <Title level={4} className={styles.columnTitle}>Legal</Title>
        <Space direction="vertical" size="middle">
          <Text className={styles.linkText}>Privacy Policy</Text>
          <Text className={styles.linkText}>Terms of Service</Text>
          <Text className={styles.linkText}>Cookie Policy</Text>
        </Space>
      </Col>

    </Row>

    <div className={styles.bottomText}>
      © 2026 Hangout Inc. All rights reserved. Optimizing the world, one trip at a time.
    </div>
  </footer>
);

export default AppFooter;