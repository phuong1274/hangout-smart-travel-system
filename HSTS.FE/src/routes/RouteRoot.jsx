import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';

const RouteRoot = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
);

export default RouteRoot;
