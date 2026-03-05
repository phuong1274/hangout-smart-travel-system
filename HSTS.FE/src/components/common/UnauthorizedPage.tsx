import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Result
      status="403"
      title="403"
      subTitle={t('error.unauthorized')}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {t('nav.backToHome')}
        </Button>
      }
    />
  );
};
