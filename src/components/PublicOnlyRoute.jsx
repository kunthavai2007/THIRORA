import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function PublicOnlyRoute() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return null
  }

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
