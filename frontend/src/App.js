import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'sonner';
import Login from './components/Auth/Login';
import EnhancedDashboard from './components/Dashboard/EnhancedDashboard';
import EnhancedMasterData from './components/MasterData/EnhancedMasterData';
import ImportOrders from './components/ImportOrders/ImportOrders';
import ActualLoading from './components/ActualLoading/ActualLoading';
import FinancialDashboard from './components/Financial/FinancialDashboard';
import DocumentVault from './components/DocumentVault/DocumentVault';
import EnhancedSidebar from './components/Layout/EnhancedSidebar';
import Header from './components/Layout/Header';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Setup axios interceptor for auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('icms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 403 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Don't redirect on permission errors, just let components handle it
      return Promise.reject(error);
    } else if (error.response?.status === 401) {
      // Only redirect on auth errors
      localStorage.removeItem('icms_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('icms_token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('icms_token');
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('icms_token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('icms_token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('icms_token');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg font-medium text-gray-600">Loading ICMS...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/" />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-gray-50">
                  <EnhancedSidebar user={user} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <Header user={user} onLogout={handleLogout} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                      <Routes>
                        <Route path="/" element={<EnhancedDashboard />} />
                        <Route path="/masters" element={<EnhancedMasterData />} />
                        <Route path="/import-orders" element={<ImportOrders />} />
                        <Route path="/actual-loading" element={<ActualLoading />} />
                        <Route path="/financial" element={<FinancialDashboard />} />
                        <Route path="/documents" element={<DocumentVault />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;