import { useState } from 'react';
import { Button, Card, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import EditProfileModal from './EditProfileModal';
import styles from '../styles/UserInfoCard.module.css';

const { Title } = Typography;

const GENDER_OPTIONS = [
  { value: 0, label: 'Male' },
  { value: 1, label: 'Female' },
  { value: 2, label: 'Other' },
];

const UserInfoCard = ({ user, loading, refetch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) return (
    <div className={`${styles.cardContainer} ${styles.skeletonLoading}`}>
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
  if (!user) return null;

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const renderGender = (val) => {
    const found = GENDER_OPTIONS.find(opt => opt.value === val);
    return found ? found.label : 'Not specified';
  };

  const renderDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return dayjs(dateString).format('MMMM DD, YYYY');
  };

  return (
    <div className={styles.cardContainer}>
      <Card>
        <div className={styles.headingWrapper}>
          <Title level={3} className={styles.heading}>Personal Information</Title>
          <Button 
            type="primary" 
            onClick={handleEditClick}
            className={styles.btnPrimary}
          >
            Edit Profile
          </Button>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItemFull}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user.email}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Full Name</span>
            <span className={user.fullName ? styles.infoValue : styles.emptyValue}>
              {user.fullName || 'Not specified'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Phone Number</span>
            <span className={user.phoneNumber ? styles.infoValue : styles.emptyValue}>
              {user.phoneNumber || 'Not specified'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Date of Birth</span>
            <span className={user.dateOfBirth ? styles.infoValue : styles.emptyValue}>
              {renderDate(user.dateOfBirth)}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Gender</span>
            <span className={user.gender !== null ? styles.infoValue : styles.emptyValue}>
              {renderGender(user.gender)}
            </span>
          </div>
          <div className={styles.infoItemFull}>
            <span className={styles.infoLabel}>Bio</span>
            <span className={user.bio ? styles.infoValue : styles.emptyValue}>
              {user.bio || 'Tell us about yourself...'}
            </span>
          </div>
        </div>
      </Card>

      <EditProfileModal 
        open={isModalOpen} 
        onClose={handleCloseModal} 
        user={user} 
        refetch={refetch} 
      />
    </div>
  );
};

export default UserInfoCard;