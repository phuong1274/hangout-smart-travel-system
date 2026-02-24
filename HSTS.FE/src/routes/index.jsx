import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import LoginPage from '../features/auth/pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> }
    ]
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <div><h2>Overview</h2><p>Algorithm-based destination scheduling system.</p></div> },
      { path: 'schedules', element: <div><h2>Algorithm Scheduling Management</h2></div> }
    ]
  }
]);
