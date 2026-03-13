import React from 'react';
import { Typography, Button } from 'antd';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import styles from '../styles/Hero.module.css';
import backgroundHero from '../assets/BackgroundHero.jpg';

const { Title, Paragraph } = Typography;

const Hero = () => (
  <section 
    className={styles.heroContent} 
    style={{ '--bg-image': `url(${backgroundHero})` }}
  >

    <div className={styles.mainText}>
      <Title level={1} className={styles.titleText}>
        Craft Unforgettable Itineraries with
      </Title>
      <Title level={1} className={styles.highlightTitle}>
        Automatic Trip Planner
      </Title>
      <Paragraph className={styles.description}>
        Your personal trip planner and travel curator, creating custom itineraries <br/> 
        tailored to your interests and budget.
      </Paragraph>
      <Link to={PATHS.AUTH.LOGIN}>
        <Button type="primary" size="large" className={styles.ctaBtn}>
          Get Started - It's free
        </Button>
      </Link>
    </div>
  </section>
);

export default Hero;