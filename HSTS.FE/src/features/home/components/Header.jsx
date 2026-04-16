import React, { useState } from 'react';
import { Button, Space, Select, Typography, Drawer, Avatar, Dropdown } from 'antd';
import { MenuOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { PATHS } from '@/routes/paths';
import WebLogo from '../assets/WebLogo.svg';
import styles from '../styles/Header.module.css'; 

const { Text } = Typography;

const AppHeader = ({ destinations = [] }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { logout } = useLogout();

  const destinationOptions = destinations.map((destination) => ({
    value: String(destination.id || destination.destinationId || ''),
    label: destination.name || destination.title || 'Destination',
  })).filter((option) => option.value);

  const handleDestinationChange = (destinationId) => {
    navigate(`${PATHS.PUBLIC_LOCATIONS}?destinationId=${destinationId}`);
  };

  const destinationMenu = destinationOptions.length ? (
    <Select
      placeholder="Destination"
      variant="borderless"
      options={destinationOptions}
      className={styles.locationPicker}
      onChange={handleDestinationChange}
    />
  ) : (
    <Text className={styles.navLink}>Location</Text>
  );

  const locationLink = destinationOptions.length ? (
    destinationMenu
  ) : (
    <Link to={PATHS.PUBLIC_LOCATIONS}>
      <Text className={styles.navLink}>Location</Text>
    </Link>
  );

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const userDropdownItems = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <UserOutlined />,
      onClick: () => navigate(PATHS.PROFILE),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: logout,
    },
  ];

  const initials = user?.username?.charAt(0)?.toUpperCase() ?? '?';

  const menuItems = (
    <>
      {locationLink}
      <Link to="/">
        <Text className={styles.navLink}>Home</Text>
      </Link>
      <Link to={PATHS.CREATE_TRIP}>
        <Text className={styles.navLink}>Plan a Trip</Text>
      </Link>
      
      {user ? (
        <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" trigger={['click']}>
          <div className={styles.headerAvatarWrapper}>
            <Avatar 
              size={40} 
              src={user?.avatarUrl}
              className={styles.headerAvatar}
            >
              {!user?.avatarUrl && initials}
            </Avatar>
            <span className={styles.headerUsername}>{user.username}</span>
          </div>
        </Dropdown>
      ) : (
        <Space size="middle" className={styles.authButtons}>
          <Link to={PATHS.AUTH.REGISTER}>
            <Button type="text" className={styles.signUpBtn}>Sign Up</Button>
          </Link>
          <Link to={PATHS.AUTH.LOGIN}>
            <Button type="primary" className={styles.signInBtn}>Sign In</Button>
          </Link>
        </Space>
      )}
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
        icon={<MenuOutlined style={{ fontSize: '24px', color: '#1A535C' }} />} 
        onClick={showDrawer} 
        className={styles.mobileMenuBtn} 
      />

      <Drawer 
        title={<span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#1A535C' }}>Menu</span>} 
        placement="right" 
        onClose={onClose} 
        open={open}
        className={styles.mobileDrawer}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {menuItems}
        </Space>
      </Drawer>
    </header>
  );
};

export default AppHeader;