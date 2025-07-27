import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Table, message, Tag, Space, Typography } from 'antd';
import apiClient from '../api/client';

const { Text } = Typography;

const SourcerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports/sourcer/me')
      .then(response => {
        setStats(response.data);
      })
      .catch(() => message.error("Failed to load dashboard statistics."))
      .finally(() => setLoading(false));
  }, []);

  const recentRequestsColumns = [
      { title: 'ID', dataIndex: 'id', key: 'id' },
      { title: 'Status', dataIndex: 'status', key: 'status', render: status => <Tag color={status === 'Pending' ? 'gold' : 'blue'}>{status}</Tag> },
      { 
        title: 'Product(s)', 
        dataIndex: 'items', 
        key: 'items',
        render: items => (
            <Space direction="vertical" size="small">
                {items.map(item => <span key={item.product_name}>{item.product_name}</span>)}
            </Space>
        )
      },
      { 
        title: 'Savings', 
        dataIndex: 'savings', 
        key: 'savings',
        render: savings => (
            savings !== null 
                ? <Tag color={savings >= 0 ? 'green' : 'red'}>${savings.toFixed(2)}</Tag> 
                : <Text type="secondary">N/A</Text>
        )
      },
      { title: 'Date Submitted', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleString() },
  ];

  if (loading) return <p>Loading dashboard...</p>;
  if (!stats) return <p>Could not load dashboard statistics.</p>;

  return (
    <div>
      <h2>My Dashboard</h2>
      <Row gutter={[24, 24]} style={{ marginTop: '1.5rem' }}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Requests Submitted" value={stats.total_requests_created} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="My Total Savings Generated" value={stats.total_savings} precision={2} prefix="$" /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Requests Pending" value={stats.requests_pending} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Requests Purchased" value={stats.requests_purchased} /></Card>
        </Col>
      </Row>
      <Card title="My 5 Most Recent Requests" style={{ marginTop: '2rem' }}>
        <Table
            dataSource={stats.recent_requests}
            columns={recentRequestsColumns}
            rowKey="id"
            pagination={false}
        />
      </Card>
    </div>
  );
};

export default SourcerDashboardPage;