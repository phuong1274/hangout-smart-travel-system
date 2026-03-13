import React from 'react';
import { Row, Col, Typography } from 'antd';
import StorySectionImage from '../assets/StorySectionImage.jpg';
import styles from '../styles/StorySection.module.css';

const { Title, Paragraph, Text } = Typography;

const StorySection = () => {
  return (
    <section className={styles.sectionContainer}>
      <Row className={styles.rowWrapper} align="middle">
        <Col xs={24} md={13} className={styles.leftContent}>
          <Title level={2} className={styles.mainTitle}>
            Vietnam – Where Every Path Tells a Story
          </Title>
          
          <Paragraph className={styles.paragraphText}>
            Every corner of Vietnam hides a unique story—the crashing waves of Ha Long Bay, 
            the glow of lanterns in Hoi An, or the rich aroma of a morning bowl of Pho. 
            With Hangout, exploring Vietnam is easier than ever. We blend local beauty 
            with smart technology to craft itineraries designed just for you.
          </Paragraph>

          <Text italic className={styles.quoteText}>
            "Once you have loved it, you will love it forever."
          </Text>
        </Col>

        
        <Col xs={24} md={11} className={styles.rightImageWrapper}>
          <img 
            alt="Map of Vietnam" 
            src={StorySectionImage} 
            className={styles.storyImage} 
          />
        </Col>
      </Row>
    </section>
  );
};

export default StorySection;