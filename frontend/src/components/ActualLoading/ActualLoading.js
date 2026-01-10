import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Plus, TruckIcon, AlertTriangle, CheckCircle, Eye, Loader2, ArrowUpDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ActualLoading = () => {
  const [loadings, setLoadings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLoading, setSelectedLoading] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [loadingForm, setLoadingForm] = useState({
    import_order_id: '',
    items: []
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [loadingsRes, ordersRes, skusRes] = await Promise.all([
        axios.get(`${API}/actual-loadings`),
        axios.get(`${API}/import-orders`),
        axios.get(`${API}/skus`)
      ]);
      
      setLoadings(loadingsRes.data);
      setOrders(ordersRes.data.filter(order => ['Draft', 'Tentative', 'Confirmed', 'Loaded', 'Shipped'].includes(order.status)));
      setSkus(skusRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = async (orderId) => {
    try {
      const response = await axios.get(`${API}/import-orders/${orderId}`);
      const order = response.data;
      
      const items = order.items.map(item => {
        const sku = skus.find(s => s.id === item.sku_id);
        return {
          sku_id: item.sku_id,
          planned_quantity: item.quantity,
          actual_quantity: item.quantity, // Default to planned
          variance_quantity: 0,
          planned_weight: sku ? sku.weight_per_unit * item.quantity : 0,
          actual_weight: sku ? sku.weight_per_unit * item.quantity : 0, // Default to planned
          variance_weight: 0,
          planned_value: item.total_value,
          actual_value: item.total_value, // Default to planned
          variance_value: 0
        };
      });
      
      setLoadingForm({
        import_order_id: orderId,
        items: items
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...loadingForm.items];
    const item = updatedItems[index];
    const sku = skus.find(s => s.id === item.sku_id);
    
    if (field === 'actual_quantity') {
      const actualQty = parseInt(value) || 0;
      item.actual_quantity = actualQty;
      item.variance_quantity = actualQty - item.planned_quantity;
      
      if (sku) {
        item.actual_weight = sku.weight_per_unit * actualQty;
        item.variance_weight = item.actual_weight - item.planned_weight;
        
        const unitPrice = item.planned_value / item.planned_quantity;
        item.actual_value = unitPrice * actualQty;
        item.variance_value = item.actual_value - item.planned_value;
      }
    } else if (field === 'actual_weight') {
      item.actual_weight = parseFloat(value) || 0;
      item.variance_weight = item.actual_weight - item.planned_weight;
    } else if (field === 'actual_value') {
      item.actual_value = parseFloat(value) || 0;
      item.variance_value = item.actual_value - item.planned_value;
    }
    
    setLoadingForm({ ...loadingForm, items: updatedItems });
  };

  const handleCreateLoading = async () => {
    if (!loadingForm.import_order_id || loadingForm.items.length === 0) {
      toast.error('Please select an order and ensure items are loaded');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/actual-loadings`, loadingForm);
      setLoadings([...loadings, response.data]);
      setLoadingForm({
        import_order_id: '',
        items: []
      });
      setDialogOpen(false);
      toast.success('Actual loading recorded successfully');
      fetchAllData(); // Refresh data
    } catch (error) {
      console.error('Error creating loading:', error);
      toast.error(error.response?.data?.detail || 'Failed to record actual loading');
    }
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getVarianceIcon = (variance) => {
    if (variance > 0) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (variance < 0) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    return <ArrowUpDown className="w-4 h-4 text-gray-600" />;
  };

  const handleViewLoading = async (loadingId) => {
    const loadingData = loadings.find(l => l.id === loadingId);
    setSelectedLoading(loadingData);
    setViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading actual loading data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="actual-loading-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Actual Loading</h1>
          <p className="text-gray-600 mt-1">Record actual quantities vs planned and track variances</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="record-loading-btn">
              <Plus className="w-4 h-4 mr-2" />
              Record Loading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto" data-testid="loading-dialog">
            <DialogHeader>
              <DialogTitle>Record Actual Loading</DialogTitle>
              <DialogDescription>Enter actual quantities loaded vs planned quantities</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Order Selection */}
              <div className="space-y-2">
                <Label htmlFor="import_order_id">Select Import Order</Label>
                <Select 
                  value={loadingForm.import_order_id} 
                  onValueChange={handleOrderSelect}
                >
                  <SelectTrigger data-testid="order-select">
                    <SelectValue placeholder="Select an order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.po_number} - {order.container_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Items Table */}
              {loadingForm.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Order Items - Enter Actual Quantities</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium">SKU</th>
                          <th className="text-left p-3 font-medium">Planned Qty</th>
                          <th className="text-left p-3 font-medium">Actual Qty</th>
                          <th className="text-left p-3 font-medium">Variance</th>
                          <th className="text-left p-3 font-medium">Planned Weight</th>
                          <th className="text-left p-3 font-medium">Actual Weight</th>
                          <th className="text-left p-3 font-medium">Weight Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingForm.items.map((item, index) => {
                          const sku = skus.find(s => s.id === item.sku_id);
                          return (
                            <tr key={index} className="border-b">
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{sku?.sku_code}</div>
                                  <div className="text-sm text-gray-600">{sku?.description}</div>
                                </div>
                              </td>
                              <td className="p-3">{item.planned_quantity}</td>
                              <td className="p-3">
                                <Input
                                  type="number"
                                  value={item.actual_quantity}
                                  onChange={(e) => handleItemChange(index, 'actual_quantity', e.target.value)}
                                  className="w-20"
                                  data-testid={`actual-qty-${index}`}
                                />
                              </td>
                              <td className={`p-3 font-medium ${getVarianceColor(item.variance_quantity)}`}>
                                <div className="flex items-center gap-1">
                                  {getVarianceIcon(item.variance_quantity)}
                                  {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity}
                                </div>
                              </td>
                              <td className="p-3">{item.planned_weight.toFixed(2)} KG</td>
                              <td className="p-3">{item.actual_weight.toFixed(2)} KG</td>
                              <td className={`p-3 font-medium ${getVarianceColor(item.variance_weight)}`}>
                                <div className="flex items-center gap-1">
                                  {getVarianceIcon(item.variance_weight)}
                                  {item.variance_weight > 0 ? '+' : ''}{item.variance_weight.toFixed(2)} KG
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateLoading} 
                disabled={!loadingForm.import_order_id || loadingForm.items.length === 0}
                data-testid="save-loading-btn"
              >
                Save Actual Loading
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loadings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            Actual Loading Records ({loadings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Order</th>
                  <th className="text-left p-3 font-medium">Planned Qty</th>
                  <th className="text-left p-3 font-medium">Actual Qty</th>
                  <th className="text-left p-3 font-medium">Qty Variance</th>
                  <th className="text-left p-3 font-medium">Weight Variance</th>
                  <th className="text-left p-3 font-medium">Value Variance</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadings.map((loading) => {
                  const order = orders.find(o => o.id === loading.import_order_id) || 
                                orders.find(o => o.id === loading.import_order_id);
                  return (
                    <tr key={loading.id} className="table-row border-b" data-testid={`loading-row-${loading.id}`}>
                      <td className="p-3 font-medium">
                        {order ? order.po_number : 'N/A'}
                      </td>
                      <td className="p-3">{loading.total_planned_quantity}</td>
                      <td className="p-3">{loading.total_actual_quantity}</td>
                      <td className={`p-3 font-medium ${getVarianceColor(loading.total_variance_quantity)}`}>
                        <div className="flex items-center gap-1">
                          {getVarianceIcon(loading.total_variance_quantity)}
                          {loading.total_variance_quantity > 0 ? '+' : ''}{loading.total_variance_quantity}
                        </div>
                      </td>
                      <td className={`p-3 font-medium ${getVarianceColor(loading.total_variance_weight)}`}>
                        <div className="flex items-center gap-1">
                          {getVarianceIcon(loading.total_variance_weight)}
                          {loading.total_variance_weight > 0 ? '+' : ''}{loading.total_variance_weight.toFixed(2)} KG
                        </div>
                      </td>
                      <td className={`p-3 font-medium ${getVarianceColor(loading.total_variance_value)}`}>
                        <div className="flex items-center gap-1">
                          {getVarianceIcon(loading.total_variance_value)}
                          {loading.total_variance_value > 0 ? '+' : ''}{loading.total_variance_value.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={loading.is_locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {loading.is_locked ? 'Locked' : 'Active'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLoading(loading.id)}
                          data-testid={`view-loading-${loading.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loadings.length === 0 && (
              <div className="text-center py-8" data-testid="no-loadings-message">
                <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No loading records found. Record your first actual loading to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Loading Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto" data-testid="view-loading-dialog">
          <DialogHeader>
            <DialogTitle>Loading Details</DialogTitle>
          </DialogHeader>
          {selectedLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedLoading.total_planned_quantity}</p>
                      <p className="text-sm text-gray-600">Planned Quantity</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{selectedLoading.total_actual_quantity}</p>
                      <p className="text-sm text-gray-600">Actual Quantity</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${getVarianceColor(selectedLoading.total_variance_quantity)}`}>
                        {selectedLoading.total_variance_quantity > 0 ? '+' : ''}{selectedLoading.total_variance_quantity}
                      </p>
                      <p className="text-sm text-gray-600">Quantity Variance</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Item-wise Details</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-medium">SKU</th>
                        <th className="text-left p-3 font-medium">Planned</th>
                        <th className="text-left p-3 font-medium">Actual</th>
                        <th className="text-left p-3 font-medium">Qty Variance</th>
                        <th className="text-left p-3 font-medium">Weight Variance</th>
                        <th className="text-left p-3 font-medium">Value Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLoading.items.map((item, index) => {
                        const sku = skus.find(s => s.id === item.sku_id);
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{sku?.sku_code}</div>
                                <div className="text-sm text-gray-600">{sku?.description}</div>
                              </div>
                            </td>
                            <td className="p-3">{item.planned_quantity}</td>
                            <td className="p-3">{item.actual_quantity}</td>
                            <td className={`p-3 font-medium ${getVarianceColor(item.variance_quantity)}`}>
                              <div className="flex items-center gap-1">
                                {getVarianceIcon(item.variance_quantity)}
                                {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity}
                              </div>
                            </td>
                            <td className={`p-3 font-medium ${getVarianceColor(item.variance_weight)}`}>
                              {item.variance_weight > 0 ? '+' : ''}{item.variance_weight.toFixed(2)} KG
                            </td>
                            <td className={`p-3 font-medium ${getVarianceColor(item.variance_value)}`}>
                              {item.variance_value > 0 ? '+' : ''}{item.variance_value.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActualLoading;