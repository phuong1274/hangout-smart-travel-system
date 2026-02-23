import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import SharedLayout from './components/Layout/SharedLayout';

function App() {
  return (
    <Routes>

      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<div>Login Page</div>} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<SharedLayout />}>
          <Route path="/home" element={<div>Home</div>} />
          <Route path="/traveler" element={<div>Traveler Area</div>} />
          <Route path="/partner" element={<div>Partner Area</div>} />
          <Route path="/moderator" element={<div>Moderator Area</div>} />
          <Route path="/admin" element={<div>Admin Area</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}

export default App;