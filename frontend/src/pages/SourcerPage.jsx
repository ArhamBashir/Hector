import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, InputNumber, Table, message, AutoComplete, Statistic, Card, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import apiClient from '../api/client';
import { debounce } from 'lodash';

const { Option } = Select;

const SourcerPage = () => {
  const [form] = Form.useForm();
  const [cartItems, setCartItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [efficiency, setEfficiency] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- NEW: Use Form.useWatch to get reactive values for the total costs ---
  const totals = Form.useWatch('totals', form);

  // --- NEW: useEffect to automatically calculate efficiency and distribute costs ---
  useEffect(() => {
    if (!totals || cartItems.length === 0) {
      setEfficiency(0);
      return;
    }

    const totalActualCost = (totals.sellers_price || 0) + (totals.shipping_price || 0) + (totals.tax || 0);
    
    const totalTargetCost = cartItems.reduce((acc, item) => {
        return acc + ((item.target_cost_per_unit || 0) * item.quantity_needed);
    }, 0);

    // 1. Calculate and set efficiency
    setEfficiency(totalTargetCost - totalActualCost);

    // 2. Distribute the totalActualCost across cart items based on their target_cost
    if (totalTargetCost > 0) {
      const costRatio = totalActualCost / totalTargetCost;
      const updatedCart = cartItems.map(item => ({
        ...item,
        // Formula: Prorate the total cost to this item based on its target cost
        sourced_price: (item.target_cost_per_unit || 0) * costRatio
      }));
      // Only update state if prices have actually changed to prevent infinite loops
      if (JSON.stringify(updatedCart) !== JSON.stringify(cartItems)) {
        setCartItems(updatedCart);
      }
    }

  }, [totals, cartItems]); // Reruns when totals or cartItems change

  const searchProducts = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await apiClient.get('/products/', { params: { q: query } });
      setSearchResults(response.data.map(p => ({
        value: p.product_name,
        label: `${p.sku} - ${p.product_name}`,
        product: p,
      })));
    } catch (error) {
      console.error("Failed to search products", error);
    }
  };

  const debouncedSearch = debounce(searchProducts, 300);

  const handleSelectProduct = (value, option) => {
    setSelectedProduct(option.product);
  };
  
  const handleAddToCart = () => {
      if (!selectedProduct) {
          message.error("Please select a product first.");
          return;
      }
      if (cartItems.some(item => item.id === selectedProduct.id)) {
          message.warning("This product is already in the cart.");
          return;
      }
      
      const newCartItem = {
          ...selectedProduct,
          quantity_needed: 1,
          sourced_price: 0, // Will be recalculated by useEffect
      };
      setCartItems(prevItems => [...prevItems, newCartItem]);
      setSelectedProduct(null);
      form.setFieldsValue({ search: '' }); 
  };
  
  const handleCartChange = (id, field, value) => {
      const updatedCart = cartItems.map(item => 
          item.id === id ? { ...item, [field]: value } : item
      );
      setCartItems(updatedCart);
  };

  const handleRemoveFromCart = (id) => {
      setCartItems(cartItems.filter(item => item.id !== id));
  };
  
  const handleSubmit = async (values) => {
    if (cartItems.length === 0) {
        message.error("Please add at least one item to the cart.");
        return;
    }
    setLoading(true);
    
    // Use the `sourced_price` from the state, which is automatically calculated
    const itemsToSubmit = cartItems.map(item => ({
        product_name: item.product_name,
        sku: item.sku,
        quantity_needed: item.quantity_needed,
        sourced_price: parseFloat(item.sourced_price.toFixed(2)), // Ensure it's a 2-decimal number
        product_type: item.product_type,
        category: item.category,
        // sourcer_remarks could be added here if there was an input for it
    }));
    
    const payload = {
        ...values.header,
        ...values.totals,
        items: itemsToSubmit,
    };
    
    try {
      const response = await apiClient.post('/sourcing/', payload);
      message.success(`Successfully created Sourcing ID: ${response.data.id}`);
      form.resetFields();
      setCartItems([]);
    } catch (error) {
      message.error('Failed to create sourcing request.');
    } finally {
      setLoading(false);
    }
  };
  
  const cartColumns = [
      { title: 'Name', dataIndex: 'product_name' },
      { title: 'SKU', dataIndex: 'sku' },
      { title: 'Target Cost', dataIndex: 'target_cost_per_unit', render: (val) => `$${val ? parseFloat(val).toFixed(2) : '0.00'}` },
      { title: 'Qty', dataIndex: 'quantity_needed', render: (val, record) => 
          <InputNumber min={1} value={val} onChange={(value) => handleCartChange(record.id, 'quantity_needed', value)} />
      },
      // --- MODIFIED: This input is now disabled and its value is calculated automatically ---
      { title: 'Seller Price', dataIndex: 'sourced_price', render: (val) => 
        <InputNumber 
            disabled 
            value={val ? parseFloat(val).toFixed(2) : '0.00'}
            prefix="$" 
            style={{ width: '100%' }}
        />
      },
      { title: 'Action', render: (_, record) => 
          <Button icon={<DeleteOutlined />} danger onClick={() => handleRemoveFromCart(record.id)} /> 
      },
  ];

  return (
    <div className="page-container">
      {/* REMOVED onValuesChange prop from Form, as useEffect handles it now */}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className="header-actions">
          <h2 style={{margin: 0}}>New Sourcing Order</h2>
          <Button type="primary" htmlType="submit" loading={loading}>Create Order</Button>
        </div>

        <Card style={{ marginBottom: '1.5rem' }}>
          <div className="form-grid">
            <Form.Item label="Listing Link" name={['header', 'listing_link']}><Input /></Form.Item>
            <Form.Item label="Seller Name" name={['header', 'seller_name']}><Input /></Form.Item>
            <Form.Item label="Marketplace" name={['header', 'market']} initialValue="eBay"><Select><Option value="Mercari">Mercari</Option><Option value="eBay">eBay</Option><Option value="Facebook">Facebook</Option><Option value="Etsy">Etsy</Option></Select></Form.Item>
            <Form.Item label="Origin" name={['header', 'origin']}><Input /></Form.Item>
          </div>
        </Card>

        <Card title="Product Cart">
            <Space.Compact style={{ width: '100%', marginBottom: '1rem' }}>
                <Form.Item name="search" style={{width: '100%', marginBottom: 0}}>
                    <AutoComplete
                        options={searchResults}
                        onSearch={debouncedSearch}
                        onSelect={(_, option) => handleSelectProduct(_, option)}
                        placeholder="Search Master Products by SKU or Name..."
                        allowClear
                    />
                </Form.Item>
                <Button type="primary" onClick={handleAddToCart}>Add to Cart</Button>
            </Space.Compact>
            <Table columns={cartColumns} dataSource={cartItems} rowKey="id" pagination={false} />
        </Card>
        
        <Card style={{ marginTop: '1.5rem' }}>
            <div className="form-grid" style={{ alignItems: 'center' }}>
                <Form.Item label="Total Seller's Price ($)" name={['totals', 'sellers_price']} initialValue={0}>
                    <InputNumber step="0.01" style={{width: '100%'}} />
                </Form.Item>
                <Form.Item label="Total Shipping ($)" name={['totals', 'shipping_price']} initialValue={0}>
                    <InputNumber step="0.01" style={{width: '100%'}} />
                </Form.Item>
                <Form.Item label="Total Taxes ($)" name={['totals', 'tax']} initialValue={0}>
                    <InputNumber step="0.01" style={{width: '100%'}} />
                </Form.Item>
                <Form.Item label="Calculated Efficiency">
                    <Statistic value={efficiency} precision={2} prefix="$" />
                </Form.Item>
            </div>
        </Card>
      </Form>
    </div>
  );
};

export default SourcerPage;