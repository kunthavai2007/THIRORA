import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute() {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading-screen" style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        background: 'var(--bg-page, #f4f7fb)',
        color: 'var(--text-main, #102a43)',
        fontFamily: 'inherit'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{
            width: '44px',
            height: '44px',
            border: '3px solid rgba(23, 63, 112, 0.2)',
            borderTopColor: '#173f70',
            borderRadius: '50%',
            animation: 'cf-spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Authenticating Thirora...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
