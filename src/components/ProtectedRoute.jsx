import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './Loader';
import AdminSecurityWrapper from './AdminSecurityWrapper';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <AdminSecurityWrapper>{children}</AdminSecurityWrapper>;
}
