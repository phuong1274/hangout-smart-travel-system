import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import HaLongImg from '../assets/Demo/HaLong.jpg';
import HoiAnImg from '../assets/Demo/HoiAn.jpg';
import HaGiangImg from '../assets/Demo/HaGiang.jpg';
import styles from '../styles/Home.module.css';

const { Title } = Typography;

const destinations = [
  { 
    title: "Ha Long Bay: The Dragon's Legend", 
    desc: "Explore emerald waters and limestone karsts with this optimized 3-day cruise itinerary.", 
    alt: "Ha Long Bay",
    img: HaLongImg 
  },
  { 
    title: "Hoi An Ancient Town", 
    desc: "A soulful guide to the best lantern-lit streets, tailor shops, and local street food gems.", 
    alt: "Hoi An",
    img: HoiAnImg 
  },
  { 
    title: "Ha Giang Loop Adventure", 
    desc: "An epic 4-day journey through Vietnam's most breathtaking mountain passes and ethnic cultures.", 
    alt: "Ha Giang",
    img: HaGiangImg 
  }
];

const DestinationList = () => (
  <div className={styles.destSection}>
    <Title level={2} className={styles.sectionTitle}>Popular destinations in Vietnam</Title>
    <Row gutter={[24, 24]}>
      {destinations.map((item, index) => (
        <Col xs={24} sm={12} md={8} key={index}>
          <Card
            hoverable
            className={styles.destCard}
            cover={
              <div className={styles.cardImagePlaceholder}>
                <img alt={item.alt} src={item.img} />
              </div>
            }
          >
            <Card.Meta title={item.title} description={item.desc} />
          </Card>
        </Col>
      ))}
    </Row>
  </div>
);

export default DestinationList;