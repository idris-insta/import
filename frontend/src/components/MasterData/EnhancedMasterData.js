import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, Users, MapPin, Container, Loader2, Save, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedMasterData = () => {
  const [activeTab, setActiveTab] = useState('skus');
  const [skus, setSkus] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ports, setPorts] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states with enhanced fields
  const [skuForm, setSkuForm] = useState({
    sku_code: '',
    description: '',
    color: '',
    hsn_code: '',
    micron: '',
    width_mm: '',
    length_m: '',
    weight_per_unit: '',
    cbm_per_unit: '',
    unit_cost: '',
    category: ''
  });
  
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    base_currency: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    description: '',
    country: '',
    opening_balance: ''
  });
  
  const [portForm, setPortForm] = useState({
    name: '',
    code: '',
    country: '',
    transit_days: '',
    demurrage_free_days: '',
    demurrage_rate: ''
  });
  
  const [containerForm, setContainerForm] = useState({
    container_type: '',
    max_weight: '',
    max_cbm: '',
    freight_rate: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [skusRes, suppliersRes, portsRes, containersRes] = await Promise.all([
        axios.get(`${API}/skus`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/ports`),
        axios.get(`${API}/containers`)
      ]);
      
      setSkus(skusRes.data);
      setSuppliers(suppliersRes.data);
      setPorts(portsRes.data);
      setContainers(containersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setSkuForm({ sku_code: '', description: '', color: '', hsn_code: '', micron: '', width_mm: '', length_m: '', weight_per_unit: '', cbm_per_unit: '', unit_cost: '', category: '' });
    setSupplierForm({ name: '', code: '', base_currency: '', contact_email: '', contact_phone: '', address: '', description: '', country: '', opening_balance: '' });
    setPortForm({ name: '', code: '', country: '', transit_days: '', demurrage_free_days: '', demurrage_rate: '' });
    setContainerForm({ container_type: '', max_weight: '', max_cbm: '', freight_rate: '' });
    setEditingItem(null);
    setIsEditing(false);
  };

  const openEditDialog = (item, type) => {
    setEditingItem(item);
    setIsEditing(true);
    
    if (type === 'sku') {
      setSkuForm({
        sku_code: item.sku_code || '',
        description: item.description || '',
        color: item.color || '',
        hsn_code: item.hsn_code || '',
        micron: item.micron?.toString() || '',
        width_mm: item.width_mm?.toString() || '',
        length_m: item.length_m?.toString() || '',
        weight_per_unit: item.weight_per_unit?.toString() || '',
        cbm_per_unit: item.cbm_per_unit?.toString() || '',
        unit_cost: item.unit_cost?.toString() || '',
        category: item.category || ''
      });
      setActiveTab('skus');
    } else if (type === 'supplier') {
      setSupplierForm({
        name: item.name || '',
        code: item.code || '',
        base_currency: item.base_currency || '',
        contact_email: item.contact_email || '',
        contact_phone: item.contact_phone || '',
        address: item.address || '',
        description: item.description || '',
        country: item.country || '',
        opening_balance: item.opening_balance?.toString() || ''
      });
      setActiveTab('suppliers');
    } else if (type === 'port') {
      setPortForm({
        name: item.name || '',
        code: item.code || '',
        country: item.country || '',
        transit_days: item.transit_days?.toString() || '',
        demurrage_free_days: item.demurrage_free_days?.toString() || '',
        demurrage_rate: item.demurrage_rate?.toString() || ''
      });
      setActiveTab('ports');
    } else if (type === 'container') {
      setContainerForm({
        container_type: item.container_type || '',
        max_weight: item.max_weight?.toString() || '',
        max_cbm: item.max_cbm?.toString() || '',
        freight_rate: item.freight_rate?.toString() || ''
      });
      setActiveTab('containers');
    }
    setDialogOpen(true);
  };

  const handleCreateSku = async () => {
    try {
      const payload = {
        ...skuForm,
        weight_per_unit: parseFloat(skuForm.weight_per_unit),
        cbm_per_unit: parseFloat(skuForm.cbm_per_unit),
        micron: skuForm.micron ? parseFloat(skuForm.micron) : null,
        width_mm: skuForm.width_mm ? parseFloat(skuForm.width_mm) : null,
        length_m: skuForm.length_m ? parseFloat(skuForm.length_m) : null,
        unit_cost: skuForm.unit_cost ? parseFloat(skuForm.unit_cost) : null
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`${API}/skus/${editingItem.id}`, payload);
        setSkus(skus.map(sku => sku.id === editingItem.id ? response.data : sku));
        toast.success('SKU updated successfully');
      } else {
        response = await axios.post(`${API}/skus`, payload);
        setSkus([...skus, response.data]);
        toast.success('SKU created successfully');
      }
      
      resetForms();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error with SKU:', error);
      toast.error(error.response?.data?.detail || 'Failed to save SKU');
    }
  };

  const handleCreateSupplier = async () => {
    try {
      const payload = {
        ...supplierForm,
        opening_balance: parseFloat(supplierForm.opening_balance) || 0
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`${API}/suppliers/${editingItem.id}`, payload);
        setSuppliers(suppliers.map(supplier => supplier.id === editingItem.id ? response.data : supplier));
        toast.success('Supplier updated successfully');
      } else {
        response = await axios.post(`${API}/suppliers`, payload);
        setSuppliers([...suppliers, response.data]);
        toast.success('Supplier created successfully');
      }
      
      resetForms();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error with supplier:', error);
      toast.error(error.response?.data?.detail || 'Failed to save supplier');
    }
  };

  const handleCreatePort = async () => {
    try {
      const payload = {
        ...portForm,
        transit_days: parseInt(portForm.transit_days) || 30,
        demurrage_free_days: parseInt(portForm.demurrage_free_days) || 7,
        demurrage_rate: parseFloat(portForm.demurrage_rate) || 50.0
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`${API}/ports/${editingItem.id}`, payload);
        setPorts(ports.map(port => port.id === editingItem.id ? response.data : port));
        toast.success('Port updated successfully');
      } else {
        response = await axios.post(`${API}/ports`, payload);
        setPorts([...ports, response.data]);
        toast.success('Port created successfully');
      }
      
      resetForms();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error with port:', error);
      toast.error(error.response?.data?.detail || 'Failed to save port');
    }
  };

  const handleCreateContainer = async () => {
    try {
      const payload = {
        ...containerForm,
        max_weight: parseFloat(containerForm.max_weight),
        max_cbm: parseFloat(containerForm.max_cbm),
        freight_rate: parseFloat(containerForm.freight_rate) || 0
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`${API}/containers/${editingItem.id}`, payload);
        setContainers(containers.map(container => container.id === editingItem.id ? response.data : container));
        toast.success('Container updated successfully');
      } else {
        response = await axios.post(`${API}/containers`, payload);
        setContainers([...containers, response.data]);
        toast.success('Container created successfully');
      }
      
      resetForms();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error with container:', error);
      toast.error(error.response?.data?.detail || 'Failed to save container');
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/${type}s/${id}`);
      
      if (type === 'sku') {
        setSkus(skus.filter(sku => sku.id !== id));
      } else if (type === 'supplier') {
        setSuppliers(suppliers.filter(supplier => supplier.id !== id));
      } else if (type === 'port') {
        setPorts(ports.filter(port => port.id !== id));
      } else if (type === 'container') {
        setContainers(containers.filter(container => container.id !== id));
      }
      
      toast.success(`${type} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(error.response?.data?.detail || `Failed to delete ${type}`);
    }
  };

  const renderSKUDialog = () => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="sku-dialog">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit SKU' : 'Add New SKU'}</DialogTitle>
        <DialogDescription>Manage Stock Keeping Unit with detailed specifications</DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku_code">SKU Code *</Label>
            <Input
              id="sku_code"
              value={skuForm.sku_code}
              onChange={(e) => setSkuForm({...skuForm, sku_code: e.target.value})}
              data-testid="sku-code-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={skuForm.category}
              onChange={(e) => setSkuForm({...skuForm, category: e.target.value})}
              placeholder="e.g., Raw Materials, Finished Goods"
              data-testid="sku-category-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={skuForm.description}
            onChange={(e) => setSkuForm({...skuForm, description: e.target.value})}
            placeholder="Detailed product description"
            data-testid="sku-description-input"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={skuForm.color}
              onChange={(e) => setSkuForm({...skuForm, color: e.target.value})}
              placeholder="e.g., Red, Blue, Transparent"
              data-testid="sku-color-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hsn_code">HSN Code *</Label>
            <Input
              id="hsn_code"
              value={skuForm.hsn_code}
              onChange={(e) => setSkuForm({...skuForm, hsn_code: e.target.value})}
              data-testid="sku-hsn-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="micron">Micron</Label>
            <Input
              id="micron"
              type="number"
              value={skuForm.micron}
              onChange={(e) => setSkuForm({...skuForm, micron: e.target.value})}
              placeholder="Thickness in microns"
              data-testid="sku-micron-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width_mm">Width (mm)</Label>
            <Input
              id="width_mm"
              type="number"
              step="0.1"
              value={skuForm.width_mm}
              onChange={(e) => setSkuForm({...skuForm, width_mm: e.target.value})}
              placeholder="Width in millimeters"
              data-testid="sku-width-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="length_m">Length (m)</Label>
            <Input
              id="length_m"
              type="number"
              step="0.01"
              value={skuForm.length_m}
              onChange={(e) => setSkuForm({...skuForm, length_m: e.target.value})}
              placeholder="Length in meters"
              data-testid="sku-length-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight_per_unit">Weight/Unit (KG) *</Label>
            <Input
              id="weight_per_unit"
              type="number"
              step="0.001"
              value={skuForm.weight_per_unit}
              onChange={(e) => setSkuForm({...skuForm, weight_per_unit: e.target.value})}
              data-testid="sku-weight-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cbm_per_unit">CBM/Unit *</Label>
            <Input
              id="cbm_per_unit"
              type="number"
              step="0.001"
              value={skuForm.cbm_per_unit}
              onChange={(e) => setSkuForm({...skuForm, cbm_per_unit: e.target.value})}
              data-testid="sku-cbm-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_cost">Unit Cost</Label>
            <Input
              id="unit_cost"
              type="number"
              step="0.01"
              value={skuForm.unit_cost}
              onChange={(e) => setSkuForm({...skuForm, unit_cost: e.target.value})}
              placeholder="Cost per unit"
              data-testid="sku-cost-input"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { resetForms(); setDialogOpen(false); }} data-testid="cancel-sku-btn">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleCreateSku} data-testid="save-sku-btn">
          <Save className="w-4 h-4 mr-2" />
          {isEditing ? 'Update SKU' : 'Create SKU'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderSupplierDialog = () => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="supplier-dialog">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        <DialogDescription>Manage supplier information and contact details</DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="supplier_name">Supplier Name *</Label>
            <Input
              id="supplier_name"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
              data-testid="supplier-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier_code">Supplier Code *</Label>
            <Input
              id="supplier_code"
              value={supplierForm.code}
              onChange={(e) => setSupplierForm({...supplierForm, code: e.target.value})}
              data-testid="supplier-code-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier_description">Description</Label>
          <Textarea
            id="supplier_description"
            value={supplierForm.description}
            onChange={(e) => setSupplierForm({...supplierForm, description: e.target.value})}
            placeholder="Brief description about the supplier"
            data-testid="supplier-description-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base_currency">Base Currency *</Label>
            <Select value={supplierForm.base_currency} onValueChange={(value) => setSupplierForm({...supplierForm, base_currency: value})}>
              <SelectTrigger data-testid="supplier-currency-select">
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
          <div className="space-y-2">
            <Label htmlFor="supplier_country">Country</Label>
            <Input
              id="supplier_country"
              value={supplierForm.country}
              onChange={(e) => setSupplierForm({...supplierForm, country: e.target.value})}
              placeholder="e.g., China, India, USA"
              data-testid="supplier-country-input"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email *</Label>
            <Input
              id="contact_email"
              type="email"
              value={supplierForm.contact_email}
              onChange={(e) => setSupplierForm({...supplierForm, contact_email: e.target.value})}
              data-testid="supplier-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone *</Label>
            <Input
              id="contact_phone"
              value={supplierForm.contact_phone}
              onChange={(e) => setSupplierForm({...supplierForm, contact_phone: e.target.value})}
              data-testid="supplier-phone-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier_address">Address *</Label>
          <Textarea
            id="supplier_address"
            value={supplierForm.address}
            onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
            placeholder="Full business address"
            data-testid="supplier-address-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="opening_balance">Opening Balance</Label>
          <Input
            id="opening_balance"
            type="number"
            step="0.01"
            value={supplierForm.opening_balance}
            onChange={(e) => setSupplierForm({...supplierForm, opening_balance: e.target.value})}
            placeholder="0.00"
            data-testid="supplier-balance-input"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { resetForms(); setDialogOpen(false); }} data-testid="cancel-supplier-btn">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleCreateSupplier} data-testid="save-supplier-btn">
          <Save className="w-4 h-4 mr-2" />
          {isEditing ? 'Update Supplier' : 'Create Supplier'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading master data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="enhanced-master-data-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Master Data</h1>
          <p className="text-gray-600 mt-1">Comprehensive management of SKUs, suppliers, ports, and containers with full CRUD operations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="skus" data-testid="tab-skus">SKUs ({skus.length})</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="ports" data-testid="tab-ports">Ports ({ports.length})</TabsTrigger>
          <TabsTrigger value="containers" data-testid="tab-containers">Containers ({containers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="skus" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Enhanced SKU Master
              </CardTitle>
              <Dialog open={dialogOpen && activeTab === 'skus'} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid="add-sku-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add SKU
                  </Button>
                </DialogTrigger>
                {renderSKUDialog()}
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">SKU Code</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Color</th>
                      <th className="text-left p-3 font-medium">Dimensions</th>
                      <th className="text-left p-3 font-medium">Weight/Unit</th>
                      <th className="text-left p-3 font-medium">CBM/Unit</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map((sku) => (
                      <tr key={sku.id} className="table-row border-b" data-testid={`sku-row-${sku.sku_code}`}>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{sku.sku_code}</div>
                            {sku.category && <div className="text-xs text-gray-500">{sku.category}</div>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs">
                            <div className="truncate font-medium">{sku.description}</div>
                            <div className="text-xs text-gray-500">HSN: {sku.hsn_code}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          {sku.color ? (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                              {sku.color}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {sku.width_mm || sku.length_m ? (
                            <div>
                              {sku.width_mm && <div>W: {sku.width_mm}mm</div>}
                              {sku.length_m && <div>L: {sku.length_m}m</div>}
                              {sku.micron && <div>μ: {sku.micron}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{sku.weight_per_unit} KG</td>
                        <td className="p-3 font-medium">{sku.cbm_per_unit} CBM</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(sku, 'sku')}
                              data-testid={`edit-sku-${sku.sku_code}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sku.id, 'sku')}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`delete-sku-${sku.sku_code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {skus.length === 0 && (
                  <div className="text-center py-8" data-testid="no-skus-message">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No SKUs found. Create your first SKU to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Enhanced Supplier Master
              </CardTitle>
              <Dialog open={dialogOpen && activeTab === 'suppliers'} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid="add-supplier-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
                {renderSupplierDialog()}
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Supplier</th>
                      <th className="text-left p-3 font-medium">Contact</th>
                      <th className="text-left p-3 font-medium">Location</th>
                      <th className="text-left p-3 font-medium">Currency</th>
                      <th className="text-left p-3 font-medium">Balance</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="table-row border-b" data-testid={`supplier-row-${supplier.code}`}>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-xs text-gray-500">{supplier.code}</div>
                            {supplier.description && (
                              <div className="text-xs text-gray-600 mt-1 max-w-xs truncate">{supplier.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm">
                          <div>{supplier.contact_email}</div>
                          <div className="text-gray-600">{supplier.contact_phone}</div>
                        </td>
                        <td className="p-3 text-sm">
                          <div>{supplier.country || 'Not specified'}</div>
                          <div className="text-gray-600 max-w-xs truncate">{supplier.address}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{supplier.base_currency}</Badge>
                        </td>
                        <td className="p-3 font-medium">
                          <span className={supplier.current_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {supplier.current_balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(supplier, 'supplier')}
                              data-testid={`edit-supplier-${supplier.code}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(supplier.id, 'supplier')}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`delete-supplier-${supplier.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {suppliers.length === 0 && (
                  <div className="text-center py-8" data-testid="no-suppliers-message">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No suppliers found. Add your first supplier to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Add similar enhanced views for Ports and Containers... */}\n        \n        <TabsContent value=\"ports\" className=\"space-y-4\">\n          <Card>\n            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-4\">\n              <CardTitle className=\"flex items-center gap-2\">\n                <MapPin className=\"w-5 h-5\" />\n                Enhanced Port Master\n              </CardTitle>\n              <Dialog open={dialogOpen && activeTab === 'ports'} onOpenChange={setDialogOpen}>\n                <DialogTrigger asChild>\n                  <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid=\"add-port-btn\">\n                    <Plus className=\"w-4 h-4 mr-2\" />\n                    Add Port\n                  </Button>\n                </DialogTrigger>\n                {renderPortDialog()}\n              </Dialog>\n            </CardHeader>\n            <CardContent>\n              <div className=\"overflow-x-auto\">\n                <table className=\"w-full\">\n                  <thead>\n                    <tr className=\"border-b\">\n                      <th className=\"text-left p-3 font-medium\">Port Details</th>\n                      <th className=\"text-left p-3 font-medium\">Country</th>\n                      <th className=\"text-left p-3 font-medium\">Transit Time</th>\n                      <th className=\"text-left p-3 font-medium\">Demurrage</th>\n                      <th className=\"text-left p-3 font-medium\">Actions</th>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    {ports.map((port) => (\n                      <tr key={port.id} className=\"table-row border-b\" data-testid={`port-row-${port.code}`}>\n                        <td className=\"p-3\">\n                          <div>\n                            <div className=\"font-medium\">{port.name}</div>\n                            <div className=\"text-xs text-gray-500\">{port.code}</div>\n                          </div>\n                        </td>\n                        <td className=\"p-3 font-medium\">{port.country}</td>\n                        <td className=\"p-3 text-sm\">\n                          <span className=\"inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded\">\n                            {port.transit_days || 30} days\n                          </span>\n                        </td>\n                        <td className=\"p-3 text-sm\">\n                          <div>\n                            <div>Free: {port.demurrage_free_days || 7} days</div>\n                            <div className=\"text-gray-600\">${port.demurrage_rate || 50}/day</div>\n                          </div>\n                        </td>\n                        <td className=\"p-3\">\n                          <div className=\"flex items-center gap-2\">\n                            <Button\n                              variant=\"ghost\"\n                              size=\"sm\"\n                              onClick={() => openEditDialog(port, 'port')}\n                              data-testid={`edit-port-${port.code}`}\n                            >\n                              <Edit className=\"w-4 h-4\" />\n                            </Button>\n                            <Button\n                              variant=\"ghost\"\n                              size=\"sm\"\n                              onClick={() => handleDelete(port.id, 'port')}\n                              className=\"text-red-600 hover:text-red-800\"\n                              data-testid={`delete-port-${port.code}`}\n                            >\n                              <Trash2 className=\"w-4 h-4\" />\n                            </Button>\n                          </div>\n                        </td>\n                      </tr>\n                    ))}\n                  </tbody>\n                </table>\n                {ports.length === 0 && (\n                  <div className=\"text-center py-8\" data-testid=\"no-ports-message\">\n                    <MapPin className=\"w-12 h-12 text-gray-400 mx-auto mb-4\" />\n                    <p className=\"text-gray-600\">No ports found. Add your first port to get started.</p>\n                  </div>\n                )}\n              </div>\n            </CardContent>\n          </Card>\n        </TabsContent>\n\n        <TabsContent value=\"containers\" className=\"space-y-4\">\n          <Card>\n            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-4\">\n              <CardTitle className=\"flex items-center gap-2\">\n                <Container className=\"w-5 h-5\" />\n                Enhanced Container Master\n              </CardTitle>\n              <Dialog open={dialogOpen && activeTab === 'containers'} onOpenChange={setDialogOpen}>\n                <DialogTrigger asChild>\n                  <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid=\"add-container-btn\">\n                    <Plus className=\"w-4 h-4 mr-2\" />\n                    Add Container\n                  </Button>\n                </DialogTrigger>\n                {renderContainerDialog()}\n              </Dialog>\n            </CardHeader>\n            <CardContent>\n              <div className=\"overflow-x-auto\">\n                <table className=\"w-full\">\n                  <thead>\n                    <tr className=\"border-b\">\n                      <th className=\"text-left p-3 font-medium\">Type</th>\n                      <th className=\"text-left p-3 font-medium\">Capacity</th>\n                      <th className=\"text-left p-3 font-medium\">Freight Rate</th>\n                      <th className=\"text-left p-3 font-medium\">Actions</th>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    {containers.map((container) => (\n                      <tr key={container.id} className=\"table-row border-b\" data-testid={`container-row-${container.container_type}`}>\n                        <td className=\"p-3\">\n                          <Badge variant=\"outline\" className=\"text-sm font-semibold\">\n                            {container.container_type}\n                          </Badge>\n                        </td>\n                        <td className=\"p-3\">\n                          <div className=\"space-y-1\">\n                            <div className=\"text-sm font-medium\">\n                              Weight: {container.max_weight.toLocaleString()} KG\n                            </div>\n                            <div className=\"text-sm text-gray-600\">\n                              Volume: {container.max_cbm} CBM\n                            </div>\n                          </div>\n                        </td>\n                        <td className=\"p-3 font-medium text-green-600\">\n                          ${container.freight_rate?.toLocaleString() || 0}\n                        </td>\n                        <td className=\"p-3\">\n                          <div className=\"flex items-center gap-2\">\n                            <Button\n                              variant=\"ghost\"\n                              size=\"sm\"\n                              onClick={() => openEditDialog(container, 'container')}\n                              data-testid={`edit-container-${container.container_type}`}\n                            >\n                              <Edit className=\"w-4 h-4\" />\n                            </Button>\n                            <Button\n                              variant=\"ghost\"\n                              size=\"sm\"\n                              onClick={() => handleDelete(container.id, 'container')}\n                              className=\"text-red-600 hover:text-red-800\"\n                              data-testid={`delete-container-${container.container_type}`}\n                            >\n                              <Trash2 className=\"w-4 h-4\" />\n                            </Button>\n                          </div>\n                        </td>\n                      </tr>\n                    ))}\n                  </tbody>\n                </table>\n                {containers.length === 0 && (\n                  <div className=\"text-center py-8\" data-testid=\"no-containers-message\">\n                    <Container className=\"w-12 h-12 text-gray-400 mx-auto mb-4\" />\n                    <p className=\"text-gray-600\">No container types found. Add container specifications to get started.</p>\n                  </div>\n                )}\n              </div>\n            </CardContent>\n          </Card>\n        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedMasterData;