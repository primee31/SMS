import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

import { Login } from './pages/auth/Login.jsx';
import { Register } from './pages/auth/Register.jsx';
import { ForgotPassword } from './pages/auth/ForgotPassword.jsx';
import { ResetPassword } from './pages/auth/ResetPassword.jsx';

import { AdminDashboard } from './pages/dashboard/AdminDashboard.jsx';
import { StaffDashboard } from './pages/dashboard/StaffDashboard.jsx';
import { CustomerDashboard } from './pages/dashboard/CustomerDashboard.jsx';
import { QuotationsPage } from './pages/quotations/QuotationsPage.jsx';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage.jsx';
import { InvoicesPage } from './pages/invoices/InvoicesPage.jsx';
import { ProductsPage } from './pages/products/ProductsPage.jsx';
import { PlansPage } from './pages/plans/PlansPage.jsx';
import { CustomersPage } from './pages/customers/CustomersPage.jsx';
import { UsersPage } from './pages/users/UsersPage.jsx';
import { NotFound } from './pages/NotFound.jsx';

function HomeRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'STAFF') {
    return <Navigate to="/staff" replace />;
  }

  return <Navigate to="/customer" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Role-Protected Dashboards */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catalog & Master Management */}
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              {/* Billing & Order Management Routes */}
              <Route
                path="/quotations"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
                    <QuotationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
                    <SubscriptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}>
                    <InvoicesPage />
                  </ProtectedRoute>
                }
              />

              {/* Home & Fallback Routes */}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
