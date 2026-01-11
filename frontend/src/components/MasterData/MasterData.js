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
import { toast } from 'sonner';
import { Plus, Edit, Package, Users, MapPin, Container, Loader2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('skus');
  const [skus, setSkus] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ports, setPorts] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [skuForm, setSkuForm] = useState({
    sku_code: '',
    description: '',
    hsn_code: '',
    micron: '',
    weight_per_unit: '',
    cbm_per_unit: ''
  });
  
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    code: '',
    base_currency: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    opening_balance: ''
  });
  
  const [portForm, setPortForm] = useState({
    name: '',
    code: '',
    country: ''
  });
  
  const [containerForm, setContainerForm] = useState({
    container_type: '',
    max_weight: '',
    max_cbm: ''
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

  const handleCreateSku = async () => {
    try {
      const payload = {
        ...skuForm,
        weight_per_unit: parseFloat(skuForm.weight_per_unit),
        cbm_per_unit: parseFloat(skuForm.cbm_per_unit),
        micron: skuForm.micron ? parseFloat(skuForm.micron) : null
      };
      
      const response = await axios.post(`${API}/skus`, payload);
      setSkus([...skus, response.data]);
      setSkuForm({
        sku_code: '',
        description: '',
        hsn_code: '',
        micron: '',
        weight_per_unit: '',
        cbm_per_unit: ''
      });
      setDialogOpen(false);
      toast.success('SKU created successfully');
    } catch (error) {
      console.error('Error creating SKU:', error);
      toast.error(error.response?.data?.detail || 'Failed to create SKU');
    }
  };

  const handleCreateSupplier = async () => {
    try {
      const payload = {
        ...supplierForm,
        opening_balance: parseFloat(supplierForm.opening_balance) || 0
      };
      
      const response = await axios.post(`${API}/suppliers`, payload);
      setSuppliers([...suppliers, response.data]);
      setSupplierForm({
        name: '',
        code: '',
        base_currency: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        opening_balance: ''
      });
      setDialogOpen(false);
      toast.success('Supplier created successfully');
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error(error.response?.data?.detail || 'Failed to create supplier');
    }
  };

  const handleCreatePort = async () => {
    try {
      const response = await axios.post(`${API}/ports`, portForm);
      setPorts([...ports, response.data]);
      setPortForm({
        name: '',
        code: '',
        country: ''
      });
      setDialogOpen(false);
      toast.success('Port created successfully');
    } catch (error) {
      console.error('Error creating port:', error);
      toast.error(error.response?.data?.detail || 'Failed to create port');
    }
  };

  const handleCreateContainer = async () => {
    try {
      const payload = {
        ...containerForm,
        max_weight: parseFloat(containerForm.max_weight),
        max_cbm: parseFloat(containerForm.max_cbm)
      };
      
      const response = await axios.post(`${API}/containers`, payload);
      setContainers([...containers, response.data]);
      setContainerForm({
        container_type: '',
        max_weight: '',
        max_cbm: ''
      });
      setDialogOpen(false);
      toast.success('Container created successfully');
    } catch (error) {
      console.error('Error creating container:', error);
      toast.error(error.response?.data?.detail || 'Failed to create container');
    }
  };

  const renderSKUDialog = () => (
    <DialogContent data-testid="sku-dialog">
      <DialogHeader>
        <DialogTitle>Add New SKU</DialogTitle>
        <DialogDescription>Create a new Stock Keeping Unit with specifications</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="sku_code" className="text-right">SKU Code</Label>
          <Input
            id="sku_code"
            value={skuForm.sku_code}
            onChange={(e) => setSkuForm({...skuForm, sku_code: e.target.value})}
            className="col-span-3"
            data-testid="sku-code-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">Description</Label>
          <Input
            id="description"
            value={skuForm.description}
            onChange={(e) => setSkuForm({...skuForm, description: e.target.value})}
            className="col-span-3"
            data-testid="sku-description-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="hsn_code" className="text-right">HSN Code</Label>
          <Input
            id="hsn_code"
            value={skuForm.hsn_code}
            onChange={(e) => setSkuForm({...skuForm, hsn_code: e.target.value})}
            className="col-span-3"
            data-testid="sku-hsn-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="micron" className="text-right">Micron</Label>
          <Input
            id="micron"
            type="number"
            value={skuForm.micron}
            onChange={(e) => setSkuForm({...skuForm, micron: e.target.value})}
            className="col-span-3"
            data-testid="sku-micron-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="weight_per_unit" className="text-right">Weight/Unit (KG)</Label>
          <Input
            id="weight_per_unit"
            type="number"
            step="0.001"
            value={skuForm.weight_per_unit}
            onChange={(e) => setSkuForm({...skuForm, weight_per_unit: e.target.value})}
            className="col-span-3"
            data-testid="sku-weight-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="cbm_per_unit" className="text-right">CBM/Unit</Label>
          <Input
            id="cbm_per_unit"
            type="number"
            step="0.001"
            value={skuForm.cbm_per_unit}
            onChange={(e) => setSkuForm({...skuForm, cbm_per_unit: e.target.value})}
            className="col-span-3"
            data-testid="sku-cbm-input"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreateSku} data-testid="create-sku-btn">Create SKU</Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderSupplierDialog = () => (
    <DialogContent data-testid="supplier-dialog">
      <DialogHeader>
        <DialogTitle>Add New Supplier</DialogTitle>
        <DialogDescription>Register a new supplier with contact details</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Name</Label>
          <Input
            id="name"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
            className="col-span-3"
            data-testid="supplier-name-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="code" className="text-right">Code</Label>
          <Input
            id="code"
            value={supplierForm.code}
            onChange={(e) => setSupplierForm({...supplierForm, code: e.target.value})}
            className="col-span-3"
            data-testid="supplier-code-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="base_currency" className="text-right">Base Currency</Label>
          <Select value={supplierForm.base_currency} onValueChange={(value) => setSupplierForm({...supplierForm, base_currency: value})}>
            <SelectTrigger className="col-span-3" data-testid="supplier-currency-select">
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="contact_email" className="text-right">Email</Label>
          <Input
            id="contact_email"
            type="email"
            value={supplierForm.contact_email}
            onChange={(e) => setSupplierForm({...supplierForm, contact_email: e.target.value})}
            className="col-span-3"
            data-testid="supplier-email-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="contact_phone" className="text-right">Phone</Label>
          <Input
            id="contact_phone"
            value={supplierForm.contact_phone}
            onChange={(e) => setSupplierForm({...supplierForm, contact_phone: e.target.value})}
            className="col-span-3"
            data-testid="supplier-phone-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="address" className="text-right">Address</Label>
          <Input
            id="address"
            value={supplierForm.address}
            onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
            className="col-span-3"
            data-testid="supplier-address-input"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreateSupplier} data-testid="create-supplier-btn">Create Supplier</Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderPortDialog = () => (
    <DialogContent data-testid="port-dialog">
      <DialogHeader>
        <DialogTitle>Add New Port</DialogTitle>
        <DialogDescription>Register a new port for shipping operations</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="port_name" className="text-right">Name</Label>
          <Input
            id="port_name"
            value={portForm.name}
            onChange={(e) => setPortForm({...portForm, name: e.target.value})}
            className="col-span-3"
            data-testid="port-name-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="port_code" className="text-right">Code</Label>
          <Input
            id="port_code"
            value={portForm.code}
            onChange={(e) => setPortForm({...portForm, code: e.target.value})}
            className="col-span-3"
            data-testid="port-code-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="country" className="text-right">Country</Label>
          <Input
            id="country"
            value={portForm.country}
            onChange={(e) => setPortForm({...portForm, country: e.target.value})}
            className="col-span-3"
            data-testid="port-country-input"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreatePort} data-testid="create-port-btn">Create Port</Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderContainerDialog = () => (
    <DialogContent data-testid="container-dialog">
      <DialogHeader>
        <DialogTitle>Add Container Type</DialogTitle>
        <DialogDescription>Define container specifications and limits</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="container_type" className="text-right">Type</Label>
          <Select value={containerForm.container_type} onValueChange={(value) => setContainerForm({...containerForm, container_type: value})}>
            <SelectTrigger className="col-span-3" data-testid="container-type-select">
              <SelectValue placeholder="Select container type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20FT">20FT</SelectItem>
              <SelectItem value="40FT">40FT</SelectItem>
              <SelectItem value="40HC">40HC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="max_weight" className="text-right">Max Weight (KG)</Label>
          <Input
            id="max_weight"
            type="number"
            value={containerForm.max_weight}
            onChange={(e) => setContainerForm({...containerForm, max_weight: e.target.value})}
            className="col-span-3"
            data-testid="container-weight-input"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="max_cbm" className="text-right">Max CBM</Label>
          <Input
            id="max_cbm"
            type="number"
            step="0.1"
            value={containerForm.max_cbm}
            onChange={(e) => setContainerForm({...containerForm, max_cbm: e.target.value})}
            className="col-span-3"
            data-testid="container-cbm-input"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreateContainer} data-testid="create-container-btn">Create Container</Button>
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
    <div className="space-y-6 fade-in-up" data-testid="master-data-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Master Data</h1>
          <p className="text-gray-600 mt-1">Manage SKUs, suppliers, ports, and container specifications</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="skus" data-testid="tab-skus">SKUs</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="ports" data-testid="tab-ports">Ports</TabsTrigger>
          <TabsTrigger value="containers" data-testid="tab-containers">Containers</TabsTrigger>
        </TabsList>

        <TabsContent value="skus" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                SKU Master ({skus.length})
              </CardTitle>
              <Dialog open={dialogOpen && activeTab === 'skus'} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-sku-btn">
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
                      <th className="text-left p-3 font-medium">HSN Code</th>
                      <th className="text-left p-3 font-medium">Weight/Unit</th>
                      <th className="text-left p-3 font-medium">CBM/Unit</th>
                      <th className="text-left p-3 font-medium">Micron</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map((sku) => (
                      <tr key={sku.id} className="table-row border-b" data-testid={`sku-row-${sku.sku_code}`}>
                        <td className="p-3 font-medium">{sku.sku_code}</td>
                        <td className="p-3">{sku.description}</td>
                        <td className="p-3">{sku.hsn_code}</td>
                        <td className="p-3">{sku.weight_per_unit} KG</td>
                        <td className="p-3">{sku.cbm_per_unit} CBM</td>
                        <td className="p-3">{sku.micron || 'N/A'}</td>
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
                Supplier Master ({suppliers.length})
              </CardTitle>
              <Dialog open={dialogOpen && activeTab === 'suppliers'} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-supplier-btn">
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
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Currency</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="table-row border-b" data-testid={`supplier-row-${supplier.code}`}>
                        <td className="p-3 font-medium">{supplier.code}</td>
                        <td className="p-3">{supplier.name}</td>
                        <td className="p-3">
                          <Badge variant="secondary">{supplier.base_currency}</Badge>
                        </td>
                        <td className="p-3">{supplier.contact_email}</td>
                        <td className="p-3">{supplier.contact_phone}</td>
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

        <TabsContent value="ports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Port Master ({ports.length})
              </CardTitle>
              <Dialog open={dialogOpen && activeTab === 'ports'} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-port-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Port
                  </Button>
                </DialogTrigger>
                {renderPortDialog()}
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ports.map((port) => (
                      <tr key={port.id} className="table-row border-b" data-testid={`port-row-${port.code}`}>
                        <td className="p-3 font-medium">{port.code}</td>
                        <td className="p-3">{port.name}</td>
                        <td className="p-3">{port.country}</td>
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

        <TabsContent value="containers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Container className="w-5 h-5" />
                Container Master ({containers.length})
              </CardTitle>
              <Dialog open={dialogOpen && activeTab === 'containers'} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-container-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Container
                  </Button>
                </DialogTrigger>
                {renderContainerDialog()}
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Max Weight</th>
                      <th className="text-left p-3 font-medium">Max CBM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.id} className="table-row border-b" data-testid={`container-row-${container.container_type}`}>
                        <td className="p-3">
                          <Badge variant="outline">{container.container_type}</Badge>
                        </td>
                        <td className="p-3">{container.max_weight} KG</td>
                        <td className="p-3">{container.max_cbm} CBM</td>
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
    </div>
  );
};

export default MasterData;