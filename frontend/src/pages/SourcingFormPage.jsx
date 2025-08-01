// File: src/pages/SourcingFormPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Typography,
} from 'antd';
import { motion } from 'framer-motion';
import { DeleteOutlined } from '@ant-design/icons';
import { debounce } from 'lodash';
import apiClient from '../api/client';

const { Option } = Select;
const { Title, Text } = Typography;

const gradientStyle = {
  background: 'linear-gradient(to right, #f8fbff, #e0f2fe)',
  borderRadius: '12px',
  padding: '1rem',
  marginBottom: '1rem',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
};

export default function SourcingFormPage() {
  const { orderId } = useParams();
  const isEdit = Boolean(orderId);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [efficiency, setEfficiency] = useState(0);
  const [createdOn, setCreatedOn] = useState(null);

  const totals = Form.useWatch('totals', form);

  const totalTargetCost = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.item_target_total, 0),
    [cartItems]
  );

  useEffect(() => {
    if (!isEdit) return;
    apiClient
      .get(`/sourcing/${orderId}`)
      .then(({ data: initial }) => {
        form.setFieldsValue({
          header: {
            listing_link: initial.listing_link,
            seller_name: initial.seller_name,
            market: initial.market,
            origin: initial.origin,
          },
          totals: {
            sellers_price: initial.sellers_price || 0,
            shipping_price: initial.shipping_price || 0,
            tax: initial.tax || 0,
          },
        });
        setCreatedOn(new Date(initial.created_at).toLocaleString());

        const loaded = (initial.items || []).map(item => ({
          id: item.id,
          product_name: item.product_name,
          sku: item.sku,
          product_type: item.product_type,
          category: item.category,
          quantity_needed: item.quantity_needed,
          target_cost_per_unit: item.target_cost_per_unit,
          item_target_total: item.target_cost_per_unit * item.quantity_needed,
        }));
        setCartItems(loaded);
        setOriginalItems(loaded);
      })
      .catch(err => {
        console.error(err);
        message.error('Failed to load order data.');
      });
  }, [isEdit, orderId, form]);

  useEffect(() => {
    if (!totals || cartItems.length === 0) {
      setEfficiency(0);
      return;
    }
    const sellersTotal = Number(totals.sellers_price || 0);
    const shippingTotal = Number(totals.shipping_price || 0);
    const taxTotal = Number(totals.tax || 0);
    const totalActualCost = sellersTotal + shippingTotal + taxTotal;
    setEfficiency(totalTargetCost - totalActualCost);
  }, [totals, totalTargetCost]);

  const fetchProducts = async query => {
    if (!query || query.length < 2) return;
    try {
      const { data } = await apiClient.get('/products/', { params: { q: query } });
      setSearchResults(
        data.map(p => ({
          value: p.id.toString(),
          label: `${p.sku} - ${p.product_name}`,
          product: p,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };
  const debouncedSearch = useMemo(() => debounce(fetchProducts, 300), []);

  const addToCart = product => {
    if (cartItems.some(i => i.id === product.id)) {
      return message.warning('Product already in cart');
    }
    setCartItems(prev => [
      ...prev,
      {
        id: product.id,
        product_name: product.product_name,
        sku: product.sku,
        product_type: product.product_type,
        category: product.category,
        quantity_needed: 1,
        target_cost_per_unit: product.target_cost_per_unit || 0,
        item_target_total: (product.target_cost_per_unit || 0) * 1,
      },
    ]);
  };
  const handleMultiSelectChange = (_, options) => {
    options.forEach(opt => addToCart(opt.product));
    form.setFieldsValue({ search: [] });
  };

  const handleCartChange = (id, value) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id !== id
          ? item
          : {
              ...item,
              quantity_needed: value,
              item_target_total: item.target_cost_per_unit * value,
            }
      )
    );
  };

  const handleRemoveFromCart = id =>
    setCartItems(prev => prev.filter(item => item.id !== id));

  const handleSubmit = async values => {
    if (cartItems.length === 0) {
      return message.error('Cart is empty');
    }

    try {
      if (isEdit) {
        // synchronize deletes / adds / patches
        const origIds = originalItems.map(i => i.id);
        const curIds = cartItems.map(i => i.id);

        for (const id of origIds.filter(id => !curIds.includes(id))) {
          await apiClient.delete(`/sourcing/items/${id}`);
        }
        for (const item of cartItems.filter(i => !origIds.includes(i.id))) {
          await apiClient.post(`/sourcing/${orderId}/items`, {
            product_name: item.product_name,
            sku: item.sku,
            quantity_needed: item.quantity_needed,
            target_cost_per_unit: item.target_cost_per_unit,
            product_type: item.product_type,
            category: item.category,
          });
        }
        for (const item of cartItems.filter(i => origIds.includes(i.id))) {
          await apiClient.patch(`/sourcing/items/${item.id}`, {
            quantity_needed: item.quantity_needed,
          });
        }

        await apiClient.put(`/sourcing/${orderId}`, {
          ...values.header,
          sellers_price: values.totals.sellers_price,
          shipping_price: values.totals.shipping_price,
          tax: values.totals.tax,
        });
        message.success(`Order ${orderId} updated`);
      } else {
        // create mode
        const itemsPayload = cartItems.map(item => {
          const ratio = item.item_target_total / (totalTargetCost || 1);
          return {
            product_name: item.product_name,
            sku: item.sku,
            quantity_needed: item.quantity_needed,
            target_cost_per_unit: item.target_cost_per_unit,
            sourced_price: Number(
              ((values.totals.sellers_price || 0) * ratio).toFixed(2)
            ),
            shipping_charges: Number(
              ((values.totals.shipping_price || 0) * ratio).toFixed(2)
            ),
            tax: Number(((values.totals.tax || 0) * ratio).toFixed(2)),
            product_type: item.product_type,
            category: item.category,
          };
        });

        const payload = {
          ...values.header,
          sellers_price: values.totals.sellers_price,
          shipping_price: values.totals.shipping_price,
          tax: values.totals.tax,
          items: itemsPayload,
        };
        const res = await apiClient.post('/sourcing/', payload);
        message.success(`Created sourcing ID: ${res.data.id}`);
      }

      navigate('/sourcing/orders');
    } catch (err) {
      console.error('API error payload:', err.response?.data || err);
      message.error(
        `Submission failed: ${err.response?.data?.detail || 'validation error'}`
      );
    }
  };

  const cartColumns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      render: (text, rec) => (
        <div>
          <strong>{text}</strong>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {rec.sku}
          </Text>
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity_needed',
      render: (val, rec) => (
        <InputNumber
          min={1}
          size="small"
          value={val}
          onChange={v => handleCartChange(rec.id, v)}
        />
      ),
    },
    {
      title: 'Target/unit',
      dataIndex: 'target_cost_per_unit',
      render: v => `$${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Total Target',
      dataIndex: 'item_target_total',
      render: v => `$${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Seller Price/unit',
      render: (_, rec) => {
        const sellersTotal = Number(totals?.sellers_price || 0);
        const ratio = rec.target_cost_per_unit / (totalTargetCost || 1);
        return `$${(sellersTotal * ratio).toFixed(2)}`;
      },
    },
    {
      title: 'Shipping',
      render: (_, rec) => {
        const shippingTotal = Number(totals?.shipping_price || 0);
        const ratio = rec.item_target_total / (totalTargetCost || 1);
        return `$${(shippingTotal * ratio).toFixed(2)}`;
      },
    },
    {
      title: 'Tax',
      render: (_, rec) => {
        const taxTotal = Number(totals?.tax || 0);
        const ratio = rec.item_target_total / (totalTargetCost || 1);
        return `$${(taxTotal * ratio).toFixed(2)}`;
      },
    },
    {
      title: 'Total Actual Cost',
      render: (_, rec) => {
        const sellersTotal = Number(totals?.sellers_price || 0);
        const shippingTotal = Number(totals?.shipping_price || 0);
        const taxTotal = Number(totals?.tax || 0);
        const ratio = rec.item_target_total / (totalTargetCost || 1);
        const tac =
          (sellersTotal * ratio + shippingTotal * ratio + taxTotal * ratio);
        return `$${tac.toFixed(2)}`;
      },
    },
    {
      title: 'Efficiency',
      render: (_, rec) => {
        const sellersTotal = Number(totals?.sellers_price || 0);
        const shippingTotal = Number(totals?.shipping_price || 0);
        const taxTotal = Number(totals?.tax || 0);
        const ratio = rec.item_target_total / (totalTargetCost || 1);
        const eff =
          rec.item_target_total -
          (sellersTotal * ratio + shippingTotal * ratio + taxTotal * ratio);
        return `$${eff.toFixed(2)}`;
      },
    },
    {
      title: 'Action',
      render: (_, rec) => (
        <Button
          size="small"
          icon={<DeleteOutlined />}
          danger
          onClick={() => handleRemoveFromCart(rec.id)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f4f9ff', borderRadius: 10 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ totals: { sellers_price: 0, shipping_price: 0, tax: 0 } }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Title level={3}>{isEdit ? 'Edit' : 'New'} Sourcing Order</Title>
        </motion.div>

        {/* Header */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]}>
            <Col span={6}>
              <Form.Item name={['header', 'listing_link']} label="Listing Link">
                <Input size="small" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name={['header', 'seller_name']} label="Supplier">
                <Input size="small" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name={['header', 'market']} label="Market" initialValue="eBay">
                <Select size="small">
                  <Option value="eBay">eBay</Option>
                  <Option value="Mercari">Mercari</Option>
                  <Option value="Facebook">Facebook</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name={['header', 'origin']} label="Origin">
                <Input size="small" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Search + Efficiency */}
        <Card style={gradientStyle}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={16}>
              <Form.Item name="search" style={{ width: '100%' }}>
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  size="large"
                  placeholder="Search SKU or Name..."
                  onSearch={debouncedSearch}
                  options={searchResults}
                  filterOption={false}
                  onChange={handleMultiSelectChange}
                  value={[]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
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

        {/* Cart Table */}
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
            <Col span={8}>
              <Form.Item
                name={['totals', 'sellers_price']}
                label="Seller Price ($)"
              >
                <InputNumber step={0.01} style={{ width: '100%' }} size="small" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['totals', 'shipping_price']}
                label="Shipping ($)"
              >
                <InputNumber step={0.01} style={{ width: '100%' }} size="small" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['totals', 'tax']} label="Taxes ($)">
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
              textAlign: 'center',
            }}
          >
            <Text strong style={{ fontSize: 16 }}>
              Created On:{' '}
              <span style={{ color: '#096dd9' }}>{createdOn}</span>
            </Text>
          </Card>
        )}

        {/* Sticky Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 32,
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
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {isEdit ? 'Save Changes' : 'Create Order'}
          </Button>
        </motion.div>
      </Form>
    </div>
  );
}
