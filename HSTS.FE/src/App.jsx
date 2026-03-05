import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Spin } from 'antd';
import { router } from '@/routes';
import { queryClient } from '@/lib/react-query';
import { useAuthStore } from '@/store/authStore';
import { getProfileApi } from '@/features/auth/api';
import ErrorBoundary from '@/components/Errors/ErrorBoundary';

function App() {
  const { token, setAuth, logout } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(!!token);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await getProfileApi();
          setAuth(userData, token);
        } catch (error) {
          if (error.response?.status === 401) {
            logout();
          }
        } finally {
          setIsInitializing(false);
        }
      } else {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [token, setAuth, logout]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Initializing Application..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
export default App;
