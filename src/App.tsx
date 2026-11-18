import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './presentation/shared/ToastProvider';
import { ClientBookingPage } from './presentation/client/ClientBookingPage';
import { AdminDashboardPage } from './presentation/admin/AdminDashboardPage';
import { AdminLoginPage } from './presentation/admin/AdminLoginPage';

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Vista Pública Móvil para Clientes */}
          <Route path="/" element={<ClientBookingPage />} />

          {/* Panel Privado del Barbero */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
