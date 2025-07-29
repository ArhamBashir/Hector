// src/pages/SourcerDashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Col, Row, Statistic, Table, message, Tag, Space,
  Typography, Tabs, Spin
} from 'antd';
import { motion } from 'framer-motion';
import { LoadingOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

const gradientCardStyle = {
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #F9F9FB, #E0ECF8)',
  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
  transition: 'transform 0.2s ease-in-out',
};
const cardHoverEffect = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } };

const num = v => (typeof v === 'number' ? v : Number(v) || 0);
const formatDT = dt => (dt ? new Date(dt).toLocaleString() : 'N/A');

const calcActualTotal = r => num(r.sellers_price) + num(r.shipping_price) + num(r.tax);
const calcBaselineFromItems = (items = []) =>
  items.reduce((sum, it) => sum + num(it.sourced_price) * num(it.quantity_needed || 1), 0);

const SourcerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, statsRes] = await Promise.all([
          apiClient.get('/users/me'),
          apiClient.get('/reports/sourcer/me'),
        ]);
        setUser(userRes.data);
        setStats(statsRes.data);
      } catch (e) {
        console.error(e);
        message.error('Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const recentRequests = useMemo(() => {
    const list = stats?.recent_requests || [];
    return list.map(r => {
      // Prefer backend if provided & > 0
      const backendTarget = num(r.target_total);
      const baseline = backendTarget > 0 ? backendTarget : calcBaselineFromItems(r.items);
      const backendSavings = r.savings !== undefined ? num(r.savings) : null;

      const actual = calcActualTotal(r);
      const savingsDollar = backendSavings !== null ? backendSavings : (baseline - actual);
      const effPct = baseline > 0 ? (savingsDollar / baseline) * 100 : 0;

      return {
        ...r,
        target_total: baseline,
        savings_dollar: savingsDollar,
        efficiency_pct: effPct
      };
    });
  }, [stats]);

  const totalBaseline = useMemo(() => {
    const all = stats?.all_requests || stats?.recent_requests || [];
    return all.reduce((sum, r) => {
      const backend = num(r.target_total);
      return sum + (backend > 0 ? backend : calcBaselineFromItems(r.items));
    }, 0);
  }, [stats]);

  const overallEffPct = useMemo(() => {
    const backendTotalSavings = num(stats?.total_savings);
    if (backendTotalSavings && totalBaseline > 0) {
      return (backendTotalSavings / totalBaseline) * 100;
    }
    // recompute
    const all = stats?.all_requests || stats?.recent_requests || [];
    let sav = 0;
    all.forEach(r => {
      const baseline = (num(r.target_total) > 0 ? num(r.target_total) : calcBaselineFromItems(r.items));
      sav += (baseline - calcActualTotal(r));
    });
    return totalBaseline > 0 ? (sav / totalBaseline) * 100 : 0;
  }, [stats, totalBaseline]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => (
        <Tag color={
          s === 'Pending' ? 'gold'
            : s === 'Purchased' ? 'green'
            : s === 'Dropshipped' ? 'blue'
            : 'default'
        }>
          {s}
        </Tag>
      )
    },
    {
      title: 'Product(s)',
      dataIndex: 'items',
      key: 'items',
      render: items => (
        <Space direction="vertical" size="small">
          {(items || []).map((item, i) => (
            <Text key={i}>{item.product_name || item.name || 'Unnamed Product'}</Text>
          ))}
        </Space>
      )
    },
    {
      title: 'Baseline $',
      dataIndex: 'target_total',
      key: 'target_total',
      render: v => <Tag color="purple">${num(v).toFixed(2)}</Tag>
    },
    {
      title: 'Efficiency $',
      dataIndex: 'savings_dollar',
      key: 'savings_dollar',
      render: v => <Tag color={num(v) >= 0 ? 'green' : 'red'}>${num(v).toFixed(2)}</Tag>
    },
    {
      title: 'Efficiency %',
      dataIndex: 'efficiency_pct',
      key: 'efficiency_pct',
      render: v => <Tag color={num(v) >= 0 ? 'geekblue' : 'volcano'}>{num(v).toFixed(1)}%</Tag>
    },
    { title: 'Created On', dataIndex: 'created_at', key: 'created_at', render: formatDT },
    { title: 'Finalized At', dataIndex: 'finalized_at', key: 'finalized_at', render: formatDT }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} tip="Loading your dashboard..." />
      </div>
    );
  }

  if (!stats) return <p style={{ padding: '2rem' }}>Could not load dashboard statistics.</p>;

  return (
    <div style={{ padding: '2rem', background: 'linear-gradient(to right, #f0f2f5, #d9eaf7)', minHeight: '100vh' }}>
      {user && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Title level={3} style={{ marginBottom: 0 }}>Welcome back, {user.full_name}</Title>
          <Text type="secondary">{user.email}</Text>
        </motion.div>
      )}

      <Tabs defaultActiveKey="1" type="card" style={{ marginTop: '2rem' }}>
        <TabPane tab="Dashboard Overview" key="1">
          <div
            style={{
              background: 'linear-gradient(120deg, #e0f7fa, #ffffff)',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease-in-out'
            }}
          >
            <Row gutter={[24, 24]}>
              {[
                { title: 'Total Requests Submitted', value: stats.total_requests_created || 0 },
                { title: 'My Total Savings Generated', value: stats.total_savings || 0, prefix: '$', precision: 2 },
                { title: 'Total Baseline', value: totalBaseline || 0, prefix: '$', precision: 2 },
                { title: 'Overall Efficiency %', value: overallEffPct || 0, precision: 1, suffix: '%' },
                { title: 'Requests Pending', value: stats.requests_pending || 0 },
                { title: 'Requests Purchased', value: stats.requests_purchased || 0 },
              ].map((stat, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={index}>
                  <motion.div {...cardHoverEffect}>
                    <Card style={gradientCardStyle}>
                      <Statistic
                        title={stat.title}
                        value={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                        precision={stat.precision}
                        valueStyle={{ fontWeight: 600 }}
                      />
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card
                title="My 5 Most Recent Requests"
                style={{
                  marginTop: '2rem',
                  ...gradientCardStyle,
                  background: 'linear-gradient(135deg, #fafbfd, #e3f2fd)'
                }}
              >
                <Table
                  dataSource={recentRequests}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </motion.div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SourcerDashboardPage;
