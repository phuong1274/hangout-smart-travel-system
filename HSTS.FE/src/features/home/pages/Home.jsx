import React from 'react';
import { Layout, Skeleton } from 'antd';
import AppHeader from '@/features/home/components/Header';
import HomeHero from '@/features/home/components/HomeHero';
import FeaturedDestinations from '@/features/home/components/FeaturedDestinations';
import PopularLocations from '@/features/home/components/PopularLocations';
import PlanningEntry from '@/features/home/components/PlanningEntry';
import SocialProofBand from '@/features/home/components/SocialProofBand';
import AppFooter from '@/features/home/components/Footer';
import { useHomeDiscovery } from '@/features/home/hooks/useHomeDiscovery';
import styles from '@/features/home/styles/Home.module.css';

const { Content } = Layout;

const Home = () => {
  const { discovery, destinations, loading } = useHomeDiscovery();

  return (
    <Layout className={styles.layoutWrapper}>
      <div className={styles.heroWrapper}>
        <AppHeader destinations={destinations} />
        <HomeHero hero={discovery?.hero} />
      </div>

      <Content className={styles.contentSection}>
        {loading ? (
          <div className={styles.sectionPadding}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : (
          <>
            <div className={styles.sectionPadding}>
              <FeaturedDestinations destinations={destinations} />
            </div>

            <div className={styles.sectionPadding}>
              <PopularLocations locations={discovery?.popularLocations || []} />
            </div>

            <div className={styles.sectionPadding}>
              <PlanningEntry planningEntry={discovery?.planningEntry} />
            </div>

            <div className={styles.sectionPadding}>
              <SocialProofBand stats={discovery?.socialProof?.stats || []} />
            </div>
          </>
        )}
      </Content>

      <AppFooter />
    </Layout>
  );
};

export default Home;
