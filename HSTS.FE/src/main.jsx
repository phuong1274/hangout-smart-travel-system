import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_OAUTH_CLIENT_ID } from '@/config/constants';
import App from '@/App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
      <ConfigProvider locale={enUS} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
        <App />
      </ConfigProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
