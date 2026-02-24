import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={enUS} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
