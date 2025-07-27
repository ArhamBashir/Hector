import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ManagerDashboardPage from './ManagerDashboardPage';
import SourcerDashboardPage from './SourcerDashboardPage';
import PurchaserDashboardPage from './PurchaserDashboardPage'; // Import the new page

const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return <p>Loading...</p>;

  switch (user.role) {
    case 'manager':
      return <ManagerDashboardPage />;
    case 'sourcer':
      return <SourcerDashboardPage />;
    case 'purchaser':
      return <PurchaserDashboardPage />;
    default:
      return (
        <div>
          <h2>Dashboard</h2>
          <p>Welcome to SourceHub.</p>
        </div>
      );
  }
};

export default DashboardPage;