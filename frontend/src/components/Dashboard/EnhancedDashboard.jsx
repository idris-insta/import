import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { 
  BarChart3, Package, Users, Ship, AlertCircle, TrendingUp, DollarSign,
  Clock, AlertTriangle, CheckCircle, ArrowUpDown, Globe, Truck, Calendar,
  PieChart, LineChart, Target, Zap
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [logistics, setLogistics] = useState(null);
  const [variance, setVariance] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, financialRes, logisticsRes, varianceRes, cashFlowRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/financial-overview`),
        axios.get(`${API}/dashboard/logistics-overview`),
        axios.get(`${API}/dashboard/variance-analysis`),
        axios.get(`${API}/dashboard/cash-flow-forecast`)
      ]);
      
      setStats(statsRes.data);
      setFinancial(financialRes.data);
      setLogistics(logisticsRes.data);
      setVariance(varianceRes.data);
      setCashFlow(cashFlowRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (error.response?.status === 403) {
        toast.error('Insufficient permissions to view dashboard');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Tentative': 'bg-blue-100 text-blue-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Loaded': 'bg-purple-100 text-purple-800',
      'Shipped': 'bg-orange-100 text-orange-800',
      'In Transit': 'bg-yellow-100 text-yellow-800',
      'Arrived': 'bg-red-100 text-red-800',
      'Customs Clearance': 'bg-pink-100 text-pink-800',
      'Cleared': 'bg-emerald-100 text-emerald-800',
      'Delivered': 'bg-green-200 text-green-900'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const KPICard = ({ title, value, icon: Icon, color, trend, description, testId }) => (
    <Card className={`card-hover ${color}`} data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium mb-2">{title}</p>
            <p className="text-3xl font-bold text-white" data-testid={`${testId}-value`}>{value}</p>
            {description && <p className="text-white/70 text-xs mt-1">{description}</p>}
          </div>
          <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-3 text-white/80 text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 fade-in-up" data-testid="enhanced-dashboard-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ICMS Intelligence Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive view of your import and container operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={refreshData} 
            variant="outline" 
            disabled={refreshing}
            data-testid="refresh-dashboard-btn"
          >
            <Zap className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4" />
            <span>Real-time data</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">Financial</TabsTrigger>
          <TabsTrigger value="logistics" data-testid="tab-logistics">Logistics</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total Orders"
              value={stats?.total_orders || 0}
              icon={Package}
              color="stat-card blue"
              testId="kpi-total-orders"
            />
            <KPICard
              title="Pipeline Value"
              value={formatCurrency(stats?.pipeline_value || 0)}
              icon={DollarSign}
              color="stat-card green"
              description="Orders in progress"
              testId="kpi-pipeline-value"
            />
            <KPICard
              title="Container Utilization"
              value={`${(stats?.utilization_stats?.avg_utilization || 0).toFixed(1)}%`}
              icon={Target}
              color="stat-card orange"
              testId="kpi-utilization"
            />
            <KPICard
              title="Active Suppliers"
              value={stats?.total_suppliers || 0}
              icon={Users}
              color="stat-card purple"
              testId="kpi-suppliers"
            />
          </div>

          {/* Orders by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-hover" data-testid="orders-by-status-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Orders by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.orders_by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge className={getStatusColor(status)}>{status}</Badge>
                      <span className="font-medium">{count} orders</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover" data-testid="utilization-breakdown-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Container Utilization Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Under-utilized (&lt;70%)</span>
                    <span className="text-red-600 font-medium">
                      {stats?.utilization_stats?.underutilized || 0} containers
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Optimal (70-90%)</span>
                    <span className="text-green-600 font-medium">
                      {stats?.utilization_stats?.optimal || 0} containers
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Over-utilized (&gt;90%)</span>
                    <span className="text-orange-600 font-medium">
                      {stats?.utilization_stats?.overutilized || 0} containers
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card className="card-hover" data-testid="recent-orders-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recent_orders?.map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{order.po_number}</span>
                      <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <span className="font-medium text-green-600">
                      {formatCurrency(order.total_value)}
                    </span>
                  </div>
                )) || (
                  <div className="text-center py-4 text-gray-500">
                    No recent orders
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Value in Transit"
              value={Object.values(financial?.value_in_transit || {}).reduce((a, b) => a + (b?.value || 0), 0).toLocaleString()}
              icon={Globe}
              color="stat-card blue"
              description={`${Object.values(financial?.value_in_transit || {}).reduce((a, b) => a + (b?.count || 0), 0)} orders`}
              testId="kpi-transit-value"
            />
            <KPICard
              title="Total Paid"
              value={formatCurrency(financial?.payment_summary?.total_paid || 0, 'INR')}
              icon={CheckCircle}
              color="stat-card green"
              description={`${financial?.payment_summary?.payment_count || 0} payments`}
              testId="kpi-total-paid"
            />
            <KPICard
              title="Balance Due"
              value={formatCurrency(financial?.payment_summary?.balance_due || 0, 'USD')}
              icon={Clock}
              color="stat-card orange"
              testId="kpi-balance-due"
            />
            <KPICard
              title="FX Exposure"
              value={Object.keys(financial?.fx_exposure || {}).length}
              icon={ArrowUpDown}
              color="stat-card purple"
              description="Currencies"
              testId="kpi-fx-exposure"
            />
          </div>

          {/* Currency Exposure */}
          <Card className="card-hover" data-testid="currency-exposure-card">
            <CardHeader>
              <CardTitle>Currency Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(financial?.fx_exposure || {}).map(([currency, data]) => (
                  <div key={currency} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-lg mb-2">{currency}</h4>
                    <p className="text-2xl font-bold text-blue-600 mb-1">
                      {formatCurrency(data?.value || 0, currency)}
                    </p>
                    <p className="text-sm text-gray-600">{data?.orders || 0} orders</p>
                  </div>
                ))}
                {Object.keys(financial?.fx_exposure || {}).length === 0 && (
                  <div className="col-span-3 text-center py-4 text-gray-500">No active currency exposure</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Supplier Balances */}
          <Card className="card-hover" data-testid="supplier-balances-card">
            <CardHeader>
              <CardTitle>Supplier Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3 text-left">Supplier</th>
                      <th className="p-3 text-center">Orders</th>
                      <th className="p-3 text-right">Total Value</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financial?.supplier_balances?.map((supplier, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{supplier.supplier_name}</td>
                        <td className="p-3 text-center">{supplier.total_orders}</td>
                        <td className="p-3 text-right">{formatCurrency(supplier.total_value, supplier.currency)}</td>
                        <td className="p-3 text-right text-green-600">{formatCurrency(supplier.total_paid, 'INR')}</td>
                        <td className={`p-3 text-right font-medium ${supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(supplier.balance, supplier.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!financial?.supplier_balances || financial.supplier_balances.length === 0) && (
                  <div className="text-center py-4 text-gray-500">No supplier balance data</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Forecast */}
          <Card className="card-hover" data-testid="cash-flow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                30-Day Cash Flow Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Duty Payments Due</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {cashFlow?.duty_forecasts?.length || 0} orders
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">Demurrage Exposure</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {cashFlow?.demurrage_costs?.length || 0} containers
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          {/* Logistics KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard
              title="Containers in Transit"
              value={Object.values(logistics?.container_utilization || {}).reduce((a, b) => a + (b?.count || 0), 0)}
              icon={Ship}
              color="stat-card blue"
              testId="kpi-containers-transit"
            />
            <KPICard
              title="Arriving Soon"
              value={logistics?.arriving_soon?.length || 0}
              icon={Clock}
              color="stat-card orange"
              description="Next 7 days"
              testId="kpi-arriving-soon"
            />
            <KPICard
              title="Demurrage Alerts"
              value={logistics?.demurrage_alerts?.length || 0}
              icon={AlertTriangle}
              color="stat-card purple"
              testId="kpi-demurrage-alerts"
            />
          </div>

          {/* Container Performance */}
          <Card className="card-hover" data-testid="container-performance-card">
            <CardHeader>
              <CardTitle>Container Type Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(logistics?.container_utilization || {}).map(([type, data]) => (
                  <div key={type} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{type} Containers</h4>
                      <Badge variant="outline">{data?.count || 0} orders</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Utilization</span>
                        <span className="font-medium">{(data?.avg_utilization || 0).toFixed(1)}%</span>
                      </div>
                      <Progress value={data?.avg_utilization || 0} className="h-2" />
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <span>Total Weight: {(data?.total_weight || 0).toFixed(0)}kg</span>
                        <span>Total CBM: {(data?.total_cbm || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Arriving Soon */}
          <Card className="card-hover" data-testid="arriving-soon-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                Orders Arriving Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logistics?.arriving_soon?.map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <span className="font-medium">{order.po_number}</span>
                      <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">ETA</div>
                      <div className="font-medium">
                        {new Date(order.eta).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4 text-gray-500">
                    No orders arriving soon
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Variance Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-hover" data-testid="variance-summary-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5 text-purple-600" />
                  Variance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {variance?.summary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {variance.summary.positive_variances || 0}
                        </p>
                        <p className="text-sm text-green-700">Positive Variances</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
                          {variance.summary.negative_variances || 0}
                        </p>
                        <p className="text-sm text-red-700">Negative Variances</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Quantity Variance</span>
                        <span className="font-medium">
                          {(variance.summary.avg_qty_variance || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Weight Variance</span>
                        <span className="font-medium">
                          {(variance.summary.avg_weight_variance || 0).toFixed(1)}kg
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No variance data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-hover" data-testid="top-variances-card">
              <CardHeader>
                <CardTitle>Top SKUs with Variances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {variance?.top_sku_variances?.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="text-sm font-medium">SKU: {item._id}</div>
                      <div className={`text-sm font-medium ${
                        item.total_variance_qty > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.total_variance_qty > 0 ? '+' : ''}{item.total_variance_qty}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No variance data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Critical Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-hover border-red-200" data-testid="critical-alerts-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logistics?.demurrage_alerts?.map((alert, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-900">{alert.po_number}</span>
                        <Badge className="bg-red-100 text-red-800">Demurrage</Badge>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        Started: {new Date(alert.demurrage_start).toLocaleDateString()}
                      </p>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      No critical alerts
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-yellow-200" data-testid="upcoming-alerts-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Clock className="w-5 h-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logistics?.arriving_soon?.map((event, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-yellow-900">{event.po_number}</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Arriving</Badge>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        ETA: {new Date(event.eta).toLocaleDateString()}
                      </p>
                    </div>
                  )) || (
                    <div className="text-center py-4 text-gray-500">
                      No upcoming events
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedDashboard;