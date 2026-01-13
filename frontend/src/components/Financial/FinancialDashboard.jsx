import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  DollarSign, TrendingUp, ArrowUpDown, CreditCard, Calendar,
  Plus, RefreshCw, AlertTriangle, CheckCircle, Globe, Edit, Trash2
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FinancialDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [financial, setFinancial] = useState(null);
  const [fxRates, setFxRates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [paymentForm, setPaymentForm] = useState({
    import_order_id: '',
    amount: '',
    currency: 'USD',
    payment_date: new Date().toISOString().split('T')[0],
    reference: ''
  });

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const [financialRes, fxRes, paymentsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/dashboard/financial-overview`),
        axios.get(`${API}/fx-rates`),
        axios.get(`${API}/payments`),
        axios.get(`${API}/import-orders`)
      ]);
      
      setFinancial(financialRes.data);
      setFxRates(fxRes.data);
      setPayments(paymentsRes.data);
      setOrders(ordersRes.data.filter(order => ['Draft', 'Tentative', 'Confirmed', 'Loaded', 'Shipped', 'In Transit', 'Arrived', 'Delivered'].includes(order.status)));
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      if (error.response?.status === 403) {
        toast.error('Insufficient permissions to view financial data');
      } else {
        toast.error('Failed to load financial data');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshFxRates = async () => {
    try {
      await axios.post(`${API}/fx-rates/refresh`);
      await fetchFinancialData();
      toast.success('FX rates updated successfully');
    } catch (error) {
      toast.error('Failed to update FX rates');
    }
  };

  const resetForm = () => {
    setPaymentForm({
      import_order_id: '',
      amount: '',
      currency: 'USD',
      payment_date: new Date().toISOString().split('T')[0],
      reference: ''
    });
    setEditingPayment(null);
  };

  const createPayment = async () => {
    try {
      const paymentData = {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        payment_date: new Date(paymentForm.payment_date).toISOString()
      };
      
      if (editingPayment) {
        await axios.put(`${API}/payments/${editingPayment.id}`, paymentData);
        toast.success('Payment updated successfully');
      } else {
        await axios.post(`${API}/payments`, paymentData);
        toast.success('Payment recorded successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      await fetchFinancialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save payment');
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      import_order_id: payment.import_order_id,
      amount: payment.amount?.toString() || '',
      currency: payment.currency || 'USD',
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
      reference: payment.reference || ''
    });
    setDialogOpen(true);
  };

  const handleDeletePayment = async (paymentId, reference) => {
    if (!window.confirm(`Are you sure you want to delete payment "${reference}"?`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      await fetchFinancialData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return `${currency} ${Number(amount).toLocaleString()}`;
    }
  };

  const getLatestFxRate = (currency) => {
    const rate = fxRates.find(r => r.from_currency === currency && r.to_currency === 'INR');
    return rate ? rate.rate : 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-600">Loading financial data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="financial-dashboard-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Multi-currency payments and FX management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={refreshFxRates} variant="outline" data-testid="refresh-fx-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Update FX Rates
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button data-testid="record-payment-btn" onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="payment-dialog">
              <DialogHeader>
                <DialogTitle>{editingPayment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
                <DialogDescription>{editingPayment ? 'Update payment details' : 'Record a payment made to supplier'}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="import_order_id" className="text-right">Order</Label>
                  <Select 
                    value={paymentForm.import_order_id} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, import_order_id: value})}
                  >
                    <SelectTrigger className="col-span-3" data-testid="payment-order-select">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.po_number} - {formatCurrency(order.total_value, order.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="col-span-3"
                    data-testid="payment-amount-input"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currency" className="text-right">Currency</Label>
                  <Select 
                    value={paymentForm.currency} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, currency: value})}
                  >
                    <SelectTrigger className="col-span-3" data-testid="payment-currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="payment_date" className="text-right">Date</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                    className="col-span-3"
                    data-testid="payment-date-input"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reference" className="text-right">Reference</Label>
                  <Input
                    id="reference"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                    className="col-span-3"
                    placeholder="Payment reference/transaction ID"
                    data-testid="payment-reference-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
                <Button onClick={createPayment} data-testid="save-payment-btn">
                  {editingPayment ? 'Update Payment' : 'Record Payment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-financial-overview">Overview</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="fx-rates" data-testid="tab-fx-rates">FX Rates</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-financial-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-hover stat-card green">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-2">Total Paid</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(financial?.payment_summary?.total_paid || 0, 'INR')}
                    </p>
                    <p className="text-white/70 text-xs mt-1">{financial?.payment_summary?.payment_count || 0} payments</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-hover stat-card orange">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-2">Balance Due</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(financial?.payment_summary?.balance_due || 0, 'INR')}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-hover stat-card blue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-2">Order Value</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(financial?.payment_summary?.total_order_value || 0, 'INR')}
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-hover stat-card purple">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-2">FX Currencies</p>
                    <p className="text-2xl font-bold text-white">
                      {Object.keys(financial?.fx_exposure || {}).length}
                    </p>
                    <p className="text-white/70 text-xs mt-1">Active currencies</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Balances */}
          <Card className="card-hover" data-testid="supplier-balances-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Supplier Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="p-3 text-left font-medium">Supplier</th>
                      <th className="p-3 text-center font-medium">Orders</th>
                      <th className="p-3 text-right font-medium">Total Value</th>
                      <th className="p-3 text-right font-medium">Paid</th>
                      <th className="p-3 text-right font-medium">Balance</th>
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
                          {formatCurrency(Math.abs(supplier.balance || 0), supplier.currency)}
                          {supplier.balance > 0 ? ' Due' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!financial?.supplier_balances || financial.supplier_balances.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p>No supplier balances</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card data-testid="payments-table-card">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 font-medium">Reference</th>
                      <th className="text-left p-3 font-medium">Order</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-right p-3 font-medium">FX Rate</th>
                      <th className="text-right p-3 font-medium">INR Amount</th>
                      <th className="text-center p-3 font-medium">Date</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const order = orders.find(o => o.id === payment.import_order_id);
                      return (
                        <tr key={payment.id} className="border-b hover:bg-slate-50" data-testid={`payment-row-${payment.reference}`}>
                          <td className="p-3 font-medium">{payment.reference || '-'}</td>
                          <td className="p-3">{order?.po_number || 'N/A'}</td>
                          <td className="p-3 text-right">
                            {formatCurrency(payment.amount || 0, payment.currency || 'USD')}
                          </td>
                          <td className="p-3 text-right text-sm text-gray-600">
                            {(payment.fx_rate || 0).toFixed(4)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(payment.inr_amount || 0, 'INR')}
                          </td>
                          <td className="p-3 text-center">
                            {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleEditPayment(payment)}
                                title="Edit Payment"
                                data-testid={`edit-payment-${payment.reference}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeletePayment(payment.id, payment.reference)}
                                title="Delete Payment"
                                data-testid={`delete-payment-${payment.reference}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="text-center py-8" data-testid="no-payments-message">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No payments recorded yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fx-rates" className="space-y-6">
          <Card data-testid="fx-rates-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-blue-600" />
                Current FX Rates (to INR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fxRates.map((rate) => (
                  <div 
                    key={`${rate.from_currency}-${rate.to_currency}`} 
                    className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50"
                    data-testid={`fx-rate-${rate.from_currency}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {rate.from_currency}/INR
                      </h3>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">
                        ₹{(rate.rate || 0).toFixed(4)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Last updated: {rate.date ? new Date(rate.date).toLocaleString() : '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Source: {rate.source || 'Manual'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {fxRates.length === 0 && (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No FX rates available. Click &quot;Update FX Rates&quot; to fetch latest rates.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-hover" data-testid="fx-impact-card">
              <CardHeader>
                <CardTitle>FX Exposure by Currency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(financial?.fx_exposure || {}).map(([currency, data]) => {
                    const currentRate = getLatestFxRate(currency);
                    const inrValue = (data.value || 0) * currentRate;
                    return (
                      <div key={currency} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{currency}</h4>
                          <Badge variant="outline">{data.orders || 0} orders</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Original Value</p>
                            <p className="font-medium">{formatCurrency(data.value || 0, currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">INR Value</p>
                            <p className="font-medium">{formatCurrency(inrValue, 'INR')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(financial?.fx_exposure || {}).length === 0 && (
                    <div className="text-center py-4 text-gray-500">No FX exposure data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Payment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">Total Paid</span>
                      <span className="text-green-800 font-bold">{formatCurrency(financial?.payment_summary?.total_paid || 0, 'INR')}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-red-700 font-medium">Outstanding</span>
                      <span className="text-red-800 font-bold">{formatCurrency(financial?.payment_summary?.balance_due || 0, 'INR')}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Total Orders Value</span>
                      <span className="text-blue-800 font-bold">{formatCurrency(financial?.payment_summary?.total_order_value || 0, 'INR')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
