import { Component, useEffect, useState, type ReactNode } from 'react'
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

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; msg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, msg: '' }
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, msg: err.message }
  }
  componentDidCatch(err: Error) {
    console.error('PageErrorBoundary caught:', err)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Something went wrong</p>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 400, textAlign: 'center' }}>{this.state.msg}</p>
          <button
            onClick={() => { this.setState({ hasError: false, msg: '' }); window.location.reload() }}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >Reload page</button>
        </div>
      )
    }
    return this.props.children
  }
}

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
        path="/dashboard/finances"
        element={
          auth.status === 'authenticated'
            ? <Finances />
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
            ? <PageErrorBoundary><Scripts /></PageErrorBoundary>
            : auth.status === 'authenticated'
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/dashboard/scripts"
        element={
          auth.status === 'authenticated'
            ? <PageErrorBoundary><Scripts /></PageErrorBoundary>
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
