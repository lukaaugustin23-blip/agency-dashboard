import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { getUserRole, signOut, type UserRole } from './lib/auth'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppDataProvider } from './contexts/AppDataContext'
import type { Session } from '@supabase/supabase-js'
import Login from './pages/Login'
import AccessDenied from './pages/AccessDenied'
import AdminDashboard from './pages/AdminDashboard'
import Finances from './pages/Finances'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Rejected from './pages/Rejected'
import Clients from './pages/Clients'
import Calendar from './pages/Calendar'
import Scripts from './pages/Scripts'
import AdminPanel from './pages/AdminPanel'

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'denied' }
  | { status: 'authenticated'; role: UserRole }

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const role = getUserRole(data.session.user.email ?? '')
        if (!role) {
          signOut().finally(() => navigate('/access-denied', { replace: true }))
        } else {
          navigate(role === 'admin' ? '/admin' : '/dashboard', { replace: true })
        }
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-bg-2 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes({ auth }: { auth: AuthState }) {
  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen bg-bg-2 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/login"
        element={
          auth.status === 'authenticated'
            ? <Navigate to={auth.role === 'admin' ? '/admin' : '/dashboard'} replace />
            : <Login />
        }
      />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route
        path="/admin"
        element={
          auth.status === 'authenticated' && auth.role === 'admin'
            ? <AdminDashboard />
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/finances"
        element={
          auth.status === 'authenticated' && auth.role === 'admin'
            ? <Finances />
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/leads"
        element={
          auth.status === 'authenticated' && auth.role === 'admin'
            ? <Leads />
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard"
        element={
          auth.status === 'authenticated'
            ? <Dashboard />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/leads"
        element={
          auth.status === 'authenticated'
            ? <Leads />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/rejected"
        element={
          auth.status === 'authenticated'
            ? <Rejected />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/rejected"
        element={
          auth.status === 'authenticated'
            ? <Rejected />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/clients"
        element={
          auth.status === 'authenticated'
            ? <Clients />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/clients"
        element={
          auth.status === 'authenticated'
            ? <Clients />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/calendar"
        element={
          auth.status === 'authenticated' && auth.role === 'admin'
            ? <Calendar />
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/calendar"
        element={
          auth.status === 'authenticated'
            ? <Calendar />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/scripts"
        element={
          auth.status === 'authenticated' && auth.role === 'admin'
            ? <Scripts />
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/scripts"
        element={
          auth.status === 'authenticated'
            ? <Scripts />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin/panel"
        element={
          auth.status === 'authenticated' && auth.role === 'admin'
            ? <AdminPanel />
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={
          auth.status === 'unauthenticated' || auth.status === 'denied'
            ? <Navigate to="/login" replace />
            : auth.status === 'authenticated'
            ? <Navigate to={auth.role === 'admin' ? '/admin' : '/dashboard'} replace />
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  )
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    function handleSession(session: Session | null) {
      if (!session) {
        setAuth({ status: 'unauthenticated' })
        return
      }
      const role = getUserRole(session.user.email ?? '')
      if (!role) {
        signOut()
        setAuth({ status: 'denied' })
        return
      }
      setAuth({ status: 'authenticated', role })
    }

    supabase.auth.getSession().then(({ data }) => handleSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppDataProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes auth={auth} />
        </BrowserRouter>
      </ThemeProvider>
    </AppDataProvider>
  )
}
