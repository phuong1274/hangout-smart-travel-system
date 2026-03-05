import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

const Error404 = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
      extra={
        <Button type="primary" onClick={() => navigate(PATHS.DASHBOARD)}>
          Back Home
        </Button>
      }
    />
  );
};

export default Error404;
