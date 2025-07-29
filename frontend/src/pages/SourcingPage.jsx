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
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const gradientCardStyle = {
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #F9F9FB, #E0ECF8)',
  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
};

const num = v => (typeof v === 'number' ? v : Number(v) || 0);

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);

  const [filters, setFilters] = useState({
    product: '',
    sku: '',
    status: '',
    dateRange: null,
    sourcerId: '',
    sourcingId: '',
  });

  const [searchOptions, setSearchOptions] = useState([]);
  const debouncedSearch = useMemo(
    () =>
      debounce(async q => {
        if (!q || q.length < 2) return;
        try {
          const { data } = await apiClient.get('/products/', { params: { q } });
          setSearchOptions(
            data.map(p => ({
              value: p.id.toString(),
              label: `${p.sku} - ${p.product_name}`,
              product: p,
            }))
          );
        } catch (err) {
          console.error(err);
        }
      }, 300),
    []
  );

  const [form] = Form.useForm();
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

      setOrders(list);
    } catch (err) {
      console.error(err);
      message.error('Failed to load sourcing orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const items = order.items || order.sourcing_items || [];
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
        !filters.sourcerId || order.created_by?.id === filters.sourcerId;
      const matchesSourcingId =
        !filters.sourcingId ||
        order.id?.toString().includes(filters.sourcingId);

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

  const loadItemForEdit = async (orderId, itemId) => {
    setDrawerLoading(true);
    try {
      const { data: order } = await apiClient.get(`/sourcing/${orderId}`);
      const fullItem = (order.items || order.sourcing_items || []).find(
        i => i.id === itemId
      );
      if (!fullItem) throw new Error('Product not found.');

      setEditingItem(fullItem);
      setIsNewItem(false);
      setEditingOrderId(orderId);
      setDrawerOpen(true);

      form.setFieldsValue({
        ...fullItem,
        sourced_price: num(fullItem.sourced_price),
        target_cost_per_unit: num(fullItem.target_cost_per_unit),
      });
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Could not load item.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const openNewItem = orderId => {
    setIsNewItem(true);
    setEditingOrderId(orderId);
    setEditingItem(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const handleProductSelect = (_val, option) => {
    const p = option.product;
    form.setFieldsValue({
      product_name: p.product_name,
      sku: p.sku,
      product_type: p.product_type,
      category: p.category,
      target_cost_per_unit: num(p.target_cost_per_unit),
    });
  };

  const saveItem = async () => {
    try {
      const values = await form.validateFields();
      if (isNewItem) {
        await apiClient.post(
          `/sourcing/${editingOrderId}/items`,
          values
        );
        message.success('Item created');
      } else {
        await apiClient.patch(
          `/sourcing/items/${editingItem.id}`,
          values
        );
        message.success('Item updated');
      }
      setDrawerOpen(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.detail || 'Save failed');
    }
  };

  const itemTable = order => {
    const data = order.items || order.sourcing_items || [];
    return (
      <>
        <div style={{ textAlign: 'right', marginBottom: 8 }}>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => openNewItem(order.id)}
          >
            Add Product
          </Button>
        </div>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={data}
          columns={[
            {
              title: 'Product',
              dataIndex: 'product_name',
              render: (text, rec) => (
                <Button
                  type="link"
                  onClick={() => loadItemForEdit(order.id, rec.id)}
                >
                  {text}
                </Button>
              ),
            },
            { title: 'SKU', dataIndex: 'sku', render: v => <Text type="secondary">{v}</Text> },
            { title: 'Qty', dataIndex: 'quantity_needed', width: 70 },
            {
              title: 'Seller $',
              dataIndex: 'sourced_price',
              width: 100,
              render: v => `$${num(v).toFixed(2)}`,
            },
          ]}
        />
      </>
    );
  };

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: s => <Tag color={statusColor(s)}>{s}</Tag>,
      },
      {
        title: 'Product(s)',
        dataIndex: 'items',
        key: 'items',
        render: (items, rec) => (
          <Space direction="vertical" size="small">
            {(items || rec.sourcing_items || []).map((i, idx) => (
              <Button
                key={idx}
                type="link"
                onClick={() => loadItemForEdit(rec.id, i.id)}
              >
                {i.product_name || i.name || 'Unnamed'}
              </Button>
            ))}
          </Space>
        ),
      },
      {
        title: 'Savings',
        dataIndex: 'savings',
        key: 'savings',
        render: s =>
          typeof s === 'number' ? (
            <Tag color={s >= 0 ? 'green' : 'red'}>${s.toFixed(2)}</Tag>
          ) : (
            <Text type="secondary">N/A</Text>
          ),
      },
      {
        title: 'Date Submitted',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (_, rec) => {
          const dt = rec.created_at || rec.created_on;
          return dt ? new Date(dt).toLocaleString() : 'N/A';
        },
      },
    ],
    []
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spin />
      </div>
    );
  }

  return (
    <>
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
          style={gradientCardStyle}
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
              onChange={e => setFilters(f => ({ ...f, sourcingId: e.target.value }))}
            />
            <Input
              placeholder="Filter by Sourcer ID"
              allowClear
              style={{ width: 160 }}
              onChange={e => setFilters(f => ({ ...f, sourcerId: e.target.value }))}
            />
          </Space>
          <Table
            dataSource={filteredOrders}
            columns={columns}
            rowKey="id"
            expandable={{ expandedRowRender: itemTable }}
            pagination={{ defaultPageSize: 20, showSizeChanger: true }}
            bordered
            size="middle"
          />
        </Card>
      </motion.div>
      {drawerOpen && (
        <Drawer
          title={isNewItem ? 'Add Product' : `Edit Item #${editingItem?.id}`}
          width={480}
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          destroyOnClose
          footer={
            <Space style={{ float: 'right' }}>
              <Button icon={<CloseOutlined />} onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={saveItem}
                loading={drawerLoading}
              >
                Save
              </Button>
            </Space>
          }
        >
          {drawerLoading ? (
            <Spin />
          ) : (
            <Form layout="vertical" form={form}>
              {isNewItem && (
                <Form.Item label="Pick from Master Products">
                  <Select
                    showSearch
                    placeholder="Search SKU or Name..."
                    filterOption={false}
                    onSearch={debouncedSearch}
                    options={searchOptions}
                    onSelect={handleProductSelect}
                    allowClear
                  />
                </Form.Item>
              )}
              <Form.Item
                label="Product Name"
                name="product_name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="SKU" name="sku">
                <Input />
              </Form.Item>
              <Form.Item
                label="Quantity"
                name="quantity_needed"
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Target $ (per unit)" name="target_cost_per_unit">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                label="Seller $ (line)"
                name="sourced_price"
                rules={[{ required: true, type: 'number', min: 0 }]}
              >
                <InputNumber step={0.01} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Product Type" name="product_type">
                <Select allowClear>
                  <Option value="Accessory">Accessory</Option>
                  <Option value="Console">Console</Option>
                  <Option value="Game">Game</Option>
                  <Option value="Handheld">Handheld</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Category" name="category">
                <Input />
              </Form.Item>
              <Form.Item label="Remarks" name="sourcer_remarks">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item valuePropName="checked" name="tested">
                <Checkbox>Tested</Checkbox>
              </Form.Item>
              <Form.Item label="Condition" name="product_condition">
                <Select allowClear>
                  <Option value="Excellent">Excellent</Option>
                  <Option value="Refurbished">Refurbished</Option>
                  <Option value="Acceptable">Acceptable</Option>
                  <Option value="Scratched">Scratched</Option>
                  <Option value="Unacceptable">Unacceptable</Option>
                </Select>
              </Form.Item>
            </Form>
          )}
        </Drawer>
      )}
    </>
  );
};

export default SourcingOrdersPage;
