import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Plus, Package, Eye, Loader2, Download, Upload, FileSpreadsheet, FileText, X, Edit, Trash2, Copy, Search, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedImportOrders = () => {
  const [orders, setOrders] = useState([]);
  const [skus, setSkus] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  
  const [orderForm, setOrderForm] = useState({
    po_number: '',
    supplier_id: '',
    container_type: '20FT',
    currency: 'USD',
    items: [],
    duty_rate: '0.1',
    freight_charges: '0',
    insurance_charges: '0',
    other_charges: '0',
    shipping_date: ''
  });
  
  const [currentItem, setCurrentItem] = useState({
    sku_id: '',
    quantity: '',
    unit_price: '',
    total_value: '',
    item_description: '',
    thickness: '',
    size: '',
    liner_color: '',
    adhesive_type: '',
    shipping_mark: '',
    marking: ''
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

  // Filter SKUs based on search term (name or code)
  const filteredSkus = skus.filter(sku => {
    if (!skuSearchTerm) return true;
    const searchLower = skuSearchTerm.toLowerCase();
    return (
      sku.sku_code?.toLowerCase().includes(searchLower) ||
      sku.description?.toLowerCase().includes(searchLower)
    );
  });

  // Auto-populate item fields from selected SKU
  const handleSkuSelect = (skuId) => {
    const selectedSku = skus.find(s => s.id === skuId);
    if (selectedSku) {
      setCurrentItem({
        ...currentItem,
        sku_id: skuId,
        item_description: selectedSku.description || '',
        liner_color: selectedSku.liner_color || '',
        adhesive_type: selectedSku.adhesive_type || '',
        shipping_mark: selectedSku.shipping_mark || '',
        marking: selectedSku.marking || '',
        thickness: selectedSku.micron ? `${selectedSku.micron} MIC` : '',
        size: selectedSku.width_mm && selectedSku.length_m ? `${selectedSku.width_mm}MM X ${selectedSku.length_m}M` : ''
      });
    }
    setSkuSearchTerm('');
  };

  const handleAddItem = () => {
    if (!currentItem.sku_id || !currentItem.quantity || !currentItem.unit_price) {
      toast.error('Please fill SKU, quantity and unit price');
      return;
    }
    
    const quantity = parseFloat(currentItem.quantity) || 0;
    const unitPrice = parseFloat(currentItem.unit_price) || 0;
    const totalValue = quantity * unitPrice;
    
    const newItem = {
      ...currentItem,
      quantity,
      unit_price: unitPrice,
      total_value: totalValue
    };
    
    setOrderForm({ ...orderForm, items: [...orderForm.items, newItem] });
    setCurrentItem({
      sku_id: '',
      quantity: '',
      unit_price: '',
      total_value: '',
      item_description: '',
      thickness: '',
      size: '',
      liner_color: '',
      adhesive_type: '',
      shipping_mark: '',
      marking: ''
    });
    toast.success('Item added');
  };

  const handleRemoveItem = (index) => {
    const newItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: newItems });
  };

  const handleCreateOrder = async () => {
    if (!orderForm.po_number || !orderForm.supplier_id || orderForm.items.length === 0) {
      toast.error('Please fill PO number, supplier, and add at least one item');
      return;
    }
    
    try {
      const payload = {
        ...orderForm,
        duty_rate: parseFloat(orderForm.duty_rate) || 0.1,
        freight_charges: parseFloat(orderForm.freight_charges) || 0,
        insurance_charges: parseFloat(orderForm.insurance_charges) || 0,
        other_charges: parseFloat(orderForm.other_charges) || 0,
        shipping_date: orderForm.shipping_date ? new Date(orderForm.shipping_date).toISOString() : null
      };
      
      if (isEditing && editingOrderId) {
        await axios.put(`${API}/import-orders/${editingOrderId}`, payload);
        toast.success('Order updated successfully');
      } else {
        await axios.post(`${API}/import-orders`, payload);
        toast.success('Order created successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      await fetchAllData();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error(error.response?.data?.detail || 'Failed to save order');
    }
  };

  const resetForm = () => {
    setOrderForm({
      po_number: '',
      supplier_id: '',
      container_type: '20FT',
      currency: 'USD',
      items: [],
      duty_rate: '0.1',
      freight_charges: '0',
      insurance_charges: '0',
      other_charges: '0',
      shipping_date: ''
    });
    setIsEditing(false);
    setEditingOrderId(null);
    setSkuSearchTerm('');
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

  const handleEditOrder = async (orderId) => {
    try {
      const response = await axios.get(`${API}/import-orders/${orderId}`);
      const order = response.data;
      
      setOrderForm({
        po_number: order.po_number,
        supplier_id: order.supplier_id,
        container_type: order.container_type,
        currency: order.currency,
        items: order.items || [],
        duty_rate: order.duty_rate?.toString() || '0.1',
        freight_charges: order.freight_charges?.toString() || '0',
        insurance_charges: order.insurance_charges?.toString() || '0',
        other_charges: order.other_charges?.toString() || '0',
        shipping_date: order.shipping_date ? order.shipping_date.split('T')[0] : ''
      });
      
      setIsEditing(true);
      setEditingOrderId(orderId);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order for edit:', error);
      toast.error('Failed to load order for editing');
    }
  };

  const handleDeleteOrder = async (orderId, poNumber) => {
    if (!window.confirm(`Are you sure you want to delete PO ${poNumber}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/import-orders/${orderId}`);
      toast.success(`Order ${poNumber} deleted successfully`);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete order');
    }
  };

  const handleDuplicateOrder = async (orderId) => {
    try {
      const response = await axios.post(`${API}/import-orders/${orderId}/duplicate`);
      toast.success(`Order duplicated! New PO: ${response.data.po_number}`);
      await fetchAllData();
    } catch (error) {
      console.error('Error duplicating order:', error);
      toast.error(error.response?.data?.detail || 'Failed to duplicate order');
    }
  };

  const handleExportOrders = async () => {
    try {
      toast.info('Generating Excel export...');
      const response = await axios.get(`${API}/import-orders/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Orders exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/import-orders/template`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'po_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImportOrders = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API}/import-orders/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const stats = response.data.statistics;
      toast.success(`Import completed! Created: ${stats.created}, Skipped: ${stats.skipped}`);
      if (stats.errors?.length > 0) {
        toast.warning(`${stats.errors.length} POs had errors`);
      }
      await fetchAllData();
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.detail || 'Failed to import orders');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPDF = async (orderId) => {
    try {
      toast.info('Generating PDF...');
      const response = await axios.get(`${API}/import-orders/${orderId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const order = orders.find(o => o.id === orderId);
      link.setAttribute('download', `PO_${order?.po_number || orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Tentative': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Loaded': 'bg-purple-100 text-purple-800',
      'Shipped': 'bg-indigo-100 text-indigo-800',
      'In Transit': 'bg-cyan-100 text-cyan-800',
      'Arrived': 'bg-orange-100 text-orange-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Import Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Purchase order management with Excel import/export</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportOrders} data-testid="export-orders-btn">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)} data-testid="import-orders-btn">
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-order-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="order-dialog">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Import Order' : 'Create Import Order'}</DialogTitle>
                <DialogDescription>Fill in the order details and add items</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>PO Number *</Label>
                    <Input
                      value={orderForm.po_number}
                      onChange={(e) => setOrderForm({...orderForm, po_number: e.target.value})}
                      placeholder="e.g., PO-2024-001"
                      data-testid="po-number-input"
                      disabled={isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier *</Label>
                    <Select value={orderForm.supplier_id} onValueChange={(value) => setOrderForm({...orderForm, supplier_id: value})}>
                      <SelectTrigger data-testid="supplier-select">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shipping Date</Label>
                    <Input
                      type="date"
                      value={orderForm.shipping_date}
                      onChange={(e) => setOrderForm({...orderForm, shipping_date: e.target.value})}
                      data-testid="shipping-date-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Container</Label>
                    <Select value={orderForm.container_type} onValueChange={(value) => setOrderForm({...orderForm, container_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {containers.map((c) => (
                          <SelectItem key={c.container_type} value={c.container_type}>{c.container_type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={orderForm.currency} onValueChange={(value) => setOrderForm({...orderForm, currency: value})}>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label>Duty Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={orderForm.duty_rate}
                      onChange={(e) => setOrderForm({...orderForm, duty_rate: e.target.value})}
                      placeholder="0.10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Freight Charges</Label>
                    <Input
                      type="number"
                      value={orderForm.freight_charges}
                      onChange={(e) => setOrderForm({...orderForm, freight_charges: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Add Item Section with Search */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Item
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>Search SKU by Name or Code *</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={skuSearchTerm}
                            onChange={(e) => setSkuSearchTerm(e.target.value)}
                            placeholder="Type to search SKU..."
                            className="pl-10"
                            data-testid="sku-search-input"
                          />
                        </div>
                        {skuSearchTerm && (
                          <div className="absolute z-50 w-full max-w-md bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                            {filteredSkus.slice(0, 10).map(sku => (
                              <div
                                key={sku.id}
                                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => handleSkuSelect(sku.id)}
                              >
                                <span className="font-medium">{sku.sku_code}</span>
                                <span className="text-gray-500 ml-2">{sku.description}</span>
                              </div>
                            ))}
                            {filteredSkus.length === 0 && (
                              <div className="p-2 text-gray-500 text-sm">No SKUs found</div>
                            )}
                          </div>
                        )}
                        {currentItem.sku_id && (
                          <p className="text-xs text-green-600">
                            Selected: {skus.find(s => s.id === currentItem.sku_id)?.sku_code}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                          placeholder="100"
                          data-testid="item-quantity-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={currentItem.unit_price}
                          onChange={(e) => setCurrentItem({...currentItem, unit_price: e.target.value})}
                          placeholder="25.50"
                          data-testid="item-unit-price-input"
                        />
                      </div>
                    </div>
                    
                    {/* Auto-populated fields from SKU */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <Input
                          value={currentItem.size}
                          onChange={(e) => setCurrentItem({...currentItem, size: e.target.value})}
                          placeholder="500MM X 2000M"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Thickness</Label>
                        <Input
                          value={currentItem.thickness}
                          onChange={(e) => setCurrentItem({...currentItem, thickness: e.target.value})}
                          placeholder="55 MIC"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adhesive Type</Label>
                        <Input
                          value={currentItem.adhesive_type}
                          onChange={(e) => setCurrentItem({...currentItem, adhesive_type: e.target.value})}
                          placeholder="Auto from SKU"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Liner Color</Label>
                        <Input
                          value={currentItem.liner_color}
                          onChange={(e) => setCurrentItem({...currentItem, liner_color: e.target.value})}
                          placeholder="Auto from SKU"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Shipping Mark</Label>
                        <Input
                          value={currentItem.shipping_mark}
                          onChange={(e) => setCurrentItem({...currentItem, shipping_mark: e.target.value})}
                          placeholder="Auto from SKU"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Marking</Label>
                        <Input
                          value={currentItem.marking}
                          onChange={(e) => setCurrentItem({...currentItem, marking: e.target.value})}
                          placeholder="ORDER NO MARKING"
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button onClick={handleAddItem} type="button" className="w-full" data-testid="add-item-btn">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item to Order
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Order Items Table */}
                {orderForm.items.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Order Items ({orderForm.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-2">SKU</th>
                              <th className="text-left p-2">Size</th>
                              <th className="text-left p-2">Adhesive</th>
                              <th className="text-left p-2">Liner</th>
                              <th className="text-right p-2">Qty</th>
                              <th className="text-right p-2">Price</th>
                              <th className="text-right p-2">Total</th>
                              <th className="text-center p-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderForm.items.map((item, idx) => {
                              const sku = skus.find(s => s.id === item.sku_id);
                              return (
                                <tr key={idx} className="border-b">
                                  <td className="p-2">
                                    <div className="font-medium">{sku?.sku_code || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{item.item_description?.slice(0, 30)}</div>
                                  </td>
                                  <td className="p-2 text-xs">{item.size || '-'}</td>
                                  <td className="p-2 text-xs">{item.adhesive_type || '-'}</td>
                                  <td className="p-2 text-xs">{item.liner_color || '-'}</td>
                                  <td className="p-2 text-right">{item.quantity}</td>
                                  <td className="p-2 text-right">{orderForm.currency} {item.unit_price}</td>
                                  <td className="p-2 text-right font-medium">{orderForm.currency} {item.total_value?.toLocaleString()}</td>
                                  <td className="p-2 text-center">
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)}>
                                      <X className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-gray-50 font-medium">
                              <td colSpan={6} className="p-2 text-right">Total Order Value:</td>
                              <td className="p-2 text-right">
                                {orderForm.currency} {orderForm.items.reduce((sum, item) => sum + (item.total_value || 0), 0).toLocaleString()}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancel</Button>
                <Button onClick={handleCreateOrder} data-testid="save-order-btn">
                  {isEditing ? 'Update Order' : 'Create Order'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium">PO Number</th>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Container</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Shipping Date</th>
                  <th className="text-left p-3 font-medium">Utilization</th>
                  <th className="text-left p-3 font-medium">Value</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const supplier = suppliers.find(s => s.id === order.supplier_id);
                  return (
                    <tr key={order.id} className="border-b hover:bg-slate-50" data-testid={`order-row-${order.po_number}`}>
                      <td className="p-3">
                        <div className="font-medium">{order.po_number}</div>
                        <div className="text-xs text-gray-500">{order.items?.length || 0} items</div>
                      </td>
                      <td className="p-3">{supplier?.name || 'N/A'}</td>
                      <td className="p-3">{order.container_type}</td>
                      <td className="p-3">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="p-3">
                        {order.shipping_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.shipping_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${order.utilization_percentage > 90 ? 'bg-green-500' : order.utilization_percentage > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(order.utilization_percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{order.utilization_percentage?.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium">{order.currency} {order.total_value?.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order.id)} title="View Details" data-testid={`view-order-${order.po_number}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditOrder(order.id)} title="Edit Order" data-testid={`edit-order-${order.po_number}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicateOrder(order.id)} title="Duplicate Order" data-testid={`duplicate-order-${order.po_number}`}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleExportPDF(order.id)} title="Download PDF" data-testid={`pdf-order-${order.po_number}`}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteOrder(order.id, order.po_number)} title="Delete Order" data-testid={`delete-order-${order.po_number}`}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No import orders found. Create your first order to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto" data-testid="view-order-dialog">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div><strong>Container:</strong> {selectedOrder.container_type}</div>
                      <div><strong>Currency:</strong> {selectedOrder.currency}</div>
                      <div><strong>Status:</strong> <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div><strong>Utilization:</strong> {selectedOrder.utilization_percentage?.toFixed(1)}%</div>
                      <div><strong>Total Weight:</strong> {selectedOrder.total_weight?.toFixed(2)} KG</div>
                      <div><strong>Total CBM:</strong> {selectedOrder.total_cbm?.toFixed(3)}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div><strong>Order Value:</strong> {selectedOrder.currency} {selectedOrder.total_value?.toLocaleString()}</div>
                      <div><strong>Duty Rate:</strong> {((selectedOrder.duty_rate || 0) * 100).toFixed(1)}%</div>
                      <div><strong>Freight:</strong> {selectedOrder.currency} {selectedOrder.freight_charges || 0}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div><strong>Shipping Date:</strong> {selectedOrder.shipping_date ? new Date(selectedOrder.shipping_date).toLocaleDateString() : 'Not set'}</div>
                      <div><strong>ETA:</strong> {selectedOrder.eta ? new Date(selectedOrder.eta).toLocaleDateString() : 'Not calculated'}</div>
                      <div><strong>Items:</strong> {selectedOrder.items?.length || 0}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Items ({selectedOrder.items?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2">SKU</th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-left p-2">Size</th>
                          <th className="text-left p-2">Adhesive</th>
                          <th className="text-left p-2">Liner</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-right p-2">Unit Price</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items?.map((item, idx) => {
                          const sku = skus.find(s => s.id === item.sku_id);
                          return (
                            <tr key={idx} className="border-b">
                              <td className="p-2 font-medium">{sku?.sku_code || 'N/A'}</td>
                              <td className="p-2">{item.item_description || sku?.description}</td>
                              <td className="p-2">{item.size || '-'}</td>
                              <td className="p-2">{item.adhesive_type || '-'}</td>
                              <td className="p-2">{item.liner_color || '-'}</td>
                              <td className="p-2 text-right">{item.quantity}</td>
                              <td className="p-2 text-right">{selectedOrder.currency} {item.unit_price}</td>
                              <td className="p-2 text-right font-medium">{selectedOrder.currency} {item.total_value?.toLocaleString()}</td>
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

      {/* Import Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md" data-testid="po-import-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Purchase Orders from Excel
            </DialogTitle>
            <DialogDescription>Upload an Excel file to create multiple POs at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Excel File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportOrders}
                disabled={uploading}
                data-testid="po-import-file-input"
              />
              <p className="text-xs text-gray-500">Each row = one item. Same PO number = multiple items in one PO.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Need a template?</span>
              <Button variant="link" size="sm" onClick={handleDownloadTemplate} data-testid="download-po-template-btn">
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Download Template
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedImportOrders;
