import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  Download, FileSpreadsheet, TrendingUp, Users, Package, 
  DollarSign, BarChart3, PieChart, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsAnalytics = () => {
  const [activeTab, setActiveTab] = useState('supplier-summary');
  const [supplierSummary, setSupplierSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'supplier-summary') {
        const response = await axios.get(`${API}/reports/supplier-wise-summary`);
        setSupplierSummary(response.data);
      } else if (activeTab === 'analytics') {
        const response = await axios.get(`${API}/reports/analytics`);
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSupplierSummary = async () => {
    try {
      toast.info('Generating Excel export...');
      const response = await axios.get(`${API}/reports/supplier-wise-summary/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supplier_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const formatCurrency = (value, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const renderSupplierSummary = () => {
    if (!supplierSummary) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Suppliers</p>
                  <p className="text-2xl font-bold text-blue-900">{supplierSummary.totals?.total_suppliers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Pending Value</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatCurrency(supplierSummary.totals?.total_pending_value)}</p>
                </div>
                <Package className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Shipped Value</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(supplierSummary.totals?.total_shipped_value)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Balance Due</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(supplierSummary.totals?.total_balance_due)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Table - Excel-like View */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Supplier-wise PO Summary
            </CardTitle>
            <Button onClick={handleExportSupplierSummary} variant="outline" data-testid="export-supplier-summary-btn">
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="supplier-summary-table">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-3 text-left font-semibold">Supplier</th>
                    <th className="p-3 text-center font-semibold">Currency</th>
                    <th className="p-3 text-center font-semibold bg-yellow-700">Pending POs</th>
                    <th className="p-3 text-right font-semibold bg-yellow-700">Pending Value</th>
                    <th className="p-3 text-center font-semibold bg-blue-700">Shipped POs</th>
                    <th className="p-3 text-right font-semibold bg-blue-700">Shipped Value</th>
                    <th className="p-3 text-center font-semibold bg-green-700">Delivered POs</th>
                    <th className="p-3 text-right font-semibold bg-green-700">Delivered Value</th>
                    <th className="p-3 text-right font-semibold">Total Paid</th>
                    <th className="p-3 text-right font-semibold bg-red-700">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierSummary.suppliers?.map((supplier, idx) => (
                    <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`}>
                      <td className="p-3">
                        <div className="font-medium">{supplier.supplier_name}</div>
                        <div className="text-xs text-gray-500">{supplier.supplier_code}</div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">{supplier.currency}</Badge>
                      </td>
                      <td className="p-3 text-center bg-yellow-50 font-medium">{supplier.pending_pos}</td>
                      <td className="p-3 text-right bg-yellow-50 font-medium text-yellow-700">
                        {formatCurrency(supplier.pending_value, supplier.currency)}
                      </td>
                      <td className="p-3 text-center bg-blue-50 font-medium">{supplier.shipped_pos}</td>
                      <td className="p-3 text-right bg-blue-50 font-medium text-blue-700">
                        {formatCurrency(supplier.shipped_value, supplier.currency)}
                      </td>
                      <td className="p-3 text-center bg-green-50 font-medium">{supplier.delivered_pos}</td>
                      <td className="p-3 text-right bg-green-50 font-medium text-green-700">
                        {formatCurrency(supplier.delivered_value, supplier.currency)}
                      </td>
                      <td className="p-3 text-right font-medium text-gray-700">
                        {formatCurrency(supplier.total_paid, supplier.currency)}
                      </td>
                      <td className={`p-3 text-right font-bold ${supplier.balance_due > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {formatCurrency(supplier.balance_due, supplier.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="p-3" colSpan={2}>TOTALS</td>
                    <td className="p-3 text-center">{supplierSummary.suppliers?.reduce((a, b) => a + b.pending_pos, 0)}</td>
                    <td className="p-3 text-right">{formatCurrency(supplierSummary.totals?.total_pending_value)}</td>
                    <td className="p-3 text-center">{supplierSummary.suppliers?.reduce((a, b) => a + b.shipped_pos, 0)}</td>
                    <td className="p-3 text-right">{formatCurrency(supplierSummary.totals?.total_shipped_value)}</td>
                    <td className="p-3 text-center">{supplierSummary.suppliers?.reduce((a, b) => a + b.delivered_pos, 0)}</td>
                    <td className="p-3 text-right">{formatCurrency(supplierSummary.totals?.total_delivered_value)}</td>
                    <td className="p-3 text-right">{formatCurrency(supplierSummary.totals?.total_paid)}</td>
                    <td className="p-3 text-right">{formatCurrency(supplierSummary.totals?.total_balance_due)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardContent className="p-4">
              <p className="text-xs text-indigo-200">Total Orders</p>
              <p className="text-3xl font-bold">{analytics.order_analytics?.total_orders || 0}</p>
              <p className="text-xs text-indigo-200 mt-1">All time</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-200">Total Value</p>
              <p className="text-3xl font-bold">{formatCurrency(analytics.order_analytics?.total_value)}</p>
              <p className="text-xs text-emerald-200 mt-1">Cumulative</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-4">
              <p className="text-xs text-amber-200">Avg Order Value</p>
              <p className="text-3xl font-bold">{formatCurrency(analytics.order_analytics?.avg_order_value)}</p>
              <p className="text-xs text-amber-200 mt-1">Per order</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <CardContent className="p-4">
              <p className="text-xs text-cyan-200">Avg Utilization</p>
              <p className="text-3xl font-bold">{(analytics.order_analytics?.avg_utilization || 0).toFixed(1)}%</p>
              <p className="text-xs text-cyan-200 mt-1">Container fill</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Order Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.status_distribution || {}).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={status === 'Delivered' ? 'default' : status === 'Shipped' ? 'secondary' : 'outline'}>
                        {status}
                      </Badge>
                      <span className="text-sm text-gray-600">{data.count} orders</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(data.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Container Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Container Utilization Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.utilization_analysis || {}).map(([range, count]) => (
                  <div key={range} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium">{range}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full ${
                          range === '76-100%' ? 'bg-green-500' :
                          range === '51-75%' ? 'bg-blue-500' :
                          range === '26-50%' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(count / (analytics.order_analytics?.total_orders || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Currency Exposure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Currency Exposure (Open Orders)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics.currency_exposure || {}).map(([currency, data]) => (
                  <div key={currency} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600">{currency}</Badge>
                      <span className="text-sm text-gray-600">{data.orders} orders</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(data.value, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top Suppliers by Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.top_suppliers?.slice(0, 5).map((supplier, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                        idx === 1 ? 'bg-gray-300 text-gray-700' :
                        idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium">{supplier.supplier_name}</div>
                        <div className="text-xs text-gray-500">{supplier.order_count} orders</div>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">{formatCurrency(supplier.total_value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Monthly Order Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-3 text-left font-semibold">Month</th>
                    <th className="p-3 text-center font-semibold">Orders</th>
                    <th className="p-3 text-right font-semibold">Value</th>
                    <th className="p-3 text-center font-semibold">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.monthly_trends || {}).slice(-12).map(([month, data], idx, arr) => {
                    const prevValue = idx > 0 ? arr[idx - 1][1].value : data.value;
                    const trend = ((data.value - prevValue) / prevValue) * 100;
                    return (
                      <tr key={month} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{month}</td>
                        <td className="p-3 text-center">{data.count}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(data.value)}</td>
                        <td className="p-3 text-center">
                          {idx > 0 && (
                            <span className={`flex items-center justify-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {Math.abs(trend).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading report data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="reports-analytics-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Supplier tracking, KPIs, and business insights</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="supplier-summary" data-testid="tab-supplier-summary">
            <Users className="w-4 h-4 mr-2" />
            Supplier Summary
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supplier-summary">
          {renderSupplierSummary()}
        </TabsContent>

        <TabsContent value="analytics">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsAnalytics;
