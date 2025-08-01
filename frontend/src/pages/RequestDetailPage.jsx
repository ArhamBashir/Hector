import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Checkbox,
  Typography,
  Table,
  Row,
  Col,
  InputNumber,
  Spin,
} from 'antd';
import { motion } from 'framer-motion';
import apiClient from '../api/client';
import { debounce } from 'lodash';

const { Title } = Typography;
const { Option } = Select;

const cardAnim = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const premiumBtn = {
  background: 'linear-gradient(90deg, #4364f7 0%, #6fb1fc 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 28,
  boxShadow: '0 3px 18px #669dfd33',
  fontWeight: 700,
  fontSize: 17,
};

const RequestDetailPage = () => {
  const { sourcingId } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productOptions, setProductOptions] = useState([]);
  const [formStatus, setFormStatus] = useState('Assigned');
  const [formTrackingStatus, setFormTrackingStatus] = useState('Awaiting');
  const [form] = Form.useForm();

  /** Fetch Sourcing Request */
  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/sourcing/${sourcingId}`);
      setRequest(data);

      // load cost fields under the same keys your backend uses
      form.setFieldsValue({
        ...data,
        sellers_price: data.sellers_price,
        shipping_price: data.shipping_price,
        tax: data.tax,
        tracking_status: data.tracking_status || 'Awaiting',
      });

      setFormStatus(data.status || 'Assigned');
      setFormTrackingStatus(data.tracking_status || 'Awaiting');
    } catch (error) {
      console.error(error);
      message.error('Failed to fetch request details.');
    } finally {
      setLoading(false);
    }
  }, [sourcingId, form]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  /** Update Order */
  const handleOrderUpdate = async (values) => {
    setUpdating(true);
    try {
      await apiClient.put(`/sourcing/${sourcingId}`, values);
      message.success('Order details updated!');
      await fetchRequest();
    } catch (error) {
      console.error(error);
      message.error('Failed to update order details.');
    } finally {
      setUpdating(false);
    }
  };

  /** Update Single Item */
  const updateItem = async (itemId, data) => {
    try {
      await apiClient.patch(`/sourcing/items/${itemId}`, data);
      setRequest((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, ...data } : item
        ),
      }));
      message.success('Item updated!');
    } catch (error) {
      console.error(error);
      message.error('Failed to update item.');
    }
  };

  /** Save Edited Product */
  const saveProductEdit = async (record, sku) => {
    try {
      await updateItem(record.id, { sku });
      setEditingProductId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async (query) => {
    if (!query) return;
    try {
      const res = await apiClient.get(`/products?search=${query}`);
      const options = res.data.map((p) => ({
        value: p.sku,
        label: `${p.product_name} (${p.sku})`,
        product: p,
      }));
      setProductOptions(options);
    } catch {
      setProductOptions([]);
    }
  };

  const addNewItem = async (sku) => {
    try {
      const selectedOption = productOptions.find((p) => p.value === sku);
      const product = selectedOption?.product;
      if (!product) {
        message.error("Product not found. Please search and select again.");
        return;
      }

      const existingItem = request.items.find((item) => item.sku === sku);
      if (existingItem) {
        await updateItem(existingItem.id, {
          quantity_needed: existingItem.quantity_needed + 1,
        });
      } else {
        await apiClient.post(`/sourcing/${sourcingId}/items`, {
          product_name: product.product_name,
          sku: product.sku,
          quantity_needed: 1,
          category: product.category || "General",
          product_type: product.product_type || "Accessory",
          target_cost_per_unit: product.target_cost_per_unit || 0,
          price: product.price || 0,
          sourced_price: 0,
          shipping_charges: 0,
          tax: 0,
          product_condition: "Excellent",
        });
        await fetchRequest();
      }

      message.success("Product updated successfully!");
    } catch (error) {
      console.error(error);
      message.error("Failed to add or update product.");
    }
  };

  const debouncedSearch = useMemo(() => debounce(fetchProducts, 300), []);

  /** Live Calculations */
  const sellersPrice = Form.useWatch('sellers_price', form) || 0;
  const shippingPrice = Form.useWatch('shipping_price', form) || 0;
  const tax = Form.useWatch('tax', form) || 0;

  const totalActualCost =
    (parseFloat(sellersPrice) || 0) +
    (parseFloat(shippingPrice) || 0) +
    (parseFloat(tax) || 0);

  const totalTargetCost =
    request?.items?.reduce(
      (acc, item) =>
        acc + (parseFloat(item.target_cost_per_unit) || 0) * item.quantity_needed,
      0
    ) || 0;

  const efficiency = totalTargetCost > 0 ? totalTargetCost - totalActualCost : 0;

  /** Table Columns */
  const itemColumns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      render: (text, record) =>
        editingProductId === record.id ? (
          <Select
            showSearch
            style={{ width: 200 }}
            placeholder="Search product"
            filterOption={false}
            onSearch={debouncedSearch}
            onChange={(val) => saveProductEdit(record, val)}
            options={productOptions}
          />
        ) : (
          <span
            style={{ cursor: 'pointer', color: '#30519c' }}
            onClick={() => setEditingProductId(record.id)}
          >
            {text}
          </span>
        ),
    },
    { title: 'SKU', dataIndex: 'sku' },
    {
      title: 'Qty',
      dataIndex: 'quantity_needed',
      align: 'center',
      render: (qty, record) => (
        <InputNumber
          min={1}
          size="small"
          value={qty}
          onChange={(val) => updateItem(record.id, { quantity_needed: val })}
        />
      ),
    },
    {
      title: 'Sourced Price',
      dataIndex: 'sourced_price',
      render: (price, record) => (
        <InputNumber
          min={0}
          size="small"
          value={price}
          onChange={(val) => updateItem(record.id, { sourced_price: val })}
        />
      ),
    },
    {
      title: 'Target Cost',
      dataIndex: 'target_cost_per_unit',
      render: (cost, record) => (
        <InputNumber
          min={0}
          size="small"
          value={cost}
          onChange={(val) => updateItem(record.id, { target_cost_per_unit: val })}
        />
      ),
    },
    {
      title: 'Shipping',
      dataIndex: 'shipping_charges',
      render: (shipping, record) => (
        <InputNumber
          min={0}
          size="small"
          value={shipping}
          onChange={(val) => updateItem(record.id, { shipping_charges: val })}
        />
      ),
    },
    {
      title: 'Tax',
      dataIndex: 'tax',
      render: (tax, record) => (
        <InputNumber
          min={0}
          size="small"
          value={tax}
          onChange={(val) => updateItem(record.id, { tax: val })}
        />
      ),
    },
    {
      title: 'Condition',
      dataIndex: 'product_condition',
      render: (condition, record) => (
        <Select
          size="small"
          value={condition}
          onChange={(val) => updateItem(record.id, { product_condition: val })}
          style={{ width: 120 }}
        >
          <Option value="Excellent">Excellent</Option>
          <Option value="Good">Good</Option>
          <Option value="Fair">Fair</Option>
        </Select>
      ),
    },
    {
      title: 'Efficiency',
      render: (_, record) => `$${(record.sku_efficiency || 0).toFixed(2)}`,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin />
      </div>
    );
  }

  if (!request) return <p>No request found.</p>;

  const handleStatusChange = (status) => {
    setFormStatus(status);
    if (status !== 'Purchased') {
      form.setFieldsValue({
        market_order_num: undefined,
        purchase_link: undefined,
        destination_warehouse: undefined,
      });
    }
  };

  const handleTrackingStatusChange = (status) => {
    setFormTrackingStatus(status);
    if (status !== 'In Transit') {
      form.setFieldsValue({
        carrier: undefined,
        tracking_id: undefined,
        tracking_link: undefined,
      });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(127deg,#f6fafe 0%, #e6edff 100%)',
        padding: '32px 0 60px 0',
      }}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={cardAnim}
        style={{ width: '100%', maxWidth: 1070, margin: '0 auto' }}
      >
        <Card style={{ borderRadius: 22 }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 20 }}>
            Sourcing Request #{request.id}
          </Title>

          {/* ITEMS SECTION */}
          <Card title="Items" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
              <Select
                showSearch
                style={{ width: 250 }}
                placeholder="Search and add product"
                filterOption={false}
                onSearch={debouncedSearch}
                onChange={(value) => addNewItem(value)}
                options={productOptions}
              />
              <Button
                type="primary"
                onClick={() => message.info('Select a product to add or update')}
              >
                Add / Update Item
              </Button>
            </div>

            <Table
              columns={itemColumns}
              dataSource={request.items || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* ORDER COSTS */}
          <Form form={form} component={false}>
            <Row gutter={10} style={{ marginBottom: 8 }}>
              <Col>
                <span>Seller's Price</span>
                <Form.Item name="sellers_price" style={{ margin: 0 }}>
                  <InputNumber
                    min={0}
                    precision={2}
                    size="small"
                    style={{ width: 80, marginLeft: 5 }}
                  />
                </Form.Item>
              </Col>
              <Col>
                <span>Shipping</span>
                <Form.Item name="shipping_price" style={{ margin: 0 }}>
                  <InputNumber
                    min={0}
                    precision={2}
                    size="small"
                    style={{ width: 80, marginLeft: 5 }}
                  />
                </Form.Item>
              </Col>
              <Col>
                <span>Taxes</span>
                <Form.Item name="tax" style={{ margin: 0 }}>
                  <InputNumber
                    min={0}
                    precision={2}
                    size="small"
                    style={{ width: 80, marginLeft: 5 }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <Row style={{ marginBottom: 20 }}>
            <Col span={8}>
              Order Value: <b>${totalActualCost.toFixed(2)}</b>
            </Col>
            <Col span={8}>
              Efficiency: <b>${efficiency.toFixed(2)}</b>
            </Col>
          </Row>

          {/* PURCHASE & TRACKING BELOW ITEMS */}
          <Card
            type="inner"
            title={
              <span style={{ fontWeight: 700, fontSize: 16, color: '#2d427a' }}>
                Purchase & Tracking
              </span>
            }
            headStyle={{ background: '#f6faff', borderRadius: 13 }}
            style={{
              borderRadius: 14,
              marginBottom: 0,
              boxShadow: '0 1px 7px #bdd7f21c',
              minHeight: 390,
              background: '#fafdff',
            }}
            bodyStyle={{ padding: 14 }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                ...request,
                tracking_status: request.tracking_status || 'Awaiting',
              }}
              onValuesChange={(_, allVals) => {
                setFormStatus(allVals.status);
                setFormTrackingStatus(allVals.tracking_status);
              }}
              onFinish={handleOrderUpdate}
              style={{ marginTop: 2 }}
            >
              <Form.Item
                name="status"
                label="Order Status"
                rules={[{ required: true, message: 'Order status required' }]}
                style={{ marginBottom: 6 }}
              >
                <Select
                  onChange={handleStatusChange}
                  placeholder="Select status"
                  popupMatchSelectWidth={false}
                  style={{ minWidth: 100 }}
                >
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
              </Form.Item>

              {formStatus === 'Purchased' && (
                <>
                  <Form.Item
                    name="market_order_num"
                    label="Market Order #"
                    rules={[
                      { required: true, message: 'Market Order # required when Purchased' },
                    ]}
                  >
                    <Input placeholder="Order #" />
                  </Form.Item>
                  <Form.Item
                    name="purchase_link"
                    label="Purchase Link"
                    rules={[
                      { required: true, message: 'Purchase link required when Purchased' },
                    ]}
                  >
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item
                    name="destination_warehouse"
                    label="Destination"
                    rules={[
                      { required: true, message: 'Destination required when Purchased' },
                    ]}
                  >
                    <Select placeholder="Select warehouse">
                      <Option value="Fleetwood">Fleetwood</Option>
                      <Option value="Lahore">Lahore</Option>
                      <Option value="Osaka">Osaka</Option>
                      <Option value="Quebec">Quebec</Option>
                      <Option value="Sharjah">Sharjah</Option>
                      <Option value="Customer">Customer</Option>
                    </Select>
                  </Form.Item>
                </>
              )}

              <Form.Item
                name="tracking_status"
                label="Tracking Status"
                rules={[{ required: true }]}
                initialValue="Awaiting"
                style={{ marginBottom: 6 }}
              >
                <Select
                  onChange={handleTrackingStatusChange}
                  popupMatchSelectWidth={false}
                  style={{ minWidth: 100 }}
                >
                  <Option value="Awaiting">Awaiting</Option>
                  <Option value="In Transit">In Transit</Option>
                  <Option value="Received">Received</Option>
                  <Option value="QC">QC</Option>
                  <Option value="Inventory">Inventory</Option>
                </Select>
              </Form.Item>

              {formTrackingStatus === 'In Transit' && (
                <>
                  <Form.Item
                    name="carrier"
                    label="Carrier"
                    rules={[{ required: true, message: 'Carrier required when In Transit' }]}
                  >
                    <Select placeholder="Select carrier">
                      <Option value="FedEx">FedEx</Option>
                      <Option value="USPS">USPS</Option>
                      <Option value="UPS">UPS</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="tracking_id"
                    label="Tracking ID"
                    rules={[
                      { required: true, message: 'Tracking ID required when In Transit' },
                    ]}
                  >
                    <Input placeholder="Enter tracking number" />
                  </Form.Item>
                  <Form.Item
                    name="tracking_link"
                    label="Tracking Link"
                    rules={[
                      { required: true, message: 'Tracking Link required when In Transit' },
                    ]}
                  >
                    <Input placeholder="https://..." />
                  </Form.Item>
                </>
              )}

              <Form.Item
                name="is_purchase_order_created"
                valuePropName="checked"
                style={{ marginTop: 6, marginBottom: 12 }}
              >
                <Checkbox style={{ fontWeight: 500 }}>
                  Is Purchase Order Created?
                </Checkbox>
              </Form.Item>

              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={updating}
                  style={premiumBtn}
                >
                  Save Order Changes
                </Button>
              </div>
            </Form>
          </Card>
        </Card>
      </motion.div>
    </div>
  );
};

export default RequestDetailPage;
