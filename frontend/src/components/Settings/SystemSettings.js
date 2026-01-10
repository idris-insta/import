import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Settings, Building2, FileText, List, Plus, X, Save, Upload, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    header_text: '',
    footer_text: '',
    show_duty_rate_on_pdf: false,
    categories: [],
    adhesive_types: [],
    liner_colors: [],
    shipping_marks: [],
    order_statuses: []
  });
  
  const [newItem, setNewItem] = useState({
    categories: '',
    adhesive_types: '',
    liner_colors: '',
    shipping_marks: '',
    order_statuses: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setFormData({
        company_name: response.data.company_name || '',
        company_address: response.data.company_address || '',
        company_phone: response.data.company_phone || '',
        company_email: response.data.company_email || '',
        header_text: response.data.header_text || 'PURCHASE ORDER',
        footer_text: response.data.footer_text || '',
        show_duty_rate_on_pdf: response.data.show_duty_rate_on_pdf || false,
        categories: response.data.categories || [],
        adhesive_types: response.data.adhesive_types || [],
        liner_colors: response.data.liner_colors || [],
        shipping_marks: response.data.shipping_marks || [],
        order_statuses: response.data.order_statuses || []
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, formData);
      toast.success('Settings saved successfully');
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const response = await axios.post(`${API}/settings/logo`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Logo uploaded successfully');
      await fetchSettings();
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    }
  };

  const handleAddItem = (field) => {
    const value = newItem[field].trim();
    if (!value) return;
    
    if (formData[field].includes(value)) {
      toast.error('Item already exists');
      return;
    }
    
    setFormData({
      ...formData,
      [field]: [...formData[field], value]
    });
    setNewItem({ ...newItem, [field]: '' });
  };

  const handleRemoveItem = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const renderDropdownEditor = (field, label, description) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {formData[field]?.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="flex items-center gap-1 px-3 py-1">
              {item}
              <button
                onClick={() => handleRemoveItem(field, idx)}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {formData[field]?.length === 0 && (
            <span className="text-sm text-gray-500">No items added</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newItem[field]}
            onChange={(e) => setNewItem({ ...newItem, [field]: e.target.value })}
            placeholder={`Add new ${label.toLowerCase().replace(' options', '')}`}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem(field)}
          />
          <Button onClick={() => handleAddItem(field)} variant="outline" size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="system-settings-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configure company details, document templates, and dropdown options</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="dropdowns" data-testid="tab-dropdowns">
            <List className="w-4 h-4 mr-2" />
            Dropdowns
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>This information will appear on generated documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your Company Name"
                    data-testid="company-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_email">Email</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                    placeholder="company@example.com"
                    data-testid="company-email-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_phone">Phone</Label>
                  <Input
                    id="company_phone"
                    value={formData.company_phone}
                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    data-testid="company-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {settings?.logo_url && (
                      <img
                        src={`${BACKEND_URL}${settings.logo_url}`}
                        alt="Company Logo"
                        className="h-12 w-auto object-contain border rounded"
                      />
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="upload-logo-btn"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {settings?.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_address">Address</Label>
                <Textarea
                  id="company_address"
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  placeholder="123 Business Street, City, State, ZIP"
                  rows={3}
                  data-testid="company-address-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Settings */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Template Settings</CardTitle>
              <CardDescription>Customize headers, footers, and display options for generated documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="header_text">Document Header Text</Label>
                <Input
                  id="header_text"
                  value={formData.header_text}
                  onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                  placeholder="PURCHASE ORDER"
                  data-testid="header-text-input"
                />
                <p className="text-xs text-gray-500">This text appears as the main title on PDF documents</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer_text">Document Footer Text</Label>
                <Textarea
                  id="footer_text"
                  value={formData.footer_text}
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                  placeholder="Thank you for your business. Terms and conditions apply."
                  rows={2}
                  data-testid="footer-text-input"
                />
                <p className="text-xs text-gray-500">This text appears at the bottom of PDF documents</p>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Show Import Duty Rate on PDF</Label>
                  <p className="text-xs text-gray-500 mt-1">When disabled, duty rate will be hidden from exported documents</p>
                </div>
                <Switch
                  checked={formData.show_duty_rate_on_pdf}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_duty_rate_on_pdf: checked })}
                  data-testid="show-duty-switch"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dropdown Settings */}
        <TabsContent value="dropdowns" className="space-y-4">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dropdown Options Management</CardTitle>
              <CardDescription>Add or remove options that appear in dropdown menus throughout the system</CardDescription>
            </CardHeader>
          </Card>
          
          {renderDropdownEditor('categories', 'Category Options', 'Categories for SKU/Item classification')}
          {renderDropdownEditor('adhesive_types', 'Adhesive Type Options', 'Types of adhesive for products')}
          {renderDropdownEditor('liner_colors', 'Liner Color Options', 'Available liner colors')}
          {renderDropdownEditor('shipping_marks', 'Shipping Mark Options', 'Standard shipping marks and labels')}
          {renderDropdownEditor('order_statuses', 'Order Status Options', 'Available statuses for purchase orders')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
