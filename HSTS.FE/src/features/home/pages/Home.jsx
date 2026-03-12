import React from 'react';
import { Layout } from 'antd';
import AppHeader from '../components/Header';
import Hero from '../components/Hero';
import StorySection from '../components/StorySection';
import DestinationList from '../components/DestinationList';
import CallToAction from '../components/CallToAction';
import AppFooter from '../components/Footer';
import styles from '../styles/Home.module.css';

const { Content } = Layout;

const Home = () => {
  return (
    <Layout style={{ background: '#fff' }}>
      <div className={styles.heroWrapper}>
        <AppHeader />
        <Hero />
      </div>

      {/* SCROLLABLE CONTENT */}
      <Content className={styles.contentSection}>
        <div className={styles.sectionPadding}>
          <StorySection />
        </div>
        
        <div className={styles.sectionPadding}>
          <DestinationList />
        </div>

        <CallToAction />
      </Content>
      
      <AppFooter />
    </Layout>
  );
};

export default Home;