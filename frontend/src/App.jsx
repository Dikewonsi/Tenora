import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Leases from './pages/Leases';
import Login from './pages/Login';
import Payments from './pages/Payments';
import Properties from './pages/Properties';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import ServiceCharges from './pages/ServiceCharges';
import Settings from './pages/Settings';
import Tenants from './pages/Tenants';

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
            path: '/leases',
            element: <Leases />
          },
          {
            path: '/payments',
            element: <Payments />
          },
          {
            path: '/service-charges',
            element: <ServiceCharges />
          },
          {
            path: '/reminders',
            element: <Reminders />
          },
          {
            path: '/reports',
            element: <Reports />
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
