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
import { Plus, Package, AlertTriangle, CheckCircle, Clock, Eye, Loader2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImportOrders = () => {
  const [orders, setOrders] = useState([]);
  const [skus, setSkus] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [orderForm, setOrderForm] = useState({
    po_number: '',
    supplier_id: '',
    container_type: '',
    currency: 'USD',
    items: []
  });
  
  const [currentItem, setCurrentItem] = useState({
    sku_id: '',
    quantity: '',
    unit_price: '',
    total_value: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, skusRes, suppliersRes, containersRes] = await Promise.all([
        axios.get(`${API}/import-orders`),
        axios.get(`${API}/skus`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/containers`)
      ]);
      
      setOrders(ordersRes.data);
      setSkus(skusRes.data);
      setSuppliers(suppliersRes.data);
      setContainers(containersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.sku_id || !currentItem.quantity || !currentItem.unit_price) {
      toast.error('Please fill all item fields');
      return;
    }
    
    const quantity = parseInt(currentItem.quantity);
    const unitPrice = parseFloat(currentItem.unit_price);
    const totalValue = quantity * unitPrice;
    
    const newItem = {
      ...currentItem,
      quantity,
      unit_price: unitPrice,
      total_value: totalValue
    };
    
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, newItem]
    });
    
    setCurrentItem({
      sku_id: '',
      quantity: '',
      unit_price: '',
      total_value: ''
    });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: updatedItems });
  };

  const handleCreateOrder = async () => {
    if (!orderForm.po_number || !orderForm.supplier_id || !orderForm.container_type || orderForm.items.length === 0) {
      toast.error('Please fill all required fields and add at least one item');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/import-orders`, orderForm);
      setOrders([...orders, response.data]);
      setOrderForm({
        po_number: '',
        supplier_id: '',
        container_type: '',
        currency: 'USD',
        items: []
      });
      setDialogOpen(false);
      toast.success('Import order created successfully');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Tentative': 'bg-blue-100 text-blue-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Loaded': 'bg-purple-100 text-purple-800',
      'Shipped': 'bg-orange-100 text-orange-800',
      'Cleared': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return 'utilization-good';
    if (utilization >= 70) return 'utilization-warning';
    return 'utilization-danger';
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await axios.get(`${API}/import-orders/${orderId}`);
      setSelectedOrder(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading import orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="import-orders-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import Orders</h1>
          <p className="text-gray-600 mt-1">Manage purchase orders with container planning</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-order-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="order-dialog">
            <DialogHeader>
              <DialogTitle>Create Import Order</DialogTitle>
              <DialogDescription>Create a new purchase order with container planning</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="po_number">PO Number</Label>
                  <Input
                    id="po_number"
                    value={orderForm.po_number}
                    onChange={(e) => setOrderForm({...orderForm, po_number: e.target.value})}
                    data-testid="po-number-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <Select value={orderForm.supplier_id} onValueChange={(value) => setOrderForm({...orderForm, supplier_id: value})}>
                    <SelectTrigger data-testid="supplier-select">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="container_type">Container Type</Label>
                  <Select value={orderForm.container_type} onValueChange={(value) => setOrderForm({...orderForm, container_type: value})}>
                    <SelectTrigger data-testid="container-type-select">
                      <SelectValue placeholder="Select container" />
                    </SelectTrigger>
                    <SelectContent>
                      {containers.map((container) => (
                        <SelectItem key={container.id} value={container.container_type}>
                          {container.container_type} (Max: {container.max_weight}KG, {container.max_cbm}CBM)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={orderForm.currency} onValueChange={(value) => setOrderForm({...orderForm, currency: value})}>
                    <SelectTrigger data-testid="currency-select">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Add Items */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-lg font-medium">Add Items</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku_id">SKU</Label>
                    <Select value={currentItem.sku_id} onValueChange={(value) => setCurrentItem({...currentItem, sku_id: value})}>
                      <SelectTrigger data-testid="item-sku-select">
                        <SelectValue placeholder="Select SKU" />
                      </SelectTrigger>
                      <SelectContent>
                        {skus.map((sku) => (
                          <SelectItem key={sku.id} value={sku.id}>
                            {sku.sku_code} - {sku.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                      data-testid="item-quantity-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      value={currentItem.unit_price}
                      onChange={(e) => setCurrentItem({...currentItem, unit_price: e.target.value})}
                      data-testid="item-price-input"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItem} data-testid="add-item-btn">
                      Add Item
                    </Button>
                  </div>
                </div>
                
                {/* Items List */}
                {orderForm.items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Order Items ({orderForm.items.length})</h4>
                    <div className="space-y-2">
                      {orderForm.items.map((item, index) => {
                        const sku = skus.find(s => s.id === item.sku_id);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded" data-testid={`order-item-${index}`}>
                            <div className="flex-1">
                              <span className="font-medium">{sku?.sku_code}</span>
                              <span className="text-gray-600 ml-2">Qty: {item.quantity}, Price: {orderForm.currency} {item.unit_price}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{orderForm.currency} {item.total_value.toFixed(2)}</span>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleRemoveItem(index)}
                                data-testid={`remove-item-${index}`}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrder} data-testid="create-order-submit-btn">Create Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Import Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">PO Number</th>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Container</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Utilization</th>
                  <th className="text-left p-3 font-medium">Total Value</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const supplier = suppliers.find(s => s.id === order.supplier_id);
                  return (
                    <tr key={order.id} className="table-row border-b" data-testid={`order-row-${order.po_number}`}>
                      <td className="p-3 font-medium">{order.po_number}</td>
                      <td className="p-3">{supplier?.name || 'N/A'}</td>
                      <td className="p-3">
                        <Badge variant="outline">{order.container_type}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full progress-bar ${getUtilizationColor(order.utilization_percentage)}`}
                              style={{ width: `${Math.min(order.utilization_percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{order.utilization_percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium">{order.currency} {order.total_value.toFixed(2)}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                          data-testid={`view-order-${order.po_number}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center py-8" data-testid="no-orders-message">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No import orders found. Create your first order to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="view-order-dialog">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">Order Information</h4>
                  <div className="mt-2 space-y-1">
                    <p><span className="font-medium">PO Number:</span> {selectedOrder.po_number}</p>
                    <p><span className="font-medium">Container:</span> {selectedOrder.container_type}</p>
                    <p><span className="font-medium">Currency:</span> {selectedOrder.currency}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Summary</h4>
                  <div className="mt-2 space-y-1">
                    <p><span className="font-medium">Total Quantity:</span> {selectedOrder.total_quantity}</p>
                    <p><span className="font-medium">Total Weight:</span> {selectedOrder.total_weight} KG</p>
                    <p><span className="font-medium">Total CBM:</span> {selectedOrder.total_cbm}</p>
                    <p><span className="font-medium">Total Value:</span> {selectedOrder.currency} {selectedOrder.total_value.toFixed(2)}</p>
                    <p><span className="font-medium">Utilization:</span> {selectedOrder.utilization_percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Order Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2 font-medium">SKU</th>
                        <th className="text-left p-2 font-medium">Quantity</th>
                        <th className="text-left p-2 font-medium">Unit Price</th>
                        <th className="text-left p-2 font-medium">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => {
                        const sku = skus.find(s => s.id === item.sku_id);
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2">{sku?.sku_code || 'N/A'}</td>
                            <td className="p-2">{item.quantity}</td>
                            <td className="p-2">{selectedOrder.currency} {item.unit_price.toFixed(2)}</td>
                            <td className="p-2">{selectedOrder.currency} {item.total_value.toFixed(2)}</td>
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

export default ImportOrders;