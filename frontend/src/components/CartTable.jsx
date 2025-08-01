// src/components/CartTable.jsx
import React from 'react';
import { Table, InputNumber, Button, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function CartTable({ items, onCartChange, onRemove }) {
  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      render: (text, rec) => (
        <div>
          <strong>{text}</strong><br/>
          <Text type="secondary" style={{ fontSize: 12 }}>{rec.sku}</Text>
        </div>
      )
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity_needed',
      render: (val, rec) => (
        <InputNumber
          min={1}
          size="small"
          value={val}
          onChange={v => onCartChange(rec.id, 'quantity_needed', v)}
        />
      )
    },
    {
      title: 'Target Cost Per Unit',
      dataIndex: 'target_cost_per_unit',
      render: v => `$${(v||0).toFixed(2)}`
    },
    {
      title: 'Total Target Cost',
      dataIndex: 'item_target_total',
      render: v => `$${(v||0).toFixed(2)}`
    },
    {
      title: 'Efficiency',
      dataIndex: 'sku_efficiency',
      render: v => `$${(v||0).toFixed(2)}`
    },
    {
      title: 'Seller Price',
      dataIndex: 'sourced_price',
      render: (val, rec) => (
        <InputNumber
          step={0.01}
          size="small"
          value={val}
          onChange={v => onCartChange(rec.id, 'sourced_price', v)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Shipping Cost',
      dataIndex: 'shipping_price',
      render: v => `$${(v||0).toFixed(2)}`
    },
    {
      title: 'Tax Cost',
      dataIndex: 'tax_price',
      render: v => `$${(v||0).toFixed(2)}`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, rec) => (
        <Button
          size="small"
          icon={<DeleteOutlined />}
          danger
          onClick={() => onRemove(rec.id)}
        />
      )
    }
  ];

  return (
    <Table
      size="small"
      columns={columns}
      dataSource={items}
      rowKey="id"
      pagination={false}
    />
  );
}
