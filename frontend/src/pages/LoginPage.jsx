import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

const LoginPage = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);
    const params = new URLSearchParams();
    params.append('username', values.email);
    params.append('password', values.password);
    try {
      const response = await apiClient.post('/login/token', params);
      login(response.data.access_token);
    } catch (err) {
      setError('Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d1b2a, #000814)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          style={{
            width: 420,
            padding: '2rem',
            borderRadius: '1.25rem',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 215, 0, 0.4)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            color: '#fff',
          }}
          bordered={false}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <motion.img
              src="/logo.png"
              alt="Hector"
              style={{ width: 250, height: 'auto', marginBottom: '0rem' }}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            {/* <Title level={3} style={{ color: '#fff', marginBottom: 0 }}>
              Hector
            </Title> */}
          </div>

          <Form
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            requiredMark={false}
          >
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{
                  marginBottom: 20,
                  borderRadius: '0.5rem',
                }}
              />
            )}

            <Form.Item
              label={<span style={{ color: '#ddd' }}>Email</span>}
              name="email"
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input
                placeholder="you@company.com"
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#ddd' }}>Password</span>}
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                placeholder="••••••••"
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  background: 'linear-gradient(90deg, #ffd700, #ffa500)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
