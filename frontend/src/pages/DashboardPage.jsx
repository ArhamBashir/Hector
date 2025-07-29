import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ManagerDashboardPage from './ManagerDashboardPage';
import SourcerDashboardPage from './SourcerDashboardPage';
import PurchaserDashboardPage from './PurchaserDashboardPage';
import apiClient from '../api/client';
import { Card, Typography } from 'antd';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const { Title } = Typography;

const DashboardPage = () => {
  const { user } = useAuth();
  const [userCount, setUserCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (user?.role === 'admin') {
      apiClient.get('/users/').then(res => setUserCount(res.data.length));
      apiClient.get('/products/').then(res => setProductCount(res.data.length));
    }
  }, [user]);

  if (!user) return <p>Loading...</p>;

  switch (user.role) {
    case 'manager':
      return <ManagerDashboardPage />;
    case 'sourcer':
      return <SourcerDashboardPage />;
    case 'purchaser':
      return <PurchaserDashboardPage />;
    case 'admin': {
      const data = {
        labels: ['Users', 'Products'],
        datasets: [
          {
            label: 'Total Count',
            data: [userCount, productCount],
            backgroundColor: ['#3f51b5', '#fa8c16'],
            borderRadius: 6,
          },
        ],
      };

      const options = {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      };

      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <Title level={3}>Admin Dashboard</Title>
          <Card style={{ width: '100%', maxWidth: 500, padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <Bar data={data} options={options} />
          </Card>
        </motion.div>
      );
    }
    default:
      return (
        <div>
          <h2>Dashboard</h2>
          <p>Welcome to SourceHub.</p>
        </div>
      );
  }
};

export default DashboardPage;
