import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  message,
  Tag,
  Select,
  Typography,
  Input,
  Tabs,
  DatePicker,
  Button,
  Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
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
  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Debounced product search
  const fetchProducts = useMemo(
    () =>
      debounce(async (query) => {
        if (!query || query.length < 2) return;
        setProductLoading(true);
        try {
          const { data } = await apiClient.get('/products/', { params: { q: query } });
          setProductOptions(
            data.map((p) => ({
              value: p.id,
              label: `${p.sku} - ${p.product_name}`,
            }))
          );
        } catch (err) {
          console.error('Failed to fetch products:', err);
          message.error('Failed to search products.');
        } finally {
          setProductLoading(false);
        }
      }, 300),
    []
  );

  // Read tab query param from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabFromUrl = queryParams.get('tab');
    if (tabFromUrl) setActiveTab(tabFromUrl);
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
    const matchesSearch = req.items?.some(
      item =>
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeTab === 'returned') {
      return matchesSearch && req.status === 'Returned';
    }
    return matchesSearch;
  });

const cancelAssignment = async (record) => {
  try {
    await apiClient.put(`/sourcing/${record.id}`, {
      ...record, // send existing fields if backend requires full payload
      status: 'Pending',
      assigned_at: null,
    });
    message.success('Assignment cancelled and moved back to Pending!');
    fetchAssigned();
  } catch (err) {
    console.error('Failed to cancel assignment:', err.response?.data || err.message);
    message.error('Failed to cancel assignment.');
  }
};




const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    sorter: (a, b) => a.id - b.id,
    fixed: 'left',
  },
  {
    title: 'Products',
    key: 'products',
    render: (_, record) => (
      <motion.div initial="hidden" animate="visible">
        {record.items?.map((item, idx) => (
          <motion.div
            key={item.id}
            custom={idx}
            variants={fadeIn}
            whileHover={{ scale: 1.015 }}
            style={{ padding: '4px 0', cursor: 'pointer', color: '#1677ff' }}
            onClick={() => navigate(`/requests/${record.id}`)}
          >
            {item.product_name}
          </motion.div>
        ))}
      </motion.div>
    ),
  },
  {
    title: 'Suppliers',
    dataIndex: 'seller_name',
    key: 'seller_name',
    render: s => s || 'N/A',
  },
  {
    title: 'Market',
    dataIndex: 'market',
    key: 'market',
    render: m => m || 'N/A',
  },
  {
    title: 'Total Target Cost',
    dataIndex: 'target_total',
    key: 'target_total',
    render: v => `$${v?.toFixed(2) ?? '0.00'}`,
  },
  {
    title: 'Total Actual Cost',
    dataIndex: 'sourced_price',
    key: 'sourced_price',
    render: v => `$${v?.toFixed(2) ?? '0.00'}`,
  },
  {
    title: 'Listing Link',
    key: 'listing_link',
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
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderBottom = '1px solid #5c33c8';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderBottom = '1px solid transparent';
        }}
      >
        View Listing
      </a>
    ),
  },
  {
    title: 'Created At',
    dataIndex: 'created_at',
    key: 'created_at',
    render: date => (
      <span style={{ color: '#595959' }}>
        {date ? new Date(date).toLocaleString() : '–'}
      </span>
    ),
  },
    {
      title: 'Assigned At',
      dataIndex: 'assigned_at',
      key: 'assigned_at',
      render: dt => (dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '–'),
    },
  {
    title: 'Savings',
    dataIndex: 'savings',
    key: 'savings',
    render: s => {
      const color = s >= 0 ? 'green' : 'red';
      return <span style={{ color, fontWeight: 600 }}>${s?.toFixed(2) ?? '0.00'}</span>;
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) =>
      record.status === 'Assigned' && (
        <Button
          type="text"
          danger
          onClick={() => cancelAssignment(record)}
        >
          ✕ Cancel
        </Button>
      ),
  },

  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: status => (
      <Tag
        color={
          status === 'Returned'
            ? 'red'
            : status === 'Purchased'
            ? 'green'
            : 'blue'
        }
        style={{ fontWeight: 500, fontSize: 13, borderRadius: 6 }}
      >
        {status}
      </Tag>
    ),
    
  },
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
        minHeight: '100vh',
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
          alignItems: 'center',
        }}
      >
        <Title
          level={4}
          style={{ margin: 0, color: '#2c2c2c', fontWeight: 600 }}
        >
          Total Orders: {filteredRequests.length}
        </Title>

        <Space>
          <Select
            placeholder="Status"
            style={{ width: 200, borderRadius: 6 }}
            onChange={value => setStatusFilter(value)}
            allowClear
            value={statusFilter || undefined}
          >
            {[
              'Assigned',
              'Offer',
              'Purchased',
              'Disapproved',
              'Sold',
              'Hold',
              'Seller Rejected',
              'Dropshipped',
              'Returned',
            ].map(status => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>

          <Search
            placeholder="Search SKU or Product"
            allowClear
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: 280, borderRadius: 6 }}
          />

          <DatePicker.RangePicker
            style={{ borderRadius: 6 }}
            onChange={dates => setDateRange(dates ?? [])}
            value={dateRange}
          />

          {/* Product search (for new sourcing) */}
          <Select
            showSearch
            placeholder="Search product to create sourcing"
            style={{ width: 280 }}
            filterOption={false}
            onSearch={fetchProducts}
            loading={productLoading}
            options={productOptions}
            onSelect={() => navigate('/sourcing/new')}
          />

          {/* ➕ New Sourcing Request Button */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/sourcing/new')}
          >
            New Sourcing
          </Button>
        </Space>
      </motion.div>

      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#ffffff',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}
      >
        <Table
          dataSource={filteredRequests}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          size="middle"
          pagination={{ pageSize: 8 }}
        />
      </motion.div>
    </motion.div>
  );
};

export default PurchaserPage;
