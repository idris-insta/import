import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Plus, Package, AlertTriangle, CheckCircle, Clock, Eye, Loader2, Edit, Trash2, Calculator, Download, Upload, FileSpreadsheet, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedImportOrders = () => {
  const [orders, setOrders] = useState([]);
  const [skus, setSkus] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [containers, setContainers] = useState([]);
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [orderForm, setOrderForm] = useState({
    po_number: '',
    supplier_id: '',
    port_id: '',
    container_type: '',
    currency: 'USD',
    items: [],
    eta: '',
    duty_rate: '0.1',
    freight_charges: '',
    insurance_charges: '',
    other_charges: ''
  });
  
  const [currentItem, setCurrentItem] = useState({
    sku_id: '',
    item_description: '',
    thickness: '',
    size: '',
    liner_color: '',
    quantity: '',
    qty_per_carton: '',
    total_cartons: '',
    total_rolls: '',
    unit_price: '',
    price_per_sqm: '',
    total_value: '',
    kg_per_package: '',
    total_kg: '',
    code: '',
    marking: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, skusRes, suppliersRes, containersRes, portsRes] = await Promise.all([
        axios.get(`${API}/import-orders`),
        axios.get(`${API}/skus`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/containers`),
        axios.get(`${API}/ports`)
      ]);
      
      setOrders(ordersRes.data);
      setSkus(skusRes.data);
      setSuppliers(suppliersRes.data);
      setContainers(containersRes.data);
      setPorts(portsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = () => {
    const quantity = parseFloat(currentItem.quantity) || 0;
    const unitPrice = parseFloat(currentItem.unit_price) || 0;
    const total = quantity * unitPrice;
    setCurrentItem({ ...currentItem, total_value: total.toString() });
  };

  const handleAddItem = () => {
    if (!currentItem.sku_id || !currentItem.quantity || !currentItem.unit_price) {
      toast.error('Please fill required item fields: SKU, Quantity, and Unit Price');
      return;
    }
    
    const quantity = parseInt(currentItem.quantity);
    const unitPrice = parseFloat(currentItem.unit_price);
    const totalValue = quantity * unitPrice;
    
    const newItem = {
      ...currentItem,
      quantity,
      unit_price: unitPrice,
      total_value: totalValue,
      qty_per_carton: currentItem.qty_per_carton ? parseInt(currentItem.qty_per_carton) : null,
      total_cartons: currentItem.total_cartons ? parseInt(currentItem.total_cartons) : null,
      total_rolls: currentItem.total_rolls ? parseInt(currentItem.total_rolls) : null,
      price_per_sqm: currentItem.price_per_sqm ? parseFloat(currentItem.price_per_sqm) : null,
      kg_per_package: currentItem.kg_per_package ? parseFloat(currentItem.kg_per_package) : null,
      total_kg: currentItem.total_kg ? parseFloat(currentItem.total_kg) : null
    };
    
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, newItem]
    });
    
    // Reset current item form
    setCurrentItem({
      sku_id: '',
      item_description: '',
      thickness: '',
      size: '',
      liner_color: '',
      quantity: '',
      qty_per_carton: '',
      total_cartons: '',
      total_rolls: '',
      unit_price: '',
      price_per_sqm: '',
      total_value: '',
      kg_per_package: '',
      total_kg: '',
      code: '',
      marking: ''
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
      const payload = {
        ...orderForm,
        eta: orderForm.eta ? new Date(orderForm.eta).toISOString() : null,
        duty_rate: parseFloat(orderForm.duty_rate),
        freight_charges: parseFloat(orderForm.freight_charges) || 0,
        insurance_charges: parseFloat(orderForm.insurance_charges) || 0,
        other_charges: parseFloat(orderForm.other_charges) || 0
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`${API}/import-orders/${selectedOrder.id}`, payload);
        setOrders(orders.map(order => order.id === selectedOrder.id ? response.data : order));
        toast.success('Import order updated successfully');
      } else {
        response = await axios.post(`${API}/import-orders`, payload);
        setOrders([...orders, response.data]);
        toast.success('Import order created successfully');
      }
      
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error with order:', error);
      toast.error(error.response?.data?.detail || 'Failed to save order');
    }
  };

  const resetForm = () => {
    setOrderForm({
      po_number: '',
      supplier_id: '',
      port_id: '',
      container_type: '',
      currency: 'USD',
      items: [],
      eta: '',
      duty_rate: '0.1',
      freight_charges: '',
      insurance_charges: '',
      other_charges: ''
    });
    setCurrentItem({
      sku_id: '',
      item_description: '',
      thickness: '',
      size: '',
      liner_color: '',
      quantity: '',
      qty_per_carton: '',
      total_cartons: '',
      total_rolls: '',
      unit_price: '',
      price_per_sqm: '',
      total_value: '',
      kg_per_package: '',
      total_kg: '',
      code: '',
      marking: ''
    });
    setIsEditing(false);
    setSelectedOrder(null);
  };

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

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return 'bg-green-500';
    if (utilization >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
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
    <div className="space-y-6 fade-in-up" data-testid="enhanced-import-orders-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Import Orders</h1>
          <p className="text-gray-600 mt-1">Comprehensive purchase order management with detailed product specifications</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-order-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="order-dialog">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Import Order' : 'Create Import Order'}</DialogTitle>
              <DialogDescription>Create a comprehensive purchase order with detailed product specifications</DialogDescription>
            </DialogHeader>
            <div className="grid gap-8 py-6">
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="po_number">PO Number *</Label>
                      <Input
                        id="po_number"
                        value={orderForm.po_number}
                        onChange={(e) => setOrderForm({...orderForm, po_number: e.target.value})}
                        placeholder="e.g., ISKY-039-040"
                        data-testid="po-number-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier_id">Supplier *</Label>
                      <Select value={orderForm.supplier_id} onValueChange={(value) => setOrderForm({...orderForm, supplier_id: value})}>
                        <SelectTrigger data-testid="supplier-select">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.code}) - {supplier.base_currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port_id">Destination Port</Label>
                      <Select value={orderForm.port_id} onValueChange={(value) => setOrderForm({...orderForm, port_id: value})}>
                        <SelectTrigger data-testid="port-select">
                          <SelectValue placeholder="Select destination port" />
                        </SelectTrigger>
                        <SelectContent>
                          {ports.map((port) => (
                            <SelectItem key={port.id} value={port.id}>
                              {port.name} ({port.code}) - {port.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Logistics & Financial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="container_type">Container Type *</Label>
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
                        <Label htmlFor="currency">Currency *</Label>
                        <Select value={orderForm.currency} onValueChange={(value) => setOrderForm({...orderForm, currency: value})}>
                          <SelectTrigger data-testid="currency-select">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eta">Expected Arrival (ETA)</Label>
                      <Input
                        id="eta"
                        type="date"
                        value={orderForm.eta}
                        onChange={(e) => setOrderForm({...orderForm, eta: e.target.value})}
                        data-testid="eta-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duty_rate">Duty Rate (%)</Label>
                        <Input
                          id="duty_rate"
                          type="number"
                          step="0.01"
                          value={orderForm.duty_rate}
                          onChange={(e) => setOrderForm({...orderForm, duty_rate: e.target.value})}
                          placeholder="10 (for 10%)"
                          data-testid="duty-rate-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="freight_charges">Freight Charges</Label>
                        <Input
                          id="freight_charges"
                          type="number"
                          step="0.01"
                          value={orderForm.freight_charges}
                          onChange={(e) => setOrderForm({...orderForm, freight_charges: e.target.value})}
                          placeholder="Container freight cost"
                          data-testid="freight-charges-input"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Add Items Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Add Items (Based on PDF Format)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {/* Item Basic Info */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku_id">SKU *</Label>
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
                        <Label htmlFor="code">Product Code</Label>
                        <Input
                          id="code"
                          value={currentItem.code}
                          onChange={(e) => setCurrentItem({...currentItem, code: e.target.value})}
                          placeholder="IS-51626VF-060BRSANL"
                          data-testid="item-code-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="marking">Order Marking</Label>
                        <Input
                          id="marking"
                          value={currentItem.marking}
                          onChange={(e) => setCurrentItem({...currentItem, marking: e.target.value})}
                          placeholder="Order marking/reference"
                          data-testid="item-marking-input"
                        />
                      </div>
                    </div>
                    
                    {/* Item Description */}
                    <div className="space-y-2">
                      <Label htmlFor="item_description">Item Description</Label>
                      <Textarea
                        id="item_description"
                        value={currentItem.item_description}
                        onChange={(e) => setCurrentItem({...currentItem, item_description: e.target.value})}
                        placeholder="POLYMIDE TAPE SILICON or DS TISSUE TAPE HOTMELT"
                        data-testid="item-description-input"
                      />
                    </div>
                    
                    {/* Specifications */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="thickness">Thickness</Label>
                        <Input
                          id="thickness"
                          value={currentItem.thickness}
                          onChange={(e) => setCurrentItem({...currentItem, thickness: e.target.value})}
                          placeholder="55 MIC or 200 MIC"
                          data-testid="item-thickness-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input
                          id="size"
                          value={currentItem.size}
                          onChange={(e) => setCurrentItem({...currentItem, size: e.target.value})}
                          placeholder="500MM X 2000M"
                          data-testid="item-size-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="liner_color">Liner/Color</Label>
                        <Input
                          id="liner_color"
                          value={currentItem.liner_color}
                          onChange={(e) => setCurrentItem({...currentItem, liner_color: e.target.value})}
                          placeholder="AMBER, DARK GREEN, WHITE"
                          data-testid="item-liner-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => {
                            setCurrentItem({...currentItem, quantity: e.target.value});
                            setTimeout(calculateItemTotal, 100);
                          }}
                          data-testid="item-quantity-input"
                        />
                      </div>
                    </div>
                    
                    {/* Packaging & Logistics */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qty_per_carton">Qty/Carton</Label>
                        <Input
                          id="qty_per_carton"
                          type="number"
                          value={currentItem.qty_per_carton}
                          onChange={(e) => setCurrentItem({...currentItem, qty_per_carton: e.target.value})}
                          placeholder="10, 20, 30"
                          data-testid="item-qty-carton-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total_cartons">Total Cartons</Label>
                        <Input
                          id="total_cartons"
                          type="number"
                          value={currentItem.total_cartons}
                          onChange={(e) => setCurrentItem({...currentItem, total_cartons: e.target.value})}
                          data-testid="item-total-cartons-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total_rolls">Total Rolls</Label>
                        <Input
                          id="total_rolls"
                          type="number"
                          value={currentItem.total_rolls}
                          onChange={(e) => setCurrentItem({...currentItem, total_rolls: e.target.value})}
                          data-testid="item-total-rolls-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kg_per_package">KG/Package</Label>
                        <Input
                          id="kg_per_package"
                          type="number"
                          step="0.01"
                          value={currentItem.kg_per_package}
                          onChange={(e) => setCurrentItem({...currentItem, kg_per_package: e.target.value})}
                          data-testid="item-kg-package-input"
                        />
                      </div>
                    </div>
                    
                    {/* Pricing */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit_price">Unit Price *</Label>
                        <Input
                          id="unit_price"
                          type="number"
                          step="0.01"
                          value={currentItem.unit_price}
                          onChange={(e) => {
                            setCurrentItem({...currentItem, unit_price: e.target.value});
                            setTimeout(calculateItemTotal, 100);
                          }}
                          data-testid="item-price-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price_per_sqm">Price/SQM</Label>
                        <Input
                          id="price_per_sqm"
                          type="number"
                          step="0.01"
                          value={currentItem.price_per_sqm}
                          onChange={(e) => setCurrentItem({...currentItem, price_per_sqm: e.target.value})}
                          data-testid="item-price-sqm-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total_kg">Total KG</Label>
                        <Input
                          id="total_kg"
                          type="number"
                          step="0.01"
                          value={currentItem.total_kg}
                          onChange={(e) => setCurrentItem({...currentItem, total_kg: e.target.value})}
                          data-testid="item-total-kg-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="total_value">Total Value</Label>
                        <Input
                          id="total_value"
                          type="number"
                          step="0.01"
                          value={currentItem.total_value}
                          onChange={(e) => setCurrentItem({...currentItem, total_value: e.target.value})}
                          data-testid="item-total-value-input"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={handleAddItem} data-testid="add-item-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item to Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
                
              {/* Items List */}
              {orderForm.items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items ({orderForm.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderForm.items.map((item, index) => {
                        const sku = skus.find(s => s.id === item.sku_id);
                        return (
                          <div key={index} className="p-4 border rounded-lg bg-gray-50" data-testid={`order-item-${index}`}>
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-3">
                                <div className="font-medium">{item.code || sku?.sku_code}</div>
                                <div className="text-sm text-gray-600">{item.item_description || sku?.description}</div>
                                {item.thickness && <div className="text-xs text-gray-500">Thickness: {item.thickness}</div>}
                              </div>
                              <div className="col-span-2">
                                {item.size && <div className="text-sm">Size: {item.size}</div>}
                                {item.liner_color && <div className="text-sm text-gray-600">Color: {item.liner_color}</div>}
                              </div>
                              <div className="col-span-2">
                                <div className="text-sm">Qty: {item.quantity}</div>
                                {item.total_rolls && <div className="text-xs text-gray-500">Rolls: {item.total_rolls}</div>}
                                {item.total_cartons && <div className="text-xs text-gray-500">Cartons: {item.total_cartons}</div>}
                              </div>
                              <div className="col-span-2">
                                <div className="text-sm">Unit: {orderForm.currency} {item.unit_price}</div>
                                {item.price_per_sqm && <div className="text-xs text-gray-500">Per SQM: {item.price_per_sqm}</div>}
                              </div>
                              <div className="col-span-2">
                                <div className="font-medium text-green-600">{orderForm.currency} {item.total_value.toFixed(2)}</div>
                                {item.total_kg && <div className="text-xs text-gray-500">Weight: {item.total_kg}kg</div>}
                              </div>
                              <div className="col-span-1">
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleRemoveItem(index)}
                                  data-testid={`remove-item-${index}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} data-testid="create-order-submit-btn">
                {isEditing ? 'Update Order' : 'Create Order'}
              </Button>
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
                  <th className="text-left p-3 font-medium">ETA</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const supplier = suppliers.find(s => s.id === order.supplier_id);
                  const port = ports.find(p => p.id === order.port_id);
                  return (
                    <tr key={order.id} className="table-row border-b" data-testid={`order-row-${order.po_number}`}>
                      <td className="p-3">
                        <div className="font-medium">{order.po_number}</div>
                        <div className="text-xs text-gray-500">{order.items.length} items</div>
                      </td>
                      <td className="p-3">
                        <div>{supplier?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{supplier?.code}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{order.container_type}</Badge>
                        {port && <div className="text-xs text-gray-500">→ {port.code}</div>}
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
                              className={`h-2 rounded-full transition-all duration-300 ${getUtilizationColor(order.utilization_percentage)}`}
                              style={{ width: `${Math.min(order.utilization_percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{order.utilization_percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium">{order.currency} {order.total_value.toLocaleString()}</td>
                      <td className="p-3 text-sm">
                        {order.eta ? new Date(order.eta).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order.id)}
                            data-testid={`view-order-${order.po_number}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
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

      {/* View Order Dialog - Enhanced */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto" data-testid="view-order-dialog">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="font-medium">PO Number:</span> {selectedOrder.po_number}</div>
                    <div><span className="font-medium">Container:</span> {selectedOrder.container_type}</div>
                    <div><span className="font-medium">Currency:</span> {selectedOrder.currency}</div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Logistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="font-medium">Utilization:</span> {selectedOrder.utilization_percentage.toFixed(1)}%</div>
                    <div><span className="font-medium">Total Weight:</span> {selectedOrder.total_weight} KG</div>
                    <div><span className="font-medium">Total CBM:</span> {selectedOrder.total_cbm}</div>
                    <div><span className="font-medium">ETA:</span> {selectedOrder.eta ? new Date(selectedOrder.eta).toLocaleDateString() : 'TBD'}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Financial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="font-medium">Order Value:</span> {selectedOrder.currency} {selectedOrder.total_value.toLocaleString()}</div>
                    <div><span className="font-medium">Duty Rate:</span> {(selectedOrder.duty_rate * 100).toFixed(1)}%</div>
                    <div><span className="font-medium">Freight:</span> {selectedOrder.currency} {selectedOrder.freight_charges || 0}</div>
                    <div><span className="font-medium">Insurance:</span> {selectedOrder.currency} {selectedOrder.insurance_charges || 0}</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Items ({selectedOrder.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 font-medium">Item Details</th>
                          <th className="text-left p-3 font-medium">Specifications</th>
                          <th className="text-left p-3 font-medium">Quantities</th>
                          <th className="text-left p-3 font-medium">Pricing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, index) => {
                          const sku = skus.find(s => s.id === item.sku_id);
                          return (
                            <tr key={index} className="border-b">
                              <td className="p-3">
                                <div className="font-medium">{item.code || sku?.sku_code}</div>
                                <div className="text-gray-600">{item.item_description || sku?.description}</div>
                                {item.marking && <div className="text-xs text-gray-500">Marking: {item.marking}</div>}
                              </td>
                              <td className="p-3">
                                {item.thickness && <div>Thickness: {item.thickness}</div>}
                                {item.size && <div>Size: {item.size}</div>}
                                {item.liner_color && <div>Color: {item.liner_color}</div>}
                              </td>
                              <td className="p-3">
                                <div>Qty: {item.quantity}</div>
                                {item.total_rolls && <div>Rolls: {item.total_rolls}</div>}
                                {item.total_cartons && <div>Cartons: {item.total_cartons}</div>}
                                {item.total_kg && <div>Weight: {item.total_kg}kg</div>}
                              </td>
                              <td className="p-3">
                                <div>Unit: {selectedOrder.currency} {item.unit_price}</div>
                                {item.price_per_sqm && <div>Per SQM: {item.price_per_sqm}</div>}
                                <div className="font-medium text-green-600">Total: {selectedOrder.currency} {item.total_value.toLocaleString()}</div>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedImportOrders;