import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, message } from 'antd';
import apiClient from '../api/client';

const { Option } = Select;

const initialFormState = {
  email: '',
  password: '',
  role: 'sourcer',
  is_active: true,
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

  const roleColors = {
      admin: 'red',
      manager: 'purple',
      purchaser: 'blue',
      sourcer: 'green'
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
    { title: 'Role', dataIndex: 'role', key: 'role', render: role => <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag> },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: active => <Tag color={active ? 'cyan' : 'default'}>{active ? 'Active' : 'Inactive'}</Tag> },
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
    <div className="page-container">
      <div className="header-actions">
        <h2>Manage Users</h2>
        <Button type="primary" onClick={() => handleOpenModal()}>Add New User</Button>
      </div>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
      />
      
      <Modal
        title={editingUser ? 'Edit User' : 'Add New User'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" help={editingUser ? "Leave blank to keep the same" : ""}>
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
            <Button onClick={handleCloseModal} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsersPage;