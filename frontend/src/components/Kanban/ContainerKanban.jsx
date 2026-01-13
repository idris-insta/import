import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner';
import { 
  Package, Ship, Truck, CheckCircle, Clock, MapPin, 
  AlertTriangle, RefreshCw, Eye, Box, Anchor, Calendar
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Kanban columns definition
const KANBAN_COLUMNS = [
  { id: 'Draft', title: 'Draft', icon: Clock, color: 'bg-gray-100 border-gray-300', headerColor: 'bg-gray-500' },
  { id: 'Confirmed', title: 'Confirmed', icon: CheckCircle, color: 'bg-blue-50 border-blue-300', headerColor: 'bg-blue-500' },
  { id: 'Loaded', title: 'Loaded', icon: Package, color: 'bg-purple-50 border-purple-300', headerColor: 'bg-purple-500' },
  { id: 'Shipped', title: 'Shipped', icon: Ship, color: 'bg-indigo-50 border-indigo-300', headerColor: 'bg-indigo-500' },
  { id: 'In Transit', title: 'In Transit', icon: Truck, color: 'bg-cyan-50 border-cyan-300', headerColor: 'bg-cyan-500' },
  { id: 'Arrived', title: 'Arrived', icon: Anchor, color: 'bg-orange-50 border-orange-300', headerColor: 'bg-orange-500' },
  { id: 'Delivered', title: 'Delivered', icon: CheckCircle, color: 'bg-green-50 border-green-300', headerColor: 'bg-green-500' }
];

// Sortable container card component
const ContainerCard = ({ container, onView }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: container.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isDragging ? 'ring-2 ring-blue-400' : ''}`}
      data-testid={`kanban-card-${container.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">{container.po_number}</div>
          <div className="text-xs text-gray-500">{container.supplier_name}</div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); onView(container); }}
          className="h-6 w-6 p-0"
          data-testid={`view-card-${container.id}`}
        >
          <Eye className="w-3 h-3" />
        </Button>
      </div>
      
      <div className="space-y-1 text-xs">
        {container.container_number && (
          <div className="flex items-center gap-1 text-gray-600">
            <Box className="w-3 h-3" />
            <span>{container.container_number}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-gray-600">
          <Package className="w-3 h-3" />
          <span>{container.container_type}</span>
        </div>
        {container.eta && (
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>ETA: {new Date(container.eta).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">
          {container.currency} {container.total_value?.toLocaleString()}
        </span>
        <Badge variant="outline" className="text-xs">
          {container.total_packages || 0} pkg
        </Badge>
      </div>
    </div>
  );
};

// Kanban column component
const KanbanColumn = ({ column, containers, onView }) => {
  const Icon = column.icon;
  
  return (
    <div className={`flex flex-col min-w-[280px] max-w-[280px] rounded-lg border-2 ${column.color}`}>
      <div className={`${column.headerColor} text-white p-3 rounded-t-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{column.title}</span>
          </div>
          <Badge className="bg-white/20 text-white text-xs">
            {containers.length}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 p-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto">
        <SortableContext items={containers.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {containers.map((container) => (
            <ContainerCard key={container.id} container={container} onView={onView} />
          ))}
        </SortableContext>
        
        {containers.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-xs">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No containers
          </div>
        )}
      </div>
    </div>
  );
};

const ContainerKanban = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeContainer, setActiveContainer] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [updating, setUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/import-orders`);
      // Filter only relevant statuses for kanban
      const kanbanStatuses = KANBAN_COLUMNS.map(c => c.id);
      const filteredContainers = response.data.filter(order => 
        kanbanStatuses.includes(order.status) && order.status !== 'Cancelled'
      );
      setContainers(filteredContainers);
    } catch (error) {
      console.error('Failed to fetch containers:', error);
      toast.error('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  const getContainersByStatus = (status) => {
    return containers.filter(c => c.status === status);
  };

  const handleDragStart = (event) => {
    const container = containers.find(c => c.id === event.active.id);
    setActiveContainer(container);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveContainer(null);
    
    if (!over) return;
    
    // Find which column the card was dropped on
    const draggedContainer = containers.find(c => c.id === active.id);
    if (!draggedContainer) return;
    
    // Determine target status from drop location
    let targetStatus = null;
    
    // Check if dropped on a column header or empty area
    const overColumn = KANBAN_COLUMNS.find(col => col.id === over.id);
    if (overColumn) {
      targetStatus = overColumn.id;
    } else {
      // Dropped on another card - find that card's column
      const targetContainer = containers.find(c => c.id === over.id);
      if (targetContainer) {
        targetStatus = targetContainer.status;
      }
    }
    
    if (!targetStatus || targetStatus === draggedContainer.status) return;
    
    // Validate status transition
    const currentIndex = KANBAN_COLUMNS.findIndex(c => c.id === draggedContainer.status);
    const targetIndex = KANBAN_COLUMNS.findIndex(c => c.id === targetStatus);
    
    // Allow forward movement and one step backward
    if (targetIndex < currentIndex - 1) {
      toast.warning('Cannot move container more than one step backward');
      return;
    }
    
    // Update status on server
    setUpdating(true);
    try {
      await axios.put(`${API}/import-orders/${draggedContainer.id}/status?status=${targetStatus}`);
      
      // Update local state
      setContainers(prev => prev.map(c => 
        c.id === draggedContainer.id ? { ...c, status: targetStatus } : c
      ));
      
      toast.success(`Container moved to ${targetStatus}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.detail || 'Failed to update container status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDragOver = (event) => {
    // This helps with dropping on columns
  };

  const handleViewContainer = (container) => {
    setSelectedContainer(container);
    setViewDialogOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading Kanban board...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up" data-testid="container-kanban">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Container Status Board</h1>
          <p className="text-sm text-gray-600 mt-1">Drag and drop containers to update their status</p>
        </div>
        <Button onClick={fetchContainers} variant="outline" disabled={loading || updating}>
          <RefreshCw className={`w-4 h-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span>Drag cards between columns to update container status. Forward movement is allowed, backward movement is limited to one step.</span>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                containers={getContainersByStatus(column.id)}
                onView={handleViewContainer}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeContainer && (
              <div className="bg-white rounded-lg border-2 border-blue-400 shadow-xl p-3 w-[260px] opacity-90">
                <div className="font-semibold text-sm text-gray-900">{activeContainer.po_number}</div>
                <div className="text-xs text-gray-500">{activeContainer.supplier_name}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline">{activeContainer.container_type}</Badge>
                  <span className="text-xs text-gray-600">
                    {activeContainer.currency} {activeContainer.total_value?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Container Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="kanban-detail-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Container Details - {selectedContainer?.po_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedContainer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-blue-600">Status</p>
                    <p className="text-lg font-bold text-blue-900">{selectedContainer.status}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-purple-600">Container Type</p>
                    <p className="text-lg font-bold text-purple-900">{selectedContainer.container_type}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-green-600">Packages</p>
                    <p className="text-lg font-bold text-green-900">{selectedContainer.total_packages || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-yellow-600">Value</p>
                    <p className="text-lg font-bold text-yellow-900">
                      {selectedContainer.currency} {selectedContainer.total_value?.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Container Number</p>
                  <p className="font-medium">{selectedContainer.container_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vessel Name</p>
                  <p className="font-medium">{selectedContainer.vessel_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">BL Number</p>
                  <p className="font-medium">{selectedContainer.bl_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedContainer.supplier_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ETD</p>
                  <p className="font-medium">{formatDate(selectedContainer.etd)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ETA</p>
                  <p className="font-medium">{formatDate(selectedContainer.eta)}</p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Items ({selectedContainer.items?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="p-2 text-left">SKU</th>
                          <th className="p-2 text-left">Description</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedContainer.items?.map((item, idx) => (
                          <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="p-2 font-medium">{item.sku_code || item.sku_id?.slice(0, 8)}</td>
                            <td className="p-2 text-xs">{item.item_description || '-'}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{selectedContainer.currency} {item.unit_price}</td>
                            <td className="p-2 text-right font-medium">{selectedContainer.currency} {item.total_value?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContainerKanban;
