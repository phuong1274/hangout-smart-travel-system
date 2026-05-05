import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Select, Typography, Drawer, Avatar, Dropdown } from 'antd';
import { MenuOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { CURRENCY_OPTIONS } from '@/features/trip/constants/currency';
import { PATHS } from '@/routes/paths';
import WebLogo from '../assets/WebLogo.svg';
import styles from '../styles/Header.module.css';

const { Text } = Typography;

const AppHeader = ({
  destinations = [],
  homePath = PATHS.DASHBOARD,
  homeLabel = 'Dashboard',
  showDashboardLink = false,
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currencyCode, setCurrencyCode, loadRates } = useCurrencyStore();
  const { logout } = useLogout();

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const destinationOptions = destinations.map((destination) => ({
    value: String(destination.id || destination.destinationId || ''),
    label: destination.name || destination.title || 'Destination',
  })).filter((option) => option.value);

  const handleDestinationChange = (destinationId) => {
    navigate(`${PATHS.PUBLIC_LOCATIONS}?destinationId=${destinationId}`);
  };

  const currencyOptions = useMemo(() => CURRENCY_OPTIONS.map((option) => ({
    value: option.value,
    label: (
      <span className={styles.currencyOption}>
        <span>{option.flag}</span>
        <span>{option.label}</span>
      </span>
    ),
    shortLabel: `${option.flag} ${option.value}`,
  })), []);

  const handleCurrencyChange = (nextCurrencyCode) => {
    setCurrencyCode(nextCurrencyCode);
    loadRates();
  };

  const currencySelector = (
    <Select
      value={currencyCode}
      options={currencyOptions}
      optionLabelProp="shortLabel"
      variant="borderless"
      popupMatchSelectWidth={220}
      className={styles.currencyPicker}
      onChange={handleCurrencyChange}
      aria-label="Currency"
    />
  );

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

  const initials = user?.username?.charAt(0)?.toUpperCase();
  const menuItems = (
    <>
      {locationLink}
      <Link to={homePath}>
        <Text className={styles.navLink}>{homeLabel}</Text>
      </Link>
      {user && showDashboardLink ? (
        <Link to={PATHS.DASHBOARD}>
          <Text className={styles.navLink}>Dashboard</Text>
        </Link>
      ) : null}
      <Link to={PATHS.CREATE_TRIP}>
        <Text className={styles.navLink}>Plan a Trip</Text>
      </Link>

      {currencySelector}

      {user ? (
        <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" trigger={['click']}>
          <div className={styles.headerAvatarWrapper}>
            <Avatar
              size={40}
              src={user?.avatarUrl}
              className={styles.headerAvatar}
              icon={(!user?.avatarUrl && !initials) ? <UserOutlined /> : null}
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
