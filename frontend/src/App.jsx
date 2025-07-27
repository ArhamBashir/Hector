import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import PurchaserPendingPage from './pages/PurchaserPendingPage';


// Layouts and Pages
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SourcerPage from './pages/SourcerPage';
import PurchaserPage from './pages/PurchaserPage';
import RequestDetailPage from './pages/RequestDetailPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminProductsPage from './pages/AdminProductsPage';

// Common Components and Styles
import ProtectedRoute from './components/common/ProtectedRoute';
import './styles/main.css';

function App() {
  const { token } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Child routes of MainLayout */}
          <Route index element={<DashboardPage />} />
          <Route path="sourcing/new" element={<SourcerPage />} />
          <Route path="requests/pending" element={<PurchaserPendingPage />} />
          <Route path="requests/my" element={<PurchaserPage />} />
          <Route path="requests/:sourcingId" element={<RequestDetailPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/products" element={<AdminProductsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;