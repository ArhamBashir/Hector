import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  message,
  Checkbox,
  Typography,
  Descriptions,
  Table
} from 'antd';
import apiClient from '../api/client';

const { Title } = Typography;
const { Option } = Select;

const RequestDetailPage = () => {
  const { sourcingId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  const fetchRequest = useCallback(() => {
    setLoading(true);
    apiClient
      .get(`/sourcing/${sourcingId}`)
      .then((response) => {
        setRequest(response.data);
        form.setFieldsValue(response.data); // Prefill form with request data
      })
      .catch(() => message.error('Failed to fetch request details.'))
      .finally(() => setLoading(false));
  }, [sourcingId, form]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

 const handleOrderUpdate = async (values) => {
  try {
    await apiClient.put(`/sourcing/${sourcingId}`, values);
    message.success('Order details updated successfully!');
    fetchRequest(); // Refresh data on this page
  } catch (err) {
    console.error(err);
    message.error('Failed to update order details.');
  }
};



  const handleItemUpdate = async (itemId, field, value) => {
    try {
      await apiClient.patch(`/sourcing/items/${itemId}`, { [field]: value });
      message.success(`Item #${itemId} updated!`);
      fetchRequest();
    } catch (err) {
      message.error('Failed to update item.');
    }
  };

  const itemColumns = [
    { title: 'Product Name', dataIndex: 'product_name' },
    { title: 'SKU', dataIndex: 'sku' },
    { title: 'Qty', dataIndex: 'quantity_needed' },
    {
      title: 'Condition',
      dataIndex: 'product_condition',
      render: (val, record) => (
        <Select
          defaultValue={val || 'Excellent'}
          style={{ width: 140 }}
          onChange={(value) => handleItemUpdate(record.id, 'product_condition', value)}
        >
          <Option value="Excellent">Excellent</Option>
          <Option value="Refurbished">Refurbished</Option>
          <Option value="Acceptable">Acceptable</Option>
          <Option value="Scratched">Scratched</Option>
          <Option value="Unacceptable">Unacceptable</Option>
        </Select>
      )
    },
    {
      title: 'Tested',
      dataIndex: 'tested',
      render: (val, record) => (
        <Checkbox
          defaultChecked={val}
          onChange={(e) => handleItemUpdate(record.id, 'tested', e.target.checked)}
        />
      )
    }
  ];

  if (loading) return <p>Loading...</p>;
  if (!request) return <p>No request found.</p>;

  return (
    <div className="page-container">
      <Title level={2}>Sourcing Request #{request.id}</Title>

      <Card title="Order Details from Sourcer" style={{ marginBottom: '1.5rem' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Seller Name">{request.seller_name}</Descriptions.Item>
          <Descriptions.Item label="Marketplace">{request.market}</Descriptions.Item>
          <Descriptions.Item label="Total Seller's Price">
            ${request.sellers_price?.toFixed(2) || '0.00'}
          </Descriptions.Item>
          <Descriptions.Item label="Total Shipping">
            ${request.shipping_price?.toFixed(2) || '0.00'}
          </Descriptions.Item>
          <Descriptions.Item label="Total Order Value">
            ${request.total_order_value?.toFixed(2) || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Efficiency">
            {request.efficiency_percentage != null
              ? `${request.efficiency_percentage.toFixed(2)}%`
              : 'N/A'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Update Purchase & Tracking Details">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleOrderUpdate}
          initialValues={{ status: request?.status }}
        >
          <div className="form-grid">
            <Form.Item name="status" label="Order Status" rules={[{ required: true }]}>
              <Select>
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

            <Form.Item name="market_order_num" label="Market Order #">
              <Input />
            </Form.Item>
            <Form.Item name="purchase_link" label="Purchase Link">
              <Input />
            </Form.Item>
            <Form.Item name="destination_warehouse" label="Destination">
              <Select>
                <Option value="Fleetwood">Fleetwood</Option>
                <Option value="Lahore">Lahore</Option>
                <Option value="Osaka">Osaka</Option>
                <Option value="Quebec">Quebec</Option>
                <Option value="Sharjah">Sharjah</Option>
                <Option value="Customer">Customer</Option>
              </Select>
            </Form.Item>
            <Form.Item name="tracking_status" label="Tracking Status">
              <Select>
                <Option value="Awaiting">Awaiting</Option>
                <Option value="In Transit">In Transit</Option>
                <Option value="Received">Received</Option>
                <Option value="QC">QC</Option>
                <Option value="Inventory">Inventory</Option>
              </Select>
            </Form.Item>
            <Form.Item name="carrier" label="Carrier">
              <Select>
                <Option value="FedEx">FedEx</Option>
                <Option value="USPS">USPS</Option>
                <Option value="UPS">UPS</Option>
              </Select>
            </Form.Item>
            <Form.Item name="tracking_id" label="Tracking ID">
              <Input />
            </Form.Item>
            <Form.Item name="tracking_link" label="Tracking Link">
              <Input />
            </Form.Item>
            <Form.Item name="odoo_po_id" label="Odoo Purchase Order ID">
              <Input />
            </Form.Item>
            <Form.Item name="po_reference" label="PO ID">
              <Input />
            </Form.Item>
            <Form.Item name="purchase_without_tracking" valuePropName="checked">
              <Checkbox>Purchase Without Tracking ID</Checkbox>
            </Form.Item>
            <Form.Item name="purchase_with_tracking" valuePropName="checked">
              <Checkbox>Purchase With Tracking ID</Checkbox>
            </Form.Item>
            <Form.Item name="is_purchase_order_created" valuePropName="checked">
              <Checkbox>Is Purchase Order Created?</Checkbox>
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" style={{ marginTop: '1rem' }}>
            Save Order Changes
          </Button>
        </Form>
      </Card>

      <Card title="Items in this Request" style={{ marginTop: '1.5rem' }}>
        <Table columns={itemColumns} dataSource={request.items} rowKey="id" pagination={false} />
      </Card>
    </div>
  );
};

export default RequestDetailPage;
