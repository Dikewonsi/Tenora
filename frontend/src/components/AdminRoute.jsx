import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ allowedRoles = ['super_admin'] }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/settings" replace state={{ forbiddenFrom: location.pathname }} />;
  }

  return <Outlet />;
};

export default AdminRoute;
