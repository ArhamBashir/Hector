import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, message, Space, Typography, Card } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Title } = Typography;

const PurchaserPendingPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(() => {
    setLoading(true);
    apiClient.get('/sourcing/pending')
      .then(response => setRequests(response.data))
      .catch(() => message.error('Failed to fetch pending requests.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAssign = async (sourcingId) => {
    try {
      await apiClient.post(`/sourcing/${sourcingId}/assign`);
      message.success('Request assigned successfully!');
      fetchPending();
    } catch (error) {
      message.error('Failed to assign request.');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
      width: 70,
      render: id => <strong style={{ color: '#2c2c2c' }}>#{id}</strong>
    },
    {
      title: 'Product(s)',
      key: 'products',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.items.map(item => (
            <span key={item.id} style={{ fontWeight: 500, color: '#3a3a3a' }}>
              {item.product_name}
            </span>
          ))}
        </Space>
      )
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <span style={{ color: '#777' }}>
          {new Date(date).toLocaleString()}
        </span>
      ),
      responsive: ['md']
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => handleAssign(record.id)}
          style={{
            background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(79, 172, 254, 0.3)'
          }}
        >
          Assign to Me
        </Button>
      ),
      width: 150
    }
  ];

  return (
    <div className="page-container" style={{ padding: '2rem', background: '#f5f9ff', minHeight: '100vh' }}>
      <div
        style={{
          background: 'linear-gradient(to right, #4facfe, #00f2fe)',
          padding: '1.5rem 2rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          color: '#fff',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)'
        }}
      >
        <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
          Pending Sourcing Requests
        </Title>
        <p style={{ marginTop: 6, fontSize: 15, opacity: 0.9 }}>
          Assign yourself to incoming sourcing tasks
        </p>
      </div>

      <Card
        style={{
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.06)'
        }}
        bodyStyle={{ padding: '2rem' }}
      >
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={{
            spinning: loading,
            indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />
          }}
          pagination={{ pageSize: 10 }}
          rowClassName={() => 'hoverable-row'}
        />
      </Card>

      {/* Add subtle row hover effect */}
      <style>{`
        .hoverable-row:hover {
          background-color: #f0f9ff !important;
          transition: background 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default PurchaserPendingPage;
