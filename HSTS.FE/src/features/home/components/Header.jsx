import React, { useState } from 'react';
import { Button, Space, Select, Typography, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { PATHS } from '@/routes/paths';
import WebLogo from '../assets/WebLogo.png';
import styles from '../styles/Header.module.css'; 

const { Text } = Typography;

const AppHeader = () => {
  const [open, setOpen] = useState(false);

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const menuItems = (
    <>
      <Select 
        defaultValue="Hanoi" 
        variant="borderless" 
        options={[{ value: 'Hanoi', label: 'Hanoi' }]} 
        className={styles.locationPicker} 
      />
      <Link to="/">
        <Text strong className={styles.navLink}>Home</Text>
      </Link>
      <Text className={styles.navLink}>Location</Text>
      <Link to={PATHS.AUTH.REGISTER}>
        <Button type="text" className={styles.navLink}>Sign Up</Button>
      </Link>
      <Link to={PATHS.AUTH.LOGIN}>
        <Button type="primary" className={styles.signInBtn}>Sign In</Button>
      </Link>
    </>
  );

  return (
    <header className={styles.headerContainer}>
      <Link to="/" className={styles.logo}>
        <img src={WebLogo} alt="Brand Logo" className={styles.logoImage} />
        <h1 className={styles.brandName}>Hangout</h1>
      </Link>

      <Space size="large" className={styles.navMenu}>
        {menuItems}
      </Space>

      <Button 
        type="text" 
        icon={<MenuOutlined style={{ fontSize: '24px' }} />} 
        onClick={showDrawer} 
        className={styles.mobileMenuBtn} 
      />

      <Drawer 
        title="Menu" 
        placement="right" 
        onClose={onClose} 
        open={open}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {menuItems}
        </Space>
      </Drawer>
    </header>
  );
};

export default AppHeader;