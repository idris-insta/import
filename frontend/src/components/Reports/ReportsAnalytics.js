import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { 
  Download, FileSpreadsheet, TrendingUp, Users, Package, Ship,
  DollarSign, BarChart3, Loader2, AlertTriangle, CheckCircle,
  Clock, Calendar, Bell, CreditCard, Truck, Eye, ArrowRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsAnalytics = () => {
  const [activeTab, setActiveTab] = useState('supplier-summary');
  const [supplierSummary, setSupplierSummary] = useState(null);
  const [containerReport, setContainerReport] = useState(null);
  const [paymentsReport, setPaymentsReport] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [supplierLedger, setSupplierLedger] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
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
      } else if (activeTab === 'container-wise') {
        const response = await axios.get(`${API}/reports/container-wise`);
        setContainerReport(response.data);
      } else if (activeTab === 'payments') {
        const response = await axios.get(`${API}/reports/payments-summary`);
        setPaymentsReport(response.data);
      } else if (activeTab === 'notifications') {
        const response = await axios.get(`${API}/reports/notifications`);
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLedger = async (supplierId, supplierName) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reports/supplier-ledger/${supplierId}`);
      setSupplierLedger(response.data);
      setSelectedSupplier(supplierName);
      setLedgerDialogOpen(true);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load supplier ledger');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

        {/* Supplier Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Supplier-wise PO Summary
            </CardTitle>
            <Button onClick={handleExportSupplierSummary} variant="outline" data-testid="export-supplier-summary-btn">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="supplier-summary-table">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-3 text-left font-semibold">Supplier</th>
                    <th className="p-3 text-center font-semibold">Currency</th>
                    <th className="p-3 text-center font-semibold bg-yellow-700">Pending</th>
                    <th className="p-3 text-right font-semibold bg-yellow-700">Value</th>
                    <th className="p-3 text-center font-semibold bg-blue-700">Shipped</th>
                    <th className="p-3 text-right font-semibold bg-blue-700">Value</th>
                    <th className="p-3 text-right font-semibold">Total Paid</th>
                    <th className="p-3 text-right font-semibold bg-red-700">Balance</th>
                    <th className="p-3 text-center font-semibold">Actions</th>
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
                      <td className="p-3 text-right font-medium text-gray-700">
                        {formatCurrency(supplier.total_paid, supplier.currency)}
                      </td>
                      <td className={`p-3 text-right font-bold ${supplier.balance_due > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {formatCurrency(supplier.balance_due, supplier.currency)}
                      </td>
                      <td className="p-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewLedger(supplier.supplier_id, supplier.supplier_name)}
                          data-testid={`view-ledger-${supplier.supplier_code}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ledger
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContainerWise = () => {
    if (!containerReport) return null;

    const { containers, totals } = containerReport;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Pending Containers</p>
                  <p className="text-2xl font-bold text-yellow-900">{totals?.total_pending || 0}</p>
                  <p className="text-xs text-yellow-600">{formatCurrency(totals?.pending_value)}</p>
                </div>
                <Package className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Shipped</p>
                  <p className="text-2xl font-bold text-blue-900">{totals?.total_shipped || 0}</p>
                  <p className="text-xs text-blue-600">{formatCurrency(totals?.shipped_value)}</p>
                </div>
                <Ship className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">In Transit</p>
                  <p className="text-2xl font-bold text-purple-900">{totals?.total_in_transit || 0}</p>
                  <p className="text-xs text-purple-600">{formatCurrency(totals?.in_transit_value)}</p>
                </div>
                <Truck className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Delivered</p>
                  <p className="text-2xl font-bold text-green-900">{totals?.total_delivered || 0}</p>
                  <p className="text-xs text-green-600">{formatCurrency(totals?.delivered_value)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container Type Breakdown */}
        {Object.entries(containers || {}).map(([containerType, data]) => (
          <Card key={containerType}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {containerType} Containers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-yellow-50 rounded-lg text-center">
                  <p className="text-xs text-yellow-600">Pending</p>
                  <p className="text-xl font-bold text-yellow-800">{data.pending?.count || 0}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-blue-600">Shipped</p>
                  <p className="text-xl font-bold text-blue-800">{data.shipped?.count || 0}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <p className="text-xs text-purple-600">In Transit</p>
                  <p className="text-xl font-bold text-purple-800">{data.in_transit?.count || 0}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-green-600">Delivered</p>
                  <p className="text-xl font-bold text-green-800">{data.delivered?.count || 0}</p>
                </div>
              </div>
              
              {/* Orders List */}
              {data.pending?.orders?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Orders</h4>
                  <div className="space-y-2">
                    {data.pending.orders.map((order, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded text-sm">
                        <div>
                          <span className="font-medium">{order.po_number}</span>
                          <span className="text-gray-500 ml-2">• {order.supplier}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{order.status}</Badge>
                          <span className="font-medium">{order.currency} {order.value?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderPayments = () => {
    if (!paymentsReport) return null;

    const { payments_made, payments_due, summary } = paymentsReport;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Total Paid</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(summary?.total_paid, 'INR')}</p>
                  <p className="text-xs text-green-600">{summary?.payments_count} payments</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Total Due</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatCurrency(summary?.total_due)}</p>
                  <p className="text-xs text-yellow-600">{summary?.pending_orders_count} orders</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(summary?.total_overdue)}</p>
                  <p className="text-xs text-red-600">{payments_due?.overdue_count || 0} orders</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Net Position</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(summary?.total_paid - summary?.total_due, 'INR')}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Due Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Payments Due ({payments_due?.total_count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-800 text-white">
                    <th className="p-3 text-left">PO Number</th>
                    <th className="p-3 text-left">Supplier</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Order Value</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center">Due Date</th>
                    <th className="p-3 text-center">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {payments_due?.records?.map((payment, idx) => (
                    <tr key={idx} className={`border-b ${payment.is_overdue ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-3 font-medium">{payment.po_number}</td>
                      <td className="p-3">{payment.supplier_name}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">{payment.status}</Badge>
                      </td>
                      <td className="p-3 text-right">{payment.currency} {payment.order_value?.toLocaleString()}</td>
                      <td className="p-3 text-right text-green-600">{payment.currency} {payment.paid_amount?.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-red-600">{payment.currency} {payment.balance_due?.toLocaleString()}</td>
                      <td className="p-3 text-center text-sm">{formatDate(payment.due_date)}</td>
                      <td className="p-3 text-center">
                        {payment.is_overdue ? (
                          <Badge className="bg-red-500">{payment.days_overdue}d overdue</Badge>
                        ) : (
                          <Badge className="bg-yellow-500">{payment.days_until_due}d left</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!payments_due?.records || payments_due.records.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p>All payments are up to date!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments Made Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Payments Made ({payments_made?.total_count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-800 text-white">
                    <th className="p-3 text-left">Reference</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">PO Number</th>
                    <th className="p-3 text-left">Supplier</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">INR Value</th>
                    <th className="p-3 text-center">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {payments_made?.records?.slice(0, 20).map((payment, idx) => (
                    <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-3 font-medium">{payment.reference || '-'}</td>
                      <td className="p-3">{formatDate(payment.date)}</td>
                      <td className="p-3">{payment.po_number}</td>
                      <td className="p-3">{payment.supplier_name}</td>
                      <td className="p-3 text-right">{payment.currency} {payment.amount?.toLocaleString()}</td>
                      <td className="p-3 text-right font-medium">₹ {payment.inr_amount?.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">{payment.payment_type}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderNotifications = () => {
    if (!notifications) return null;

    const { notifications: alerts, counts } = notifications;

    return (
      <div className="space-y-6">
        {/* Notification Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={`${counts?.critical > 0 ? 'bg-red-100 border-red-300 animate-pulse' : 'bg-gray-100'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Critical</p>
                  <p className="text-3xl font-bold text-red-900">{counts?.critical || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`${counts?.high > 0 ? 'bg-orange-100 border-orange-300' : 'bg-gray-100'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600">High Priority</p>
                  <p className="text-3xl font-bold text-orange-900">{counts?.high || 0}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`${counts?.medium > 0 ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-100'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-yellow-600">Medium</p>
                  <p className="text-3xl font-bold text-yellow-900">{counts?.medium || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Total Alerts</p>
                  <p className="text-3xl font-bold text-blue-900">{counts?.total || 0}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Payment Due Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts?.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      'bg-yellow-50 border-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Due: {formatDate(alert.due_date)}</span>
                          <span>Amount: {alert.currency} {alert.amount?.toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge className={
                        alert.severity === 'critical' ? 'bg-red-500' :
                        alert.severity === 'high' ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-700">All Clear!</h3>
                <p>No payment notifications at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderLedgerDialog = () => (
    <Dialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" data-testid="ledger-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Supplier Ledger - {selectedSupplier}
          </DialogTitle>
        </DialogHeader>
        
        {supplierLedger && (
          <div className="space-y-4">
            {/* Supplier Info */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-blue-50">
                <CardContent className="p-3">
                  <p className="text-xs text-blue-600">Opening Balance</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(supplierLedger.summary?.opening_balance, 'INR')}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="p-3">
                  <p className="text-xs text-yellow-600">Total Orders</p>
                  <p className="text-lg font-bold text-yellow-900">
                    {supplierLedger.summary?.total_orders} ({formatCurrency(supplierLedger.summary?.total_order_value)})
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="p-3">
                  <p className="text-xs text-green-600">Total Paid</p>
                  <p className="text-lg font-bold text-green-900">
                    {formatCurrency(supplierLedger.summary?.total_paid, 'INR')}
                  </p>
                </CardContent>
              </Card>
              <Card className={supplierLedger.summary?.current_balance > 0 ? 'bg-red-50' : 'bg-green-50'}>
                <CardContent className="p-3">
                  <p className={`text-xs ${supplierLedger.summary?.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Current Balance
                  </p>
                  <p className={`text-lg font-bold ${supplierLedger.summary?.current_balance > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {formatCurrency(Math.abs(supplierLedger.summary?.current_balance || 0), 'INR')}
                    {supplierLedger.summary?.current_balance > 0 ? ' (Due)' : ' (Credit)'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Terms */}
            <div className="flex items-center gap-4 p-3 bg-gray-100 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm">
                Payment Terms: <strong>{supplierLedger.supplier?.payment_terms_type} {supplierLedger.supplier?.payment_terms_days} Days</strong>
              </span>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Reference</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right text-red-300">Debit</th>
                    <th className="p-2 text-right text-green-300">Credit</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierLedger.ledger?.map((entry, idx) => (
                    <tr key={idx} className={`border-b ${
                      entry.type === 'payment' ? 'bg-green-50' : 
                      entry.type === 'order' ? 'bg-yellow-50' : 'bg-gray-50'
                    }`}>
                      <td className="p-2 text-xs">{formatDate(entry.date)}</td>
                      <td className="p-2 font-medium">{entry.reference}</td>
                      <td className="p-2 text-xs">{entry.description}</td>
                      <td className="p-2 text-right text-red-600">
                        {entry.debit > 0 ? formatCurrency(entry.debit, 'INR') : '-'}
                      </td>
                      <td className="p-2 text-right text-green-600">
                        {entry.credit > 0 ? formatCurrency(entry.credit, 'INR') : '-'}
                      </td>
                      <td className={`p-2 text-right font-medium ${entry.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {formatCurrency(Math.abs(entry.balance), 'INR')}
                        {entry.balance > 0 ? ' Dr' : ' Cr'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (loading && !supplierSummary && !containerReport && !paymentsReport && !notifications) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="reports-analytics-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">Comprehensive supplier-wise and container-wise reports</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="supplier-summary" data-testid="tab-supplier-summary">
            <Users className="w-4 h-4 mr-2" />
            Supplier-wise
          </TabsTrigger>
          <TabsTrigger value="container-wise" data-testid="tab-container-wise">
            <Package className="w-4 h-4 mr-2" />
            Container-wise
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
            {notifications?.counts?.critical > 0 && (
              <Badge className="ml-2 bg-red-500 animate-pulse">{notifications.counts.critical}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supplier-summary" className="mt-6">
          {renderSupplierSummary()}
        </TabsContent>

        <TabsContent value="container-wise" className="mt-6">
          {renderContainerWise()}
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          {renderPayments()}
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          {renderNotifications()}
        </TabsContent>
      </Tabs>

      {renderLedgerDialog()}
    </div>
  );
};

export default ReportsAnalytics;
