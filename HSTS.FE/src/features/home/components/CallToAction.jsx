import React from 'react';
import { Button, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import styles from '../styles/Home.module.css';

const { Title } = Typography;

const CallToAction = () => (
  <section className={styles.ctaBanner}>
    <Title level={2} className={styles.ctaTitle}>
    Skip the manual trip planning and<br/>start your effortless journey with Trip<br/> Planner Automatic today, at no cost.
    </Title>
    <Link to={PATHS.AUTH.LOGIN}>
      <Button size="large" className={styles.ctaWhiteBtn}>
        Try now
      </Button>
    </Link>
  </section>
);

export default CallToAction;