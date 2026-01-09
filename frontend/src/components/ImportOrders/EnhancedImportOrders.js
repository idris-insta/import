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
import { Plus, Package, Eye, Loader2, Download, Upload, FileSpreadsheet, FileText, X } from 'lucide-react';

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
    other_charges: '0'
  });
  
  const [currentItem, setCurrentItem] = useState({
    sku_id: '',
    quantity: '',
    unit_price: '',
    total_value: '',
    item_description: '',
    thickness: '',
    size: '',
    liner_color: ''
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
      liner_color: ''
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
        other_charges: parseFloat(orderForm.other_charges) || 0
      };
      
      await axios.post(`${API}/import-orders`, payload);
      toast.success('Order created successfully');
      setDialogOpen(false);
      resetForm();
      await fetchAllData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
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
      other_charges: '0'
    });
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-order-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="order-dialog">
              <DialogHeader>
                <DialogTitle>Create Import Order</DialogTitle>
                <DialogDescription>Fill in the order details and add items</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PO Number *</Label>
                    <Input
                      value={orderForm.po_number}
                      onChange={(e) => setOrderForm({...orderForm, po_number: e.target.value})}
                      placeholder="e.g., PO-2024-001"
                      data-testid="po-number-input"
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
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Item</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>SKU *</Label>
                        <Select value={currentItem.sku_id} onValueChange={(value) => setCurrentItem({...currentItem, sku_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select SKU" />
                          </SelectTrigger>
                          <SelectContent>
                            {skus.map((sku) => (
                              <SelectItem key={sku.id} value={sku.id}>{sku.sku_code} - {sku.description}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                          placeholder="100"
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Size</Label>
                        <Input
                          value={currentItem.size}
                          onChange={(e) => setCurrentItem({...currentItem, size: e.target.value})}
                          placeholder="500MM X 2000M"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddItem} type="button" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </CardContent>
                </Card>
                
                {orderForm.items.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Order Items ({orderForm.items.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">SKU</th>
                            <th className="text-left p-2">Qty</th>
                            <th className="text-left p-2">Price</th>
                            <th className="text-left p-2">Total</th>
                            <th className="text-left p-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderForm.items.map((item, idx) => {
                            const sku = skus.find(s => s.id === item.sku_id);
                            return (
                              <tr key={idx} className="border-b">
                                <td className="p-2">{sku?.sku_code || 'N/A'}</td>
                                <td className="p-2">{item.quantity}</td>
                                <td className="p-2">{orderForm.currency} {item.unit_price}</td>
                                <td className="p-2">{orderForm.currency} {item.total_value?.toLocaleString()}</td>
                                <td className="p-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)}>
                                    <X className="w-4 h-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateOrder} data-testid="create-order-submit-btn">Create Order</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                          <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order.id)} title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleExportPDF(order.id)} title="Download PDF">
                            <FileText className="w-4 h-4" />
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="view-order-dialog">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                      <div><strong>Total Weight:</strong> {selectedOrder.total_weight} KG</div>
                      <div><strong>Total CBM:</strong> {selectedOrder.total_cbm}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div><strong>Order Value:</strong> {selectedOrder.currency} {selectedOrder.total_value?.toLocaleString()}</div>
                      <div><strong>Duty Rate:</strong> {(selectedOrder.duty_rate * 100).toFixed(1)}%</div>
                      <div><strong>Freight:</strong> {selectedOrder.currency} {selectedOrder.freight_charges || 0}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Items ({selectedOrder.items?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-2">SKU</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Qty</th>
                        <th className="text-left p-2">Unit Price</th>
                        <th className="text-left p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item, idx) => {
                        const sku = skus.find(s => s.id === item.sku_id);
                        return (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{sku?.sku_code || 'N/A'}</td>
                            <td className="p-2">{item.item_description || sku?.description}</td>
                            <td className="p-2">{item.quantity}</td>
                            <td className="p-2">{selectedOrder.currency} {item.unit_price}</td>
                            <td className="p-2 font-medium">{selectedOrder.currency} {item.total_value?.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
