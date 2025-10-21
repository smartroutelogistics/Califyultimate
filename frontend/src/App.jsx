import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import LeadUpload from './pages/LeadUpload';
import AgentConsole from './pages/AgentConsole';
import Reports from './pages/Reports';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="upload" element={<LeadUpload />} />
          <Route path="agent-console" element={<AgentConsole />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
