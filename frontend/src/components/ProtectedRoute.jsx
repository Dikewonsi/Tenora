import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, isBootstrapping, isAccessExpired, isAccessLoading } = useAuth();
  const location = useLocation();

  if (isBootstrapping || isAccessLoading) {
    return (
      <div className="tenora-screen-center">
        <div className="spinner-border text-emerald" role="status" />
      </div>
    );
  }

  if (isAccessExpired) {
    return <Navigate to="/login" replace state={{ accessExpired: true }} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
