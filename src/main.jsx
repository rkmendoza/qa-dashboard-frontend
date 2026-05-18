import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import TestCases from './pages/TestCases'
import Documents from './pages/Documents'
import './index.css'
import Register from './pages/Register'
import TestPlans from './pages/TestPlans'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Analytics />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="testcases" element={<TestCases />} />
            <Route path="documents" element={<Documents />} />
            <Route path="testplans" element={<TestPlans />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)