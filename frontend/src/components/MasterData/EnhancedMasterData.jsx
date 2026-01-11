import React, { useState, useEffect, useRef } from 'react';
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
import { Plus, Edit, Trash2, Package, Users, MapPin, Container, Loader2, Save, X, Download, Upload, FileSpreadsheet } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importMode, setImportMode] = useState('add');
  const fileInputRef = useRef(null);
  
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
    category: '',
    adhesive_type: '',
    liner_color: '',
    shipping_mark: '',
    marking: ''
  });
  
  const [dropdownOptions, setDropdownOptions] = useState({
    categories: [],
    adhesive_types: [],
    liner_colors: [],
    shipping_marks: []
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
    opening_balance: '',
    payment_terms_days: '30',
    payment_terms_type: 'NET'
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
    fetchDropdownOptions();
  }, []);
  
  const fetchDropdownOptions = async () => {
    try {
      const response = await axios.get(`${API}/settings/dropdown-options`);
      setDropdownOptions(response.data);
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    }
  };

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
    setSkuForm({ sku_code: '', description: '', color: '', hsn_code: '', micron: '', width_mm: '', length_m: '', weight_per_unit: '', cbm_per_unit: '', unit_cost: '', category: '', adhesive_type: '', liner_color: '', shipping_mark: '', marking: '' });
    setSupplierForm({ name: '', code: '', base_currency: '', contact_email: '', contact_phone: '', address: '', description: '', country: '', opening_balance: '', payment_terms_days: '30', payment_terms_type: 'NET' });
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
        category: item.category || '',
        adhesive_type: item.adhesive_type || '',
        liner_color: item.liner_color || '',
        shipping_mark: item.shipping_mark || '',
        marking: item.marking || ''
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
        opening_balance: item.opening_balance?.toString() || '',
        payment_terms_days: item.payment_terms_days?.toString() || '30',
        payment_terms_type: item.payment_terms_type || 'NET'
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
        unit_cost: skuForm.unit_cost ? parseFloat(skuForm.unit_cost) : null,
        adhesive_type: skuForm.adhesive_type || null,
        liner_color: skuForm.liner_color || null,
        shipping_mark: skuForm.shipping_mark || null,
        marking: skuForm.marking || null
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
        opening_balance: parseFloat(supplierForm.opening_balance) || 0,
        payment_terms_days: parseInt(supplierForm.payment_terms_days) || 30,
        payment_terms_type: supplierForm.payment_terms_type || 'NET'
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

  // Excel Export/Import Functions
  const handleExportExcel = async (masterType) => {
    try {
      toast.info(`Exporting ${masterType} to Excel...`);
      const response = await axios.get(`${API}/masters/export/${masterType}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${masterType}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${masterType} exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.response?.data?.detail || `Failed to export ${masterType}`);
    }
  };

  const handleDownloadTemplate = async (masterType) => {
    try {
      const response = await axios.get(`${API}/masters/template/${masterType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${masterType}_import_template.xlsx`);
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

  const handleImportExcel = async (event) => {
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
      const response = await axios.post(
        `${API}/masters/import/${activeTab}?mode=${importMode}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      const stats = response.data.statistics;
      toast.success(
        `Import completed! Added: ${stats.added}, Updated: ${stats.updated}, Skipped: ${stats.skipped}`
      );
      
      if (stats.errors?.length > 0) {
        console.warn('Import errors:', stats.errors);
        toast.warning(`${stats.errors.length} rows had errors`);
      }
      
      // Refresh data
      await fetchAllData();
      setUploadDialogOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.detail || 'Failed to import data');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderImportExportButtons = (masterType) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExportExcel(masterType)}
        data-testid={`export-${masterType}-btn`}
      >
        <Download className="w-4 h-4 mr-1" />
        Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setUploadDialogOpen(true)}
        data-testid={`import-${masterType}-btn`}
      >
        <Upload className="w-4 h-4 mr-1" />
        Import
      </Button>
    </div>
  );

  const renderUploadDialog = () => (
    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
      <DialogContent className="max-w-md" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to import master data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Import Mode</Label>
            <Select value={importMode} onValueChange={setImportMode}>
              <SelectTrigger data-testid="import-mode-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add New Only (skip existing)</SelectItem>
                <SelectItem value="update">Add & Update Existing</SelectItem>
                <SelectItem value="replace">Replace All (clear & import)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {importMode === 'add' && 'Only adds new records, skips if code already exists'}
              {importMode === 'update' && 'Adds new records and updates existing ones'}
              {importMode === 'replace' && '⚠️ Deletes all existing data before importing'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Excel File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              disabled={uploading}
              data-testid="import-file-input"
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Need a template?</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => handleDownloadTemplate(activeTab)}
              data-testid="download-template-btn"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Download Template
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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
        
        {/* New Product Attributes Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Product Attributes</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adhesive_type">Adhesive Type</Label>
              <Select value={skuForm.adhesive_type} onValueChange={(value) => setSkuForm({...skuForm, adhesive_type: value})}>
                <SelectTrigger data-testid="sku-adhesive-select">
                  <SelectValue placeholder="Select adhesive type" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.adhesive_types?.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="liner_color">Liner Color</Label>
              <Select value={skuForm.liner_color} onValueChange={(value) => setSkuForm({...skuForm, liner_color: value})}>
                <SelectTrigger data-testid="sku-liner-color-select">
                  <SelectValue placeholder="Select liner color" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.liner_colors?.map((color) => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_mark">Shipping Mark</Label>
              <Select value={skuForm.shipping_mark} onValueChange={(value) => setSkuForm({...skuForm, shipping_mark: value})}>
                <SelectTrigger data-testid="sku-shipping-mark-select">
                  <SelectValue placeholder="Select shipping mark" />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.shipping_marks?.map((mark) => (
                    <SelectItem key={mark} value={mark}>{mark}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marking">Marking / Notes</Label>
              <Input
                id="marking"
                value={skuForm.marking}
                onChange={(e) => setSkuForm({...skuForm, marking: e.target.value})}
                placeholder="e.g., ORDER NO MARKING"
                data-testid="sku-marking-input"
              />
            </div>
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
        
        {/* Payment Terms Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Terms</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms_type">Payment Type</Label>
              <Select value={supplierForm.payment_terms_type} onValueChange={(value) => setSupplierForm({...supplierForm, payment_terms_type: value})}>
                <SelectTrigger data-testid="supplier-payment-type-select">
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NET">NET (Net Days)</SelectItem>
                  <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                  <SelectItem value="ADVANCE">ADVANCE (Payment in Advance)</SelectItem>
                  <SelectItem value="LC">LC (Letter of Credit)</SelectItem>
                  <SelectItem value="TT">TT (Telegraphic Transfer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms_days">Payment Days</Label>
              <Input
                id="payment_terms_days"
                type="number"
                value={supplierForm.payment_terms_days}
                onChange={(e) => setSupplierForm({...supplierForm, payment_terms_days: e.target.value})}
                placeholder="30"
                data-testid="supplier-payment-days-input"
              />
              <p className="text-xs text-gray-500">Days until payment is due</p>
            </div>
          </div>
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

  const renderPortDialog = () => (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="port-dialog">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Port' : 'Add New Port'}</DialogTitle>
        <DialogDescription>Manage port information and logistics settings</DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="port_name">Port Name *</Label>
            <Input
              id="port_name"
              value={portForm.name}
              onChange={(e) => setPortForm({...portForm, name: e.target.value})}
              placeholder="e.g., Port of Shanghai"
              data-testid="port-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port_code">Port Code *</Label>
            <Input
              id="port_code"
              value={portForm.code}
              onChange={(e) => setPortForm({...portForm, code: e.target.value})}
              placeholder="e.g., SHA, HKG, SIN"
              data-testid="port-code-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="port_country">Country *</Label>
          <Input
            id="port_country"
            value={portForm.country}
            onChange={(e) => setPortForm({...portForm, country: e.target.value})}
            placeholder="e.g., China, Singapore, India"
            data-testid="port-country-input"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="transit_days">Transit Days</Label>
            <Input
              id="transit_days"
              type="number"
              value={portForm.transit_days}
              onChange={(e) => setPortForm({...portForm, transit_days: e.target.value})}
              placeholder="30"
              data-testid="port-transit-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demurrage_free_days">Free Days</Label>
            <Input
              id="demurrage_free_days"
              type="number"
              value={portForm.demurrage_free_days}
              onChange={(e) => setPortForm({...portForm, demurrage_free_days: e.target.value})}
              placeholder="7"
              data-testid="port-free-days-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demurrage_rate">Demurrage Rate ($/day)</Label>
            <Input
              id="demurrage_rate"
              type="number"
              step="0.01"
              value={portForm.demurrage_rate}
              onChange={(e) => setPortForm({...portForm, demurrage_rate: e.target.value})}
              placeholder="50.00"
              data-testid="port-demurrage-input"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { resetForms(); setDialogOpen(false); }} data-testid="cancel-port-btn">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleCreatePort} data-testid="save-port-btn">
          <Save className="w-4 h-4 mr-2" />
          {isEditing ? 'Update Port' : 'Create Port'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderContainerDialog = () => (
    <DialogContent className="max-w-2xl" data-testid="container-dialog">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Container' : 'Add Container Type'}</DialogTitle>
        <DialogDescription>Define container specifications and freight rates</DialogDescription>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="space-y-2">
          <Label htmlFor="container_type">Container Type *</Label>
          <Select 
            value={containerForm.container_type} 
            onValueChange={(value) => setContainerForm({...containerForm, container_type: value})}
          >
            <SelectTrigger data-testid="container-type-select">
              <SelectValue placeholder="Select container type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20FT">20FT - Twenty Foot</SelectItem>
              <SelectItem value="40FT">40FT - Forty Foot</SelectItem>
              <SelectItem value="40HC">40HC - Forty Foot High Cube</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max_weight">Max Weight (KG) *</Label>
            <Input
              id="max_weight"
              type="number"
              value={containerForm.max_weight}
              onChange={(e) => setContainerForm({...containerForm, max_weight: e.target.value})}
              placeholder="18000 for 20FT, 26000 for 40FT"
              data-testid="container-weight-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_cbm">Max CBM *</Label>
            <Input
              id="max_cbm"
              type="number"
              step="0.1"
              value={containerForm.max_cbm}
              onChange={(e) => setContainerForm({...containerForm, max_cbm: e.target.value})}
              placeholder="28 for 20FT, 58 for 40FT"
              data-testid="container-cbm-input"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="freight_rate">Freight Rate (USD)</Label>
          <Input
            id="freight_rate"
            type="number"
            step="0.01"
            value={containerForm.freight_rate}
            onChange={(e) => setContainerForm({...containerForm, freight_rate: e.target.value})}
            placeholder="Freight cost per container"
            data-testid="container-freight-input"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { resetForms(); setDialogOpen(false); }} data-testid="cancel-container-btn">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleCreateContainer} data-testid="save-container-btn">
          <Save className="w-4 h-4 mr-2" />
          {isEditing ? 'Update Container' : 'Create Container'}
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

        {/* SKUs Tab */}
        <TabsContent value="skus" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Enhanced SKU Master
              </CardTitle>
              <div className="flex items-center gap-2">
                {renderImportExportButtons('skus')}
                <Dialog open={dialogOpen && activeTab === 'skus'} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid="add-sku-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add SKU
                    </Button>
                  </DialogTrigger>
                  {renderSKUDialog()}
                </Dialog>
              </div>
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

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Enhanced Supplier Master
              </CardTitle>
              <div className="flex items-center gap-2">
                {renderImportExportButtons('suppliers')}
                <Dialog open={dialogOpen && activeTab === 'suppliers'} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid="add-supplier-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Supplier
                    </Button>
                  </DialogTrigger>
                  {renderSupplierDialog()}
                </Dialog>
              </div>
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
                            {supplier.current_balance?.toFixed(2) || '0.00'}
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

        {/* Ports Tab */}
        <TabsContent value="ports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Enhanced Port Master
              </CardTitle>
              <div className="flex items-center gap-2">
                {renderImportExportButtons('ports')}
                <Dialog open={dialogOpen && activeTab === 'ports'} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid="add-port-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Port
                    </Button>
                  </DialogTrigger>
                  {renderPortDialog()}
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Port Details</th>
                      <th className="text-left p-3 font-medium">Country</th>
                      <th className="text-left p-3 font-medium">Transit Time</th>
                      <th className="text-left p-3 font-medium">Demurrage</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ports.map((port) => (
                      <tr key={port.id} className="table-row border-b" data-testid={`port-row-${port.code}`}>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{port.name}</div>
                            <div className="text-xs text-gray-500">{port.code}</div>
                          </div>
                        </td>
                        <td className="p-3 font-medium">{port.country}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {port.transit_days || 30} days
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          <div>
                            <div>Free: {port.demurrage_free_days || 7} days</div>
                            <div className="text-gray-600">${port.demurrage_rate || 50}/day</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(port, 'port')}
                              data-testid={`edit-port-${port.code}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(port.id, 'port')}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`delete-port-${port.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ports.length === 0 && (
                  <div className="text-center py-8" data-testid="no-ports-message">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No ports found. Add your first port to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Containers Tab */}
        <TabsContent value="containers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Container className="w-5 h-5" />
                Enhanced Container Master
              </CardTitle>
              <div className="flex items-center gap-2">
                {renderImportExportButtons('containers')}
                <Dialog open={dialogOpen && activeTab === 'containers'} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForms(); setDialogOpen(true); }} data-testid="add-container-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Container
                    </Button>
                  </DialogTrigger>
                  {renderContainerDialog()}
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Capacity</th>
                      <th className="text-left p-3 font-medium">Freight Rate</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id} className="table-row border-b" data-testid={`container-row-${container.container_type}`}>
                        <td className="p-3">
                          <Badge variant="outline" className="text-sm font-semibold">
                            {container.container_type}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              Weight: {container.max_weight?.toLocaleString()} KG
                            </div>
                            <div className="text-sm text-gray-600">
                              Volume: {container.max_cbm} CBM
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-medium text-green-600">
                          ${container.freight_rate?.toLocaleString() || 0}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(container, 'container')}
                              data-testid={`edit-container-${container.container_type}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(container.id, 'container')}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`delete-container-${container.container_type}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {containers.length === 0 && (
                  <div className="text-center py-8" data-testid="no-containers-message">
                    <Container className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No container types found. Add container specifications to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Import Dialog */}
      {renderUploadDialog()}
    </div>
  );
};

export default EnhancedMasterData;
