import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart3, Package, Users, Ship, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    total_suppliers: 0,
    total_skus: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.total_orders,
      icon: Package,
      color: 'blue',
      testId: 'stat-total-orders'
    },
    {
      title: 'Pending Orders',
      value: stats.pending_orders,
      icon: AlertCircle,
      color: 'orange',
      testId: 'stat-pending-orders'
    },
    {
      title: 'Suppliers',
      value: stats.total_suppliers,
      icon: Users,
      color: 'green',
      testId: 'stat-suppliers'
    },
    {
      title: 'SKUs',
      value: stats.total_skus,
      icon: BarChart3,
      color: 'purple',
      testId: 'stat-skus'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="dashboard-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your import and container operations</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <TrendingUp className="w-4 h-4" />
          <span>Real-time data</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={`card-hover slide-in-right stat-card ${card.color}`}
              style={{ animationDelay: `${index * 100}ms` }}
              data-testid={card.testId}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-2">{card.title}</p>
                    <p className="text-3xl font-bold text-white" data-testid={`${card.testId}-value`}>
                      {card.value}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-hover" data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" data-testid="action-create-order">
                <h4 className="font-medium text-gray-900">Create Import Order</h4>
                <p className="text-sm text-gray-600">Start a new purchase order with container planning</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" data-testid="action-add-sku">
                <h4 className="font-medium text-gray-900">Add New SKU</h4>
                <p className="text-sm text-gray-600">Register a new product in the system</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" data-testid="action-actual-loading">
                <h4 className="font-medium text-gray-900">Record Actual Loading</h4>
                <p className="text-sm text-gray-600">Update actual quantities vs planned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover" data-testid="system-status-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-green-600" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Database</h4>
                  <p className="text-sm text-gray-600">MongoDB connection active</p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">API Services</h4>
                  <p className="text-sm text-gray-600">All endpoints responding</p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Data Sync</h4>
                  <p className="text-sm text-gray-600">Real-time updates enabled</p>
                </div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Placeholder */}
      <Card className="card-hover" data-testid="recent-activity-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
            <p className="text-gray-600">Start by creating your first import order or adding master data</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;