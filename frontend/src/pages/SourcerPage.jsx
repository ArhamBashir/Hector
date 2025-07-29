import React, { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  Table,
  message,
  Statistic,
  Card,
  Row,
  Col,
  Typography
} from 'antd';
import { motion } from 'framer-motion';
import { DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { debounce } from 'lodash';

const { Option } = Select;
const { Title, Text } = Typography;

const gradientStyle = {
  background: 'linear-gradient(to right, #f8fbff, #e0f2fe)',
  borderRadius: '12px',
  padding: '1rem',
  marginBottom: '1rem',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
};

const SourcerPage = () => {
  const [form] = Form.useForm();
  const [cartItems, setCartItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [efficiency, setEfficiency] = useState(0);
  const [createdOn, setCreatedOn] = useState(null);
  const totals = Form.useWatch('totals', form);
  const navigate = useNavigate();

  // ---------- Efficiency + prorate ----------
  useEffect(() => {
    if (!totals || cartItems.length === 0) {
      setEfficiency(0);
      return;
    }

    const totalActualCost =
      (totals.sellers_price || 0) +
      (totals.shipping_price || 0) +
      (totals.tax || 0);

    const totalTargetCost = cartItems.reduce(
      (acc, item) =>
        acc + ((item.target_cost_per_unit || 0) * item.quantity_needed),
      0
    );

    const eff = totalTargetCost - totalActualCost;
    setEfficiency(eff);

    if (totalTargetCost > 0) {
      const costRatio = totalActualCost / totalTargetCost;
      setCartItems(prev =>
        prev.map(item => ({
          ...item,
          sourced_price: (item.target_cost_per_unit || 0) * costRatio
        }))
      );
    }
  }, [totals, cartItems.length]); // only re-run when length changes to avoid loops

  // ---------- Search ----------
  const fetchProducts = async (query) => {
    if (!query || query.length < 2) return;
    try {
      const { data } = await apiClient.get('/products/', { params: { q: query } });
      const options = data.map(p => ({
        value: p.id.toString(),
        label: `${p.sku} - ${p.product_name}`,
        product: p
      }));
      setSearchResults(options);
    } catch (err) {
      console.error(err);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce(fetchProducts, 300),
    []
  );

  // Add one product
  const addToCart = (product) => {
    setCartItems(prev => {
      if (prev.some(i => i.id === product.id)) {
        message.warning('Product already in cart');
        return prev;
      }
      return [
        ...prev,
        {
          ...product,
          quantity_needed: 1,
          sourced_price: 0
        }
      ];
    });
  };

  // When user selects multiple at once
  const handleMultiSelectChange = (_values, options) => {
    options.forEach(opt => addToCart(opt.product));
    // clear select so you can search again cleanly
    form.setFieldsValue({ search: [] });
  };

  // ---------- Cart handlers ----------
  const handleCartChange = (id, field, value) => {
    setCartItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // ---------- Submit ----------
  const handleSubmit = async (values) => {
    if (cartItems.length === 0) return message.error('Cart is empty');

    const items = cartItems.map(item => ({
      product_name: item.product_name,
      sku: item.sku,
      quantity_needed: item.quantity_needed,
      sourced_price: Number(item.sourced_price.toFixed(2)),
      product_type: item.product_type,
      category: item.category
    }));

    const payload = {
      ...values.header,
      ...values.totals,
      items
    };

    try {
      const res = await apiClient.post('/sourcing/', payload);
      message.success(`Created sourcing ID: ${res.data.id}`);

      const created = res.data.created_on || res.data.created_at;
      if (created) {
        const formatted = new Date(created).toLocaleString();
        setCreatedOn(formatted);
        message.info(`Created On: ${formatted}`);
      }

      form.resetFields();
      setCartItems([]);
      setSearchResults([]);

      setTimeout(() => {
        setCreatedOn(null);
        navigate('/'); // adjust to your route
      }, 2500);
    } catch (err) {
      console.error('API error:', err.response?.data || err.message);
      message.error('Submission failed');
    }
  };

  const cartColumns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong><br />
          <Text type="secondary" style={{ fontSize: '0.75rem' }}>{record.sku}</Text>
        </div>
      )
    },
    {
      title: 'Qty',
      dataIndex: 'quantity_needed',
      render: (val, record) => (
        <InputNumber
          min={1}
          size="small"
          value={val}
          onChange={(value) =>
            handleCartChange(record.id, 'quantity_needed', Number(value))
          }
        />
      )
    },
    {
      title: 'Target $',
      dataIndex: 'target_cost_per_unit',
      render: val => `$${val ? Number(val).toFixed(2) : '0.00'}`
    },
    {
      title: 'Seller $',
      dataIndex: 'sourced_price',
      render: val => (
        <InputNumber
          disabled
          size="small"
          value={Number(val).toFixed(2)}
          prefix="$"
        />
      )
    },
    {
      title: '',
      render: (_, record) => (
        <Button
          size="small"
          icon={<DeleteOutlined />}
          danger
          onClick={() => handleRemoveFromCart(record.id)}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '1.5rem', background: '#f4f9ff', borderRadius: '10px' }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Title level={3}>New Sourcing Order</Title>
        </motion.div>

        {/* Header */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name={['header', 'listing_link']} label="Listing Link">
                <Input size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name={['header', 'seller_name']} label="Seller Name">
                <Input size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name={['header', 'market']} label="Marketplace" initialValue="eBay">
                <Select size="small">
                  <Option value="eBay">eBay</Option>
                  <Option value="Mercari">Mercari</Option>
                  <Option value="Facebook">Facebook</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name={['header', 'origin']} label="Origin">
                <Input size="small" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Search + Efficiency */}
        <Card style={gradientStyle}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={16}>
              <Form.Item name="search" noStyle>
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  size="large"
                  style={{ width: '100%' }} 
                  placeholder="Search SKU or Name..."
                  onSearch={debouncedSearch}
                  options={searchResults}
                  filterOption={false}
                  onChange={handleMultiSelectChange}
                  value={[]}   // always clear selected tags after add
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Efficiency"
                prefix="$"
                value={efficiency}
                precision={2}
                valueStyle={{ color: efficiency >= 0 ? 'green' : 'red' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Cart */}
        <Card style={gradientStyle}>
          <Table
            size="small"
            columns={cartColumns}
            dataSource={cartItems}
            rowKey="id"
            pagination={false}
          />
        </Card>

        {/* Totals */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Form.Item name={['totals', 'sellers_price']} label="Seller Price ($)" initialValue={0}>
                <InputNumber step={0.01} style={{ width: '100%' }} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={['totals', 'shipping_price']} label="Shipping ($)" initialValue={0}>
                <InputNumber step={0.01} style={{ width: '100%' }} size="small" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={['totals', 'tax']} label="Taxes ($)" initialValue={0}>
                <InputNumber step={0.01} style={{ width: '100%' }} size="small" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Created On Banner */}
        {createdOn && (
          <Card
            style={{
              ...gradientStyle,
              background: '#e6f7ff',
              border: '1px solid #91d5ff',
              textAlign: 'center'
            }}
          >
            <Text strong style={{ fontSize: '16px' }}>
              Created On: <span style={{ color: '#096dd9' }}>{createdOn}</span>
            </Text>
          </Card>
        )}

{/* Sticky Submit Button */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.4 }}
  style={{
    position: 'fixed',
    bottom: '24px',
    right: '32px',
    zIndex: 999,
  }}
>
  <Button
    type="primary"
    htmlType="submit"
    size="large"
    style={{
      padding: '0.75rem 2rem',
      fontWeight: 600,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}
  >
    Create Order
  </Button>
</motion.div>

      </Form>
    </div>
  );
};

export default SourcerPage;
