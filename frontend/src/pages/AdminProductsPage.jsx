import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Select,
  Space,
  message,
  Typography,
  Card
} from 'antd';
import { debounce } from 'lodash';
import apiClient from '../api/client';
import { motion } from 'framer-motion';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

const initialFormState = {
  uid: '',
  product_name: '',
  type_code: '',
  brnd_cod: '',
  model_code: '',
  abbr_code: '',
  color_code: '',
  cnd_code: '',
  sku: '',
  regular_price: 0,
  price: 0,
  category: '',
  product_type: 'Game',
  target_cost_per_unit: 0,
};

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [generatedSku, setGeneratedSku] = useState('');

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const activeFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
    apiClient.get('/products/', { params: activeFilters })
      .then(response => setProducts(response.data))
      .catch(() => message.error('Failed to fetch products.'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const debouncedSearch = useCallback(
    debounce(q => setFilters(prev => ({ ...prev, q })), 500),
    []
  );

  const generateSku = () => {
    const values = form.getFieldsValue();
    const { type_code, brnd_cod, model_code, abbr_code, color_code, cnd_code, uid } = values;
    if (type_code && brnd_cod && model_code && abbr_code && color_code && cnd_code && uid) {
      const sku = `${type_code}-${brnd_cod}-${model_code}-${abbr_code}-${color_code}-${cnd_code}-${uid}`;
      setGeneratedSku(sku);
      form.setFieldValue('sku', sku);
    } else {
      setGeneratedSku('');
      form.setFieldValue('sku', '');
    }
  };

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    form.setFieldsValue(product || initialFormState);
    if (product) {
      setGeneratedSku(product.sku || '');
    } else {
      setGeneratedSku('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    form.resetFields();
    setGeneratedSku('');
  };

  const handleFormSubmit = async (values) => {
    const apiCall = editingProduct
      ? apiClient.put(`/products/${editingProduct.id}`, values)
      : apiClient.post('/products/', values);

    try {
      await apiCall;
      message.success(`Product ${editingProduct ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
      fetchProducts();
    } catch (error) {
      message.error('Error: Could not save product. SKU may be in use.');
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiClient.delete(`/products/${productId}`);
        message.success('Product deleted successfully!');
        fetchProducts();
      } catch (error) {
        message.error('Failed to delete product.');
      }
    }
  };

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', sorter: (a, b) => a.sku.localeCompare(b.sku) },
    { title: 'Name', dataIndex: 'product_name', key: 'product_name', sorter: (a, b) => a.product_name.localeCompare(b.product_name) },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Type', dataIndex: 'product_type', key: 'product_type' },
    {
      title: 'Target Cost',
      dataIndex: 'target_cost_per_unit',
      key: 'target_cost_per_unit',
      render: (cost) => `$${parseFloat(cost).toFixed(2)}`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleOpenModal(record)}>Edit</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '2rem' }}
    >
      <Card
        style={{
          background: 'linear-gradient(to right, #eef2ff, #dbeafe)',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)',
          padding: '2rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Manage Master Products</Title>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button type="primary" onClick={() => handleOpenModal()}>
              Add New Product
            </Button>
          </motion.div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <Search
            placeholder="Search by SKU or Name..."
            onSearch={(value) => setFilters(prev => ({ ...prev, q: value }))}
            onChange={(e) => debouncedSearch(e.target.value)}
            style={{ width: 300 }}
            allowClear
            size="large"
          />
        </div>
      </Card>

      <Card style={{ borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={
          <Title level={4} style={{ margin: 0 }}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Title>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        centered
        style={{ borderRadius: '10px' }}
        bodyStyle={{ paddingTop: '1rem' }}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} onValuesChange={generateSku}>
          <Form.Item label="UID" name="uid" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Product Name" name="product_name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Type Code" name="type_code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Brand Code" name="brnd_cod" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Model Code" name="model_code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Abbr Code" name="abbr_code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Color Code" name="color_code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Condition Code" name="cnd_code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="SKU" name="sku">
            <Input disabled placeholder="Auto-generated SKU" />
          </Form.Item>
          {generatedSku && (
            <div style={{ marginBottom: 10, color: '#1890ff' }}>
              Generated SKU: <strong>{generatedSku}</strong>
            </div>
          )}
          <Form.Item label="Regular Price" name="regular_price" rules={[{ required: true }]}><Input type="number" step="0.01" /></Form.Item>
          <Form.Item label="Price" name="price" rules={[{ required: true }]}><Input type="number" step="0.01" /></Form.Item>
          <Form.Item label="Target Cost ($)" name="target_cost_per_unit" rules={[{ required: true }]}><Input type="number" step="0.01" /></Form.Item>
          <Form.Item label="Category" name="category" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Product Type" name="product_type" rules={[{ required: true }]}>
            <Select>
              <Option value="Accessory">Accessory</Option>
              <Option value="Console">Console</Option>
              <Option value="Game">Game</Option>
              <Option value="Handheld">Handheld</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button onClick={handleCloseModal} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default AdminProductsPage;
