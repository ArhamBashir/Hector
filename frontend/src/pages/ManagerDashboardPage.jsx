import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Table, Button, message, Typography, Tooltip } from 'antd';
import { AreaChartOutlined, DollarCircleOutlined, FieldTimeOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import apiClient from '../api/client';

const { Title } = Typography;

const ManagerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports/dashboard')
      .then(response => setStats(response.data))
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
    { title: 'Total Savings', dataIndex: 'total_savings', key: 'total_savings', render: (val) => `$${val.toFixed(2)}` },
    { title: 'Avg. Turnaround Time', dataIndex: 'avg_processing_hours', key: 'avg_processing_hours', render: h => `${h.toFixed(2)} hrs` }
  ];

  const purchaserColumns = [
    { title: 'Purchaser Email', dataIndex: 'purchaser_email', key: 'purchaser_email' },
    { title: 'Orders Processed', dataIndex: 'orders_completed', key: 'orders_completed' },
    {
      title: 'Avg. Processing Time',
      dataIndex: 'avg_processing_time_hours',
      key: 'avg_processing_time_hours',
      render: t => `${t.toFixed(2)} hrs`
    }
  ];

  const marketColumns = [
    { title: 'Market', dataIndex: 'value', key: 'value' },
    { title: 'Total Savings', dataIndex: 'total_savings', key: 'total_savings', render: (val) => `$${val.toFixed(2)}` }
  ];

  const chartData = stats?.efficiency_by_purchaser?.map(p => ({
    name: p.purchaser_email,
    time: p.avg_processing_time_hours,
  })) || [];

  const sourcerChartData = stats?.performance_by_sourcer?.map(s => ({
    name: s.sourcer_email,
    savings: s.total_savings
  })) || [];

  if (loading) return <p>Loading dashboard...</p>;
  if (!stats) return <p>Could not load dashboard statistics.</p>;

  return (
    <div className="page-container" style={{ padding: '2rem', background: 'linear-gradient(to right, #ece9e6, #ffffff)' }}>
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Title level={2} style={{ background: 'linear-gradient(to right, #6a11cb, #2575fc)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Manager Dashboard</Title>
        <Button type="primary" onClick={handleExport}>Export to CSV</Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: 'linear-gradient(to right, #56ccf2, #2f80ed)', color: '#fff' }}>
            <Statistic title="Total Company Savings" value={stats.total_company_savings} precision={2} prefix={<DollarCircleOutlined />} valueStyle={{ color: '#fff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: 'linear-gradient(to right, #43cea2, #185a9d)', color: '#fff' }}>
            <Statistic
              title={<Tooltip title="Time between order creation and purchase/dropship"><span style={{ color: '#fff' }}>Avg. Response Time</span></Tooltip>}
              value={stats.avg_response_time_hours || 0}
              precision={2}
              suffix="hours"
              prefix={<FieldTimeOutlined />}
              valueStyle={{ color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: 'linear-gradient(to right, #ff9a9e, #fad0c4)', color: '#fff' }}>
            <Statistic title="Active Sourcers" value={stats.sourcing_ids_per_sourcer.length} prefix={<UsergroupAddOutlined />} valueStyle={{ color: '#fff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ background: 'linear-gradient(to right, #f6d365, #fda085)', color: '#fff' }}>
            <Statistic title="Active Purchasers" value={stats.sourcing_ids_per_purchaser.length} prefix={<UsergroupAddOutlined />} valueStyle={{ color: '#fff' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '2rem' }}>
        <Col xs={24} md={12}>
          <Card title="Savings by Sourcer" bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sourcerChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <RechartTooltip />
                <Area type="monotone" dataKey="savings" stroke="#34d399" fillOpacity={1} fill="url(#colorSavings)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Avg. Processing Time by Purchaser" bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <RechartTooltip />
                <Area type="monotone" dataKey="time" stroke="#8884d8" fillOpacity={1} fill="url(#colorTime)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '2rem' }}>
        <Col xs={24} md={12}>
          <Card title="Savings by Market" bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Table
              dataSource={stats.efficiency_by_market}
              columns={marketColumns}
              rowKey="value"
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Purchaser Efficiency Table" bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Table
              dataSource={stats.efficiency_by_purchaser}
              columns={purchaserColumns}
              rowKey="purchaser_email"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ManagerDashboardPage;
