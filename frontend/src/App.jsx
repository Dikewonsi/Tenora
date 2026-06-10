import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DemandPreview from './pages/DemandPreview';
import Leases from './pages/Leases';
import Login from './pages/Login';
import Payments from './pages/Payments';
import Properties from './pages/Properties';
import Settings from './pages/Settings';
import Tenants from './pages/Tenants';
import Units from './pages/Units';
import ServiceChargeBudgets from './pages/ServiceChargeBudgets';
import ServiceChargeBudgetSchedule from './pages/ServiceChargeBudgetSchedule';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: '/dashboard',
            element: <Dashboard />
          },
          {
            path: '/properties',
            element: <Properties />
          },
          {
            path: '/tenants',
            element: <Tenants />
          },
          {
            path: '/units',
            element: <Units />
          },
          {
            path: '/leases',
            element: <Leases />
          },
          {
            path: '/payments',
            element: <Payments />
          },
          {
            path: '/service-charges',
            element: <ServiceChargeBudgets />
          },
          {
            path: '/service-charges/:budgetId/schedule',
            element: <ServiceChargeBudgetSchedule />
          },
          {
            path: '/service-charges/:demandId/document',
            element: <DemandPreview />
          },
          {
            path: '/settings',
            element: <Settings />
          }
        ]
      }
    ]
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />
  }
]);

const App = () => (
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);

export default App;
