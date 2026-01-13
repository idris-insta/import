import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { 
  Upload, FileText, Download, Trash2, Eye, Plus, Edit,
  AlertTriangle, CheckCircle, Clock, FileCheck, Files, X
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DocumentVault = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [batchUploadDialogOpen, setBatchUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [batchFiles, setBatchFiles] = useState([]);
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState(null);
  const batchInputRef = useRef(null);

  const documentTypes = [
    { value: 'Bill of Lading', label: 'Bill of Lading', icon: FileText, color: 'text-blue-600' },
    { value: 'Commercial Invoice', label: 'Commercial Invoice', icon: FileCheck, color: 'text-green-600' },
    { value: 'Packing List', label: 'Packing List', icon: FileText, color: 'text-orange-600' },
    { value: 'Bill of Entry', label: 'Bill of Entry', icon: FileCheck, color: 'text-purple-600' },
    { value: 'Certificate', label: 'Certificate', icon: FileCheck, color: 'text-indigo-600' },
    { value: 'Other', label: 'Other', icon: FileText, color: 'text-gray-600' }
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      fetchDocuments();
      fetchDocumentStatus();
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/import-orders`);
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents/order/${selectedOrder}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const fetchDocumentStatus = async () => {
    try {
      const response = await axios.get(`${API}/documents/status/${selectedOrder}`);
      setDocumentStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch document status:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentType || !selectedOrder) {
      toast.error('Please select a file, document type, and order');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('import_order_id', selectedOrder);
    formData.append('document_type', documentType);
    if (notes) formData.append('notes', notes);

    try {
      await axios.post(`${API}/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Document uploaded successfully');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('');
      setNotes('');
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`${API}/documents/${documentId}`);
      toast.success('Document deleted successfully');
      await fetchDocuments();
      await fetchDocumentStatus();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleBatchFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setBatchFiles(files.map(file => ({
      file,
      type: 'Other',
      notes: ''
    })));
  };

  const updateBatchFile = (index, field, value) => {
    setBatchFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeBatchFile = (index) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadBatchDocuments = async () => {
    if (batchFiles.length === 0 || !selectedOrder) {
      toast.error('Please select files and an order');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    batchFiles.forEach(bf => {
      formData.append('files', bf.file);
    });
    
    formData.append('import_order_id', selectedOrder);
    formData.append('document_types', JSON.stringify(batchFiles.map(bf => bf.type)));
    formData.append('notes', JSON.stringify(batchFiles.map(bf => bf.notes)));

    try {
      const response = await axios.post(`${API}/documents/batch-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const result = response.data;
      if (result.errors && result.errors.length > 0) {
        toast.warning(`Uploaded ${result.uploaded.length} files. ${result.errors.length} errors.`);
      } else {
        toast.success(`${result.uploaded.length} documents uploaded successfully`);
      }
      
      setBatchUploadDialogOpen(false);
      setBatchFiles([]);
      await fetchDocuments();
      await fetchDocumentStatus();
    } catch (error) {
      console.error('Failed to upload documents:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (doc) => {
    setEditingDocument(doc);
    setDocumentType(doc.document_type);
    setNotes(doc.notes || '');
    setEditDialogOpen(true);
  };

  const updateDocument = async () => {
    if (!editingDocument) return;

    try {
      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('notes', notes);

      await axios.put(`${API}/documents/${editingDocument.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Document updated successfully');
      setEditDialogOpen(false);
      setEditingDocument(null);
      setDocumentType('');
      setNotes('');
      await fetchDocuments();
      await fetchDocumentStatus();
    } catch (error) {
      console.error('Failed to update document:', error);
      toast.error(error.response?.data?.detail || 'Failed to update document');
    }
  };

  const getDocumentIcon = (type) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType ? docType.icon : FileText;
  };

  const getDocumentColor = (type) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType ? docType.color : 'text-gray-600';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getOrderComplianceStatus = (orderId) => {
    const orderDocs = documents.filter(doc => doc.import_order_id === orderId);
    const requiredDocs = ['Bill of Lading', 'Commercial Invoice', 'Packing List', 'Bill of Entry'];
    const presentDocs = orderDocs.map(doc => doc.document_type);
    const missingDocs = requiredDocs.filter(req => !presentDocs.includes(req));
    
    if (missingDocs.length === 0) {
      return { status: 'Complete', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
    } else if (missingDocs.length < requiredDocs.length) {
      return { status: 'Partial', color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock };
    } else {
      return { status: 'Incomplete', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg font-medium text-gray-600">Loading document vault...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="document-vault-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-gray-600 mt-1">Centralized document management for import orders</p>
          <p className="text-sm text-blue-600 mt-1">📋 Documents are optional - orders can proceed without them</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Batch Upload Dialog */}
          <Dialog open={batchUploadDialogOpen} onOpenChange={setBatchUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!selectedOrder} data-testid="batch-upload-btn">
                <Files className="w-4 h-4 mr-2" />
                Batch Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="batch-upload-dialog">
              <DialogHeader>
                <DialogTitle>Batch Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload multiple documents at once. Documents are NOT mandatory - order can proceed without them.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="batch-files">Select Files</Label>
                  <Input
                    id="batch-files"
                    type="file"
                    multiple
                    ref={batchInputRef}
                    onChange={handleBatchFileSelect}
                    className="mt-2"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                    data-testid="batch-file-input"
                  />
                </div>
                
                {batchFiles.length > 0 && (
                  <div className="space-y-3">
                    <Label>Files to Upload ({batchFiles.length})</Label>
                    {batchFiles.map((bf, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium truncate max-w-[200px]">{bf.file.name}</span>
                            <span className="text-xs text-gray-500">({formatFileSize(bf.file.size)})</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeBatchFile(index)}
                            data-testid={`remove-batch-file-${index}`}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select 
                            value={bf.type} 
                            onValueChange={(val) => updateBatchFile(index, 'type', val)}
                          >
                            <SelectTrigger data-testid={`batch-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Notes (optional)"
                            value={bf.notes}
                            onChange={(e) => updateBatchFile(index, 'notes', e.target.value)}
                            data-testid={`batch-notes-${index}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBatchFiles([]); setBatchUploadDialogOpen(false); }}>
                  Cancel
                </Button>
                <Button onClick={uploadBatchDocuments} disabled={uploading || batchFiles.length === 0} data-testid="batch-upload-submit">
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {batchFiles.length} Files
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Single Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedOrder} data-testid="upload-document-btn">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
          <DialogContent data-testid="upload-dialog">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload a document for the selected import order</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="document_type" className="text-right">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="col-span-3" data-testid="document-type-select">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${type.color}`} />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  className="col-span-3"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  data-testid="file-input"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="col-span-3"
                  placeholder="Optional notes about this document"
                  data-testid="notes-textarea"
                />
              </div>
              {selectedFile && (
                <div className="col-span-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={uploadDocument} disabled={uploading} data-testid="upload-submit-btn">
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Order Selection */}
      <Card className="card-hover" data-testid="order-selection-card">
        <CardHeader>
          <CardTitle>Select Import Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order-select">Import Order</Label>
              <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                <SelectTrigger data-testid="order-select">
                  <SelectValue placeholder="Select an import order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => {
                    const compliance = getOrderComplianceStatus(order.id);
                    const ComplianceIcon = compliance.icon;
                    return (
                      <SelectItem key={order.id} value={order.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{order.po_number}</span>
                            <Badge variant="outline">{order.status}</Badge>
                          </div>
                          <div className={`flex items-center gap-1 ${compliance.color}`}>
                            <ComplianceIcon className="w-3 h-3" />
                            <span className="text-xs">{compliance.status}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {selectedOrder && (
              <div>
                <Label>Compliance Status</Label>
                <div className="mt-2">
                  {(() => {
                    const compliance = getOrderComplianceStatus(selectedOrder);
                    const ComplianceIcon = compliance.icon;
                    return (
                      <div className={`flex items-center gap-2 p-3 rounded-lg ${compliance.bg}`}>
                        <ComplianceIcon className={`w-5 h-5 ${compliance.color}`} />
                        <span className={`font-medium ${compliance.color}`}>
                          Document {compliance.status}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      {selectedOrder && (
        <Card className="card-hover" data-testid="documents-table-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Document Type</th>
                    <th className="text-left p-3 font-medium">Filename</th>
                    <th className="text-left p-3 font-medium">Size</th>
                    <th className="text-left p-3 font-medium">Uploaded</th>
                    <th className="text-left p-3 font-medium">Notes</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const DocIcon = getDocumentIcon(doc.document_type);
                    return (
                      <tr key={doc.id} className="table-row border-b" data-testid={`doc-row-${doc.id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <DocIcon className={`w-4 h-4 ${getDocumentColor(doc.document_type)}`} />
                            <span className="font-medium">{doc.document_type}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{doc.original_filename}</div>
                            <div className="text-xs text-gray-500">{doc.filename}</div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-sm">
                          {doc.notes ? (
                            <div className="max-w-xs truncate" title={doc.notes}>
                              {doc.notes}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`${BACKEND_URL}/uploads/${doc.filename}`, '_blank')}
                              data-testid={`view-doc-${doc.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${BACKEND_URL}/uploads/${doc.filename}`;
                                link.download = doc.original_filename;
                                link.click();
                              }}
                              data-testid={`download-doc-${doc.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`delete-doc-${doc.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {documents.length === 0 && (
                <div className="text-center py-8" data-testid="no-documents-message">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No documents found for this order</p>
                  <p className="text-sm text-gray-500 mt-1">Upload documents to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Requirements */}
      {selectedOrder && (
        <Card className="card-hover" data-testid="compliance-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Compliance Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { type: 'Bill of Lading', required: true },
                { type: 'Commercial Invoice', required: true },
                { type: 'Packing List', required: true },
                { type: 'Bill of Entry', required: true },
                { type: 'Certificate', required: false },
                { type: 'Other', required: false }
              ].map((req) => {
                const hasDoc = documents.some(doc => doc.document_type === req.type);
                const DocIcon = getDocumentIcon(req.type);
                return (
                  <div 
                    key={req.type} 
                    className={`p-4 border rounded-lg ${
                      hasDoc ? 'bg-green-50 border-green-200' : 
                      req.required ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`compliance-${req.type.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <DocIcon className={`w-5 h-5 ${getDocumentColor(req.type)}`} />
                      {hasDoc ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : req.required ? (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{req.type}</h4>
                    <p className="text-xs text-gray-600">
                      {hasDoc ? 'Uploaded' : req.required ? 'Required' : 'Optional'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentVault;