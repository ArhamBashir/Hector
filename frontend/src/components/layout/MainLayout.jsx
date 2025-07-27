// src/layouts/MainLayout.jsx
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navLinks = [
  { to: '/', label: 'Dashboard', roles: ['sourcer', 'purchaser', 'admin'] },
  { to: '/sourcing/new', label: 'New Sourcing', roles: ['sourcer'] },
  { to: '/requests/pending', label: 'Pending', roles: ['purchaser'] },
  { to: '/requests/my', label: 'Assigned to Me', roles: ['purchaser'] },
  { to: '/admin/users', label: 'Users', roles: ['admin'] },
  { to: '/admin/products', label: 'Products', roles: ['admin'] },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-layout-topbar">
      <header className="topbar" role="banner">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" className="topbar-logo" aria-label="RetroVentures Home">
            <span role="img" aria-label="rocket" style={{ marginRight: 8 }}>🚀</span>
            RetroVentures
          </Link>
          <nav className="topbar-nav" aria-label="Main navigation">
            {navLinks
              .filter(link => user && link.roles.includes(user.role))
              .map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={location.pathname === link.to ? 'active' : ''}
                  style={{
                    borderBottom: location.pathname === link.to ? '3px solid #fff' : undefined,
                  }}
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>
            Welcome, <strong>{user?.email ?? 'Guest'}</strong>
          </span>
          {user && (
            <button onClick={logout} className="logout-button" aria-label="Logout">
              Logout
            </button>
          )}
        </div>
      </header>
      <main className="content-area" role="main">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
