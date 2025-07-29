import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  message,
  Tag,
  Select,
  Typography,
  Input,
  Tabs,
  DatePicker
} from 'antd';
import apiClient from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: custom => ({
    opacity: 1,
    y: 0,
    transition: { delay: custom * 0.1, duration: 0.4, ease: 'easeOut' }
  })
};

const PurchaserPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Read tab query param from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabFromUrl = queryParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  const fetchAssigned = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (activeTab === 'returned') params.status = 'Returned';
    if (dateRange.length === 2) {
      params.start_date = dateRange[0].toISOString();
      params.end_date = dateRange[1].toISOString();
    }

    apiClient
      .get('/sourcing/assigned/me', { params })
      .then(response => setRequests(response.data))
      .catch(err => {
        console.error('Failed to fetch assigned requests:', err.response?.data || err.message);
        message.error('Failed to fetch assigned requests.');
      })
      .finally(() => setLoading(false));
  }, [statusFilter, activeTab, dateRange]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

const filteredRequests = requests.filter(req => {
  const matchesSearch = req.items.some(item =>
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (activeTab === 'returned') {
    // Check order-level status instead of item-level
    return matchesSearch && req.status === 'Returned';
  }

  return matchesSearch;
});

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
      fixed: 'left'
    },
    {
      title: 'Product(s)',
      key: 'products',
      render: (_, record) => (
        <motion.div initial="hidden" animate="visible">
          {record.items.map((item, idx) => (
            <motion.div
              key={item.id}
              custom={idx}
              variants={fadeIn}
              whileHover={{ scale: 1.015 }}
              style={{ padding: '4px 0' }}
            >
              <span style={{ fontWeight: 500 }}>{item.product_name}</span>
            </motion.div>
          ))}
        </motion.div>
      )
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <span style={{ color: '#595959' }}>
          {new Date(date).toLocaleString()}
        </span>
      )
    },
    {
      title: 'eBay Link',
      key: 'ebay',
      render: (_, record) => (
        <a
          href={record.listing_link || '#'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            color: '#5c33c8',
            fontWeight: 600,
            textDecoration: 'none',
            borderBottom: '1px solid transparent',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderBottom = '1px solid #5c33c8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderBottom = '1px solid transparent'; }}
        >
          View on Listings
        </a>
      )
    },
    {
      title: 'Efficiency',
      key: 'efficiency',
      render: (_, record) => {
        const efficiency = record.sourcer_efficiency;
        const color = efficiency >= 0 ? 'green' : 'red';
        return (
          <span style={{ color, fontWeight: 600 }}>
            ${efficiency?.toFixed(2) || '0.00'}
          </span>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color="geekblue" style={{ fontWeight: 500, fontSize: 13, borderRadius: 6 }}>
          {status}
        </Tag>
      )
    }
  ];

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        padding: '2rem',
        background: '#f9fafc',
        minHeight: '100vh'
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: '24px', fontWeight: 500 }}
        tabBarStyle={{ fontSize: 16 }}
      >
        <TabPane tab="All Assigned" key="all" />
        <TabPane tab="Returned" key="returned" />
      </Tabs>

      <motion.div
        className="dashboard"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Title level={4} style={{ margin: 0, color: '#2c2c2c', fontWeight: 600 }}>
          Total Orders: {filteredRequests.length}
        </Title>

        <Select
          placeholder="Status"
          style={{ width: 200, borderRadius: 6 }}
          onChange={value => setStatusFilter(value)}
          allowClear
          value={statusFilter || undefined}
        >
          {['Assigned', 'Offer', 'Purchased', 'Disapproved', 'Sold', 'Hold', 'Seller Rejected', 'Dropshipped', 'Returned'].map(status => (
            <Option key={status} value={status}>{status}</Option>
          ))}
        </Select>

        <Search
          placeholder="Search SKU or Product"
          allowClear
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 280, borderRadius: 6 }}
        />

        <DatePicker.RangePicker
          style={{ borderRadius: 6 }}
          onChange={(dates) => setDateRange(dates ?? [])}
          value={dateRange}
        />
      </motion.div>

      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#ffffff',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
        }}
      >
        <Table
          dataSource={filteredRequests}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          size="middle"
          onRow={(record) => ({
            onClick: () => navigate(`/requests/${record.id}`),
            style: { cursor: 'pointer', transition: 'background 0.3s' }
          })}
          pagination={{ pageSize: 8 }}
        />
      </motion.div>
    </motion.div>
  );
};

export default PurchaserPage;
