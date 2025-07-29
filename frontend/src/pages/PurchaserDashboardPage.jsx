import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, message, Typography } from 'antd';
import { motion } from 'framer-motion';
import apiClient from '../api/client';

const { Title } = Typography;

const PurchaserDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports/purchaser/me')
      .then(response => {
        setStats(response.data);
      })
      .catch(() => message.error("Failed to load dashboard statistics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!stats) return <p>Could not load dashboard statistics.</p>;

  const animatedCard = (title, value, gradient) => (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card
        style={{
          borderRadius: '16px',
          background: gradient,
          color: '#fff',
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '1.5rem' }}
      >
        <Statistic
          title={<span style={{ color: '#fff', fontWeight: 500 }}>{title}</span>}
          value={value}
          valueStyle={{ color: '#fff', fontSize: '24px' }}
        />
      </Card>
    </motion.div>
  );

  return (
    <div style={{ padding: '2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title level={2} style={{
          textAlign: 'center',
          background: 'linear-gradient(to right, #6a11cb, #2575fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '2rem'
        }}>
          My Purchaser Dashboard
        </Title>
      </motion.div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          {animatedCard("Total Requests Assigned to Me", stats.requests_assigned, 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}
        </Col>
        <Col xs={24} sm={12} md={8}>
          {animatedCard("Orders Awaiting Tracking", stats.awaiting_tracking, 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)')}
        </Col>
        <Col xs={24} sm={12} md={8}>
          {animatedCard("Orders Marked as Purchased", stats.items_purchased, 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)')}
        </Col>
        <Col xs={24} sm={12} md={8}>
          {animatedCard("With Tracking Link", stats.with_tracking_link, 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)')}
        </Col>
        <Col xs={24} sm={12} md={8}>
          {animatedCard("Without Tracking Link", stats.without_tracking_link, 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)')}
        </Col>
        <Col xs={24} sm={12} md={8}>
          {animatedCard("Returned Orders", stats.items_returned, 'linear-gradient(135deg, #f54ea2 0%, #ff7676 100%)')}
        </Col>
      </Row>
    </div>
  );
};

export default PurchaserDashboardPage;
