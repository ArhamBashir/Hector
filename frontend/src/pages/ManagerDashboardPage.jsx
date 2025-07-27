import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Table, Button, message, Typography } from 'antd';
import apiClient from '../api/client';

const { Title } = Typography;

const ManagerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports/dashboard')
      .then(response => {
        setStats(response.data);
      })
      .catch(err => {
        message.error("Failed to load dashboard statistics.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);
  
  const handleExport = async () => {
    try {
        const response = await apiClient.get('/reports/dashboard/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'sourcing_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        message.error('Failed to download report.');
    }
  };

  const sourcerColumns = [
    { title: 'Sourcer Email', dataIndex: 'sourcer_email', key: 'sourcer_email' },
    { title: 'Total Savings', dataIndex: 'total_savings', key: 'total_savings', render: (val) => `$${val.toFixed(2)}` }
  ];

  const marketColumns = [
    { title: 'Market', dataIndex: 'value', key: 'value' },
    { title: 'Total Savings', dataIndex: 'total_savings', key: 'total_savings', render: (val) => `$${val.toFixed(2)}` }
  ];

  if (loading) return <p>Loading dashboard...</p>;
  if (!stats) return <p>Could not load dashboard statistics.</p>;

  return (
    <div className="page-container">
      <div className="header-actions">
        <Title level={2}>Manager Dashboard</Title>
        <Button type="primary" onClick={handleExport}>Export to CSV</Button>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Total Company Savings" value={stats.total_company_savings} precision={2} prefix="$" /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Avg. Response Time" value={stats.avg_response_time_hours || 0} precision={2} suffix="hours" /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Active Sourcers" value={stats.sourcing_ids_per_sourcer.length} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card><Statistic title="Active Purchasers" value={stats.sourcing_ids_per_purchaser.length} /></Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '2rem' }}>
        <Col xs={24} md={12}>
          <Card title="Savings by Sourcer">
            <Table
              dataSource={stats.performance_by_sourcer}
              columns={sourcerColumns}
              rowKey="sourcer_email"
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Savings by Market">
            <Table
              dataSource={stats.efficiency_by_market}
              columns={marketColumns}
              rowKey="value"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ManagerDashboardPage;