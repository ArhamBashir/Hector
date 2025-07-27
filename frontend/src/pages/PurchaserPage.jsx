import React, { useState, useEffect, useCallback } from 'react';
import { Table, message, Tag, Select } from 'antd';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const PurchaserPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchAssigned = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) {
      params.status = statusFilter;
    }
    apiClient.get('/sourcing/assigned/me', { params })
      .then(response => setRequests(response.data))
      .catch(() => message.error('Failed to fetch assigned requests.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
    { title: 'Status', dataIndex: 'status', key: 'status', render: status => <Tag color="blue">{status}</Tag> },
    {
      title: 'Product(s)',
      key: 'products',
      render: (_, record) => (
        <div>
          {record.items.map(item => <div key={item.id}>{item.product_name}</div>)}
        </div>
      )
    },
    { title: 'Created At', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleString() },
  ];

  return (
    <div className="page-container">
      <div className="header-actions">
        <h2>My Assigned Requests</h2>
        <Select
            placeholder="Filter by status..."
            style={{ width: 200 }}
            onChange={(value) => setStatusFilter(value)}
            allowClear
        >
            {/* --- THIS LIST IS NOW COMPLETE --- */}
            <Option value="Assigned">Assigned</Option>
            <Option value="Offer">Offer</Option>
            <Option value="Purchased">Purchased</Option>
            <Option value="Disapproved">Disapproved</Option>
            <Option value="Sold">Sold</Option>
            <Option value="Hold">Hold</Option>
            <Option value="Seller Rejected">Seller Rejected</Option>
            <Option value="Dropshipped">Dropshipped</Option>
            <Option value="Returned">Returned</Option>
        </Select>
      </div>
      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={loading}
        onRow={(record) => ({
          onClick: () => navigate(`/requests/${record.id}`),
          style: { cursor: 'pointer' }
        })}
      />
    </div>
  );
};

export default PurchaserPage;