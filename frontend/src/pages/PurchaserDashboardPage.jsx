import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, message } from 'antd';
import apiClient from '../api/client';

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

  return (
    <div>
      <h2>My Dashboard</h2>
      <Row gutter={[24, 24]} style={{ marginTop: '1.5rem' }}>
        <Col xs={24} sm={12} md={8}>
          <Card><Statistic title="Total Requests Assigned to Me" value={stats.requests_assigned} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card><Statistic title="Orders Awaiting Tracking" value={stats.awaiting_tracking} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card><Statistic title="Orders Marked as Purchased" value={stats.items_purchased} /></Card>
        </Col>
      </Row>
    </div>
  );
};

export default PurchaserDashboardPage;