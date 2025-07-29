// MainLayout.jsx
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

const navLinks = [
  { to: '/', label: 'Dashboard', roles: ['sourcer', 'purchaser', 'admin'] },
  { to: '/sourcing/orders', label: 'Sourcing Orders', roles: ['sourcer'] },
  // { to: '/sourcing/new', label: 'New Sourcing', roles: ['sourcer'] }, // removed
  { to: '/requests/pending', label: 'Pending', roles: ['purchaser'] },
  { to: '/requests/my', label: 'Assigned to Me', roles: ['purchaser'] },
  { to: '/admin/users', label: 'Users', roles: ['admin'] },
  { to: '/admin/products', label: 'Products', roles: ['admin'] },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (to) => {
    if (location.pathname === to) {
      navigate('/reload', { replace: true });
      setTimeout(() => navigate(to), 0);
    } else {
      navigate(to);
    }
  };

  const displayName = user
    ? ([user.first_name, user.last_name].filter(Boolean).join(' ')
        || user.name
        || user.email?.split('@')[0])
    : 'Guest';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', backgroundColor: '#f4f6fa' }}>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(90deg, #1e3a8a, #2563eb)',
          padding: '1.5rem 2.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#fff',
          borderBottomLeftRadius: '1.5rem',
          borderBottomRightRadius: '1.5rem',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}
      >
<motion.div
  whileHover={{ scale: 1.05, rotate: 1 }}
  transition={{ type: 'spring', stiffness: 200 }}
  onClick={() => handleNavClick('/')}
  style={{
    position: 'relative',
    cursor: 'pointer'
  }}
>
  <img
    src="/logo.png"
    alt="Logo"
    style={{
      width: 180,
      height: 120,
      objectFit: 'contain',
      position: 'absolute',
      top: '-60px',  // Move above header
      left: '0',     // Stick to left edge
      zIndex: 10
    }}
  />
</motion.div>



        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          {navLinks
            .filter(link => user && link.roles.includes(user.role))
            .map(link => {
              const isActive = location.pathname === link.to;
              return (
                <motion.div
                  key={link.to}
                  whileHover={{ scale: 1.07 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  onClick={() => handleNavClick(link.to)}
                  style={{
                    cursor: 'pointer',
                    paddingBottom: '5px',
                    fontWeight: isActive ? 700 : 500,
                    borderBottom: isActive ? '3px solid white' : '3px solid transparent',
                    transition: 'all 0.3s ease',
                    fontSize: '1rem'
                  }}
                >
                  {link.label}
                </motion.div>
              );
            })}
        </nav>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <span style={{ fontSize: '0.95rem' }}>
            Welcome, <strong>{displayName}</strong>
          </span>
          {user && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={logout}
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.2rem',
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                transition: 'background 0.3s ease'
              }}
            >
              Logout
            </motion.button>
          )}
        </motion.div>
      </motion.header>

      <main style={{ padding: '2rem 2.5rem', transition: 'all 0.3s ease-in-out' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
