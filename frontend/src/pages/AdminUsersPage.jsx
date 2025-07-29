import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, message, Typography, Card
} from 'antd';
import { motion } from 'framer-motion';
import apiClient from '../api/client';

const { Option } = Select;
const { Title } = Typography;

const initialFormState = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'sourcer',
  is_active: true,
};

const roleColors = {
  admin: 'red',
  manager: 'purple',
  purchaser: 'blue',
  sourcer: 'green'
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const fetchUsers = useCallback(() => {
    setLoading(true);
    apiClient.get('/users/')
      .then(response => setUsers(response.data))
      .catch(() => message.error('Failed to fetch users.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    form.setFieldsValue(user ? { ...user, password: '' } : initialFormState);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleFormSubmit = async (values) => {
    const dataToSubmit = { ...values };
    if (editingUser && !dataToSubmit.password) {
      delete dataToSubmit.password;
    }

    const apiCall = editingUser
      ? apiClient.put(`/users/${editingUser.id}`, dataToSubmit)
      : apiClient.post('/users/', dataToSubmit);

    try {
      await apiCall;
      message.success(`User ${editingUser ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      message.error('Error: Could not save user. The email may be in use.');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiClient.delete(`/users/${userId}`);
        message.success('User deleted successfully!');
        fetchUsers();
      } catch (error) {
        message.error(error.response?.data?.detail || 'Failed to delete user.');
      }
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
    { title: 'First Name', dataIndex: 'first_name', key: 'first_name', sorter: (a, b) => a.first_name.localeCompare(b.first_name) },
    { title: 'Last Name', dataIndex: 'last_name', key: 'last_name', sorter: (a, b) => a.last_name.localeCompare(b.last_name) },
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: role => <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag>
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: active => <Tag color={active ? 'cyan' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleOpenModal(record)}>Edit</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Delete</Button>
        </Space>
      )
    }
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
          background: 'linear-gradient(to right, #f0f4ff, #dbeafe)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          padding: '2rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Manage Users</Title>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button type="primary" onClick={() => handleOpenModal()}>
              Add New User
            </Button>
          </motion.div>
        </div>
      </Card>

      <Card style={{ borderRadius: '12px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={
          <Title level={4} style={{ margin: 0 }}>
            {editingUser ? 'Edit User' : 'Add New User'}
          </Title>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        centered
        bodyStyle={{ paddingTop: '1rem' }}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item label="First Name" name="first_name" rules={[{ required: true, message: 'Please enter the first name' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Last Name" name="last_name" rules={[{ required: true, message: 'Please enter the last name' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" help={editingUser ? "Leave blank to keep existing password" : ""}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select>
              <Option value="sourcer">Sourcer</Option>
              <Option value="purchaser">Purchaser</Option>
              <Option value="manager">Manager</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Is Active" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '1rem' }}>
            <Button onClick={handleCloseModal} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default AdminUsersPage;
