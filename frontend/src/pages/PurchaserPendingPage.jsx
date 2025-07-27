import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, message, Space } from 'antd';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

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
    { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
    {
      title: 'Product(s)',
      key: 'products',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.items.map(item => <span key={item.id}>{item.product_name}</span>)}
        </Space>
      )
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="primary" onClick={() => handleAssign(record.id)}>Assign to Me</Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="header-actions">
        <h2>Pending Sourcing Requests</h2>
      </div>
      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={loading}
      />
    </div>
  );
};

export default PurchaserPendingPage;