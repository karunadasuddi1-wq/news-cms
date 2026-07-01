import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, can } = useAuth();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper-50">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !can.manageUsers) return <Navigate to="/" replace />;
  return children;
}
