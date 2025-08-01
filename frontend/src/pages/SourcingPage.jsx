import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Button,
  message,
  Spin,
  Input,
  Select,
  DatePicker,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const normalizeArray = data =>
  Array.isArray(data)
    ? data
    : data?.all_requests || data?.recent_requests || data?.results || data?.items || data?.data || [];

const dedupeById = arr => {
  const map = new Map();
  arr.forEach(item => item && map.set(item.id, item));
  return Array.from(map.values());
};

const statusColor = status => {
  switch (status) {
    case 'Pending':
      return 'gold';
    case 'Purchased':
      return 'green';
    case 'Dropshipped':
      return 'blue';
    default:
      return 'default';
  }
};

const SourcingOrdersPage = () => {
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingValues, setEditingValues] = useState({ product_name: '', sku: '' });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    product: '',
    sku: '',
    status: '',
    dateRange: null,
    sourcerId: '',
    sourcingId: '',
  });

  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: me } = await apiClient.get('/users/me');
      let list = [];

      if (me.role === 'sourcer') {
        const { data } = await apiClient.get('/reports/sourcer/me');
        list = normalizeArray(data);
      } else if (me.role === 'purchaser') {
        const [pending, assigned] = await Promise.all([
          apiClient.get('/sourcing/pending'),
          apiClient.get('/sourcing/assigned/me'),
        ]);
        list = dedupeById([
          ...normalizeArray(pending.data),
          ...normalizeArray(assigned.data),
        ]);
      } else {
        const { data } = await apiClient.get('/reports/dashboard');
        list = normalizeArray(data);
      }

      const detailed = await Promise.all(
        list.map(async order => {
          try {
            const { data } = await apiClient.get(`/sourcing/${order.id}`);
            return { ...order, ...data };
          } catch {
            return order;
          }
        })
      );

      setOrders(detailed);
    } catch (err) {
      console.error(err);
      message.error('Failed to load sourcing orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInlineEdit = async itemId => {
    try {
      const order = orders.find(o => (o.items || []).some(i => i.id === itemId));
      const item = (order.items || []).find(i => i.id === itemId);
      await apiClient.patch(`/sourcing/items/${item.id}`, {
        product_name: editingValues.product_name,
        sku: editingValues.sku,
        quantity_needed: item.quantity_needed,
      });
      message.success('Item updated');
      setEditingItemId(null);
      fetchOrders();
    } catch (err) {
      console.error(err);
      message.error('Save failed');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const items = order.items || [];
      const matchesProduct =
        !filters.product ||
        items.some(i =>
          i.product_name?.toLowerCase().includes(filters.product.toLowerCase())
        );
      const matchesSku =
        !filters.sku ||
        items.some(i => i.sku?.toLowerCase().includes(filters.sku.toLowerCase()));
      const matchesStatus = !filters.status || order.status === filters.status;
      const created = order.created_at || order.created_on;
      const matchesDate =
        !filters.dateRange ||
        (created &&
          dayjs(created).isAfter(filters.dateRange[0].startOf('day')) &&
          dayjs(created).isBefore(filters.dateRange[1].endOf('day')));
      const matchesSourcerId =
        !filters.sourcerId || order.sourcer_id?.toString().includes(filters.sourcerId);
      const matchesSourcingId =
        !filters.sourcingId || order.id?.toString().includes(filters.sourcingId);

      return (
        matchesProduct &&
        matchesSku &&
        matchesStatus &&
        matchesDate &&
        matchesSourcerId &&
        matchesSourcingId
      );
    });
  }, [orders, filters]);

  const columns = [
    {
      title: 'Sourcing ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
      fixed: 'left',
    },
    {
      title: 'Products',
      key: 'products',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {(record.items || []).map(item => {
            const isEditing = editingItemId === item.id;
            return (
              <div key={item.id} style={{ lineHeight: 1.4 }}>
                {isEditing ? (
                  <>
                    <Input
                      size="small"
                      value={editingValues.product_name}
                      onChange={e =>
                        setEditingValues(v => ({
                          ...v,
                          product_name: e.target.value,
                        }))
                      }
                      style={{ marginBottom: 4 }}
                    />
                    <Input
                      size="small"
                      value={editingValues.sku}
                      onChange={e =>
                        setEditingValues(v => ({ ...v, sku: e.target.value }))
                      }
                      style={{ marginBottom: 4 }}
                    />
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => saveInlineEdit(item.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="small"
                      style={{ marginLeft: 4 }}
                      onClick={() => setEditingItemId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <strong>{item.product_name}</strong>
                    <div style={{ fontSize: 12, color: '#888' }}>{item.sku}</div>
                    <div style={{ fontSize: 12 }}>
                      Qty:{' '}
                      <span style={{ fontWeight: 500 }}>
                        {item.quantity_needed ?? 1}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </Space>
      ),
    },
    {
      title: 'Supplier',
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
      render: v => `$${v?.toFixed(2) || '0.00'}`,
    },
    {
      title: 'Total Actual Cost',
      key: 'actual_cost',
      render: (_, record) => {
        const actual =
          (record.sellers_price || 0) +
          (record.shipping_price || 0) +
          (record.tax || 0);
        return `$${actual.toFixed(2)}`;
      },
    },
    {
      title: 'Listing Link',
      dataIndex: 'listing_link',
      key: 'listing_link',
      render: link =>
        link ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            View Listing
          </a>
        ) : (
          <Text type="secondary">–</Text>
        ),
    },
    {
      title: 'Date Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (_, rec) => {
        const dt = rec.created_at || rec.created_on;
        return dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '–';
      },
    },
    {
      title: 'Assigned At',
      dataIndex: 'assigned_at',
      key: 'assigned_at',
      render: dt => (dt ? dayjs(dt).format('YYYY-MM-DD HH:mm') : '–'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: s => <Tag color={statusColor(s)}>{s}</Tag>,
    },
    {
      title: 'Savings',
      key: 'savings',
      render: (_, record) => {
        const actual =
          (record.sellers_price || 0) +
          (record.shipping_price || 0) +
          (record.tax || 0);
        const savings = (record.target_total || 0) - actual;
        return (
          <Tag color={savings >= 0 ? 'green' : 'red'}>
            {savings < 0
              ? <>-&#36;{Math.abs(savings).toFixed(2)}</>
              : <>${savings.toFixed(2)}</>}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/sourcing/${record.id}/edit`)}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spin />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        title="All Sourcing Orders"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/sourcing/new')}
            >
              New Sourcing
            </Button>
          </Space>
        }
        style={{
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #F9F9FB, #E0ECF8)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="Filter by Product Name"
            allowClear
            style={{ width: 200 }}
            onChange={e => setFilters(f => ({ ...f, product: e.target.value }))}
          />
          <Input
            placeholder="Filter by SKU"
            allowClear
            style={{ width: 160 }}
            onChange={e => setFilters(f => ({ ...f, sku: e.target.value }))}
          />
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ width: 160 }}
            onChange={val => setFilters(f => ({ ...f, status: val }))}
          >
            <Option value="Pending">Pending</Option>
            <Option value="Purchased">Purchased</Option>
            <Option value="Dropshipped">Dropshipped</Option>
          </Select>
          <RangePicker
            onChange={range => setFilters(f => ({ ...f, dateRange: range }))}
          />
          <Input
            placeholder="Filter by Sourcing ID"
            allowClear
            style={{ width: 160 }}
            onChange={e =>
              setFilters(f => ({ ...f, sourcingId: e.target.value }))
            }
          />
          <Input
            placeholder="Filter by Sourcer ID"
            allowClear
            style={{ width: 160 }}
            onChange={e =>
              setFilters(f => ({ ...f, sourcerId: e.target.value }))
            }
          />
        </Space>
        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          pagination={{ defaultPageSize: 20, showSizeChanger: true }}
          bordered
          size="middle"
        />
      </Card>
    </motion.div>
  );
};

export default SourcingOrdersPage;
