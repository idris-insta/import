import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Ship, Database, Package, TruckIcon, FileText, DollarSign, PieChart, Settings, Columns } from 'lucide-react';

const EnhancedSidebar = ({ user }) => {
  const location = useLocation();
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (user && user.permissions) {
      setPermissions(user.permissions);
    }
  }, [user]);

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };
  
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/', 
      icon: BarChart3, 
      testId: 'nav-dashboard',
      permission: 'view_dashboard'
    },
    { 
      name: 'Master Data', 
      href: '/masters', 
      icon: Database, 
      testId: 'nav-masters',
      permission: 'manage_masters'
    },
    { 
      name: 'Import Orders', 
      href: '/import-orders', 
      icon: Package, 
      testId: 'nav-orders',
      permission: 'view_orders'
    },
    { 
      name: 'Actual Loading', 
      href: '/actual-loading', 
      icon: TruckIcon, 
      testId: 'nav-loading',
      permission: 'view_orders'
    },
    { 
      name: 'Kanban Board', 
      href: '/kanban', 
      icon: Columns, 
      testId: 'nav-kanban',
      permission: 'view_orders'
    },
    { 
      name: 'Financial', 
      href: '/financial', 
      icon: DollarSign, 
      testId: 'nav-financial',
      permission: 'view_financials'
    },
    { 
      name: 'Documents', 
      href: '/documents', 
      icon: FileText, 
      testId: 'nav-documents',
      permission: 'manage_documents'
    },
    { 
      name: 'Reports', 
      href: '/reports', 
      icon: PieChart, 
      testId: 'nav-reports',
      permission: 'view_dashboard'
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings, 
      testId: 'nav-settings',
      permission: 'system_admin'
    },
  ];

  const getRoleColor = (role) => {
    const colors = {
      'Owner': 'bg-purple-500',
      'Logistics': 'bg-blue-500',
      'Accounts': 'bg-green-500',
      'Purchase': 'bg-orange-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const visibleNavigation = navigation.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className="w-64 sidebar-gradient shadow-2xl">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Ship className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ICMS</h1>
            <p className="text-xs text-blue-200">Complete System v2.0</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {visibleNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={item.testId}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* Role-based permissions indicator */}
        <div className="mt-8 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
          <h3 className="text-sm font-medium text-white mb-2">Access Level</h3>
          <div className="space-y-1">
            <div className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${getRoleColor(user?.role)}`}>
              {user?.role}
            </div>
            <p className="text-xs text-blue-200">
              {permissions.length} permissions granted
            </p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 ${getRoleColor(user?.role)} rounded-full flex items-center justify-center`}>
              <span className="text-white text-sm font-medium">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-blue-200">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSidebar;