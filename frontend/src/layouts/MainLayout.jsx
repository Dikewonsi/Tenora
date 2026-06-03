import {
  IconBell,
  IconBuildingCommunity,
  IconBuildingEstate,
  IconChartBar,
  IconFileInvoice,
  IconHomeStats,
  IconLogout,
  IconMenu2,
  IconReceipt,
  IconSettings,
  IconUsers
} from '@tabler/icons-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: IconHomeStats },
  { label: 'Properties', path: '/properties', icon: IconBuildingEstate },
  { label: 'Tenants', path: '/tenants', icon: IconUsers },
  { label: 'Leases', path: '/leases', icon: IconFileInvoice },
  { label: 'Payments', path: '/payments', icon: IconReceipt },
  { label: 'Reminders', path: '/reminders', icon: IconBell },
  { label: 'Reports', path: '/reports', icon: IconChartBar },
  { label: 'Settings', path: '/settings', icon: IconSettings }
];

const MainLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-vh-100 d-flex" style={{ background: '#f8fffb' }}>
      <aside
        className="d-none d-lg-flex flex-column p-4"
        style={{
          width: 280,
          background: 'linear-gradient(180deg, #064e3b 0%, #059669 100%)',
          color: '#fff'
        }}
      >
        <div className="d-flex align-items-center gap-3 mb-5">
          <div
            className="d-flex align-items-center justify-content-center rounded-4 bg-white"
            style={{ width: 52, height: 52, color: '#059669' }}
          >
            <IconBuildingCommunity size={28} />
          </div>
          <div>
            <h2 className="h2 fw-bold mb-0">Tenora</h2>
            <small style={{ color: 'rgba(255,255,255,.75)' }}>Property Management</small>
          </div>
        </div>

        <nav className="d-grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `d-flex align-items-center gap-3 px-3 py-3 rounded-4 text-decoration-none fw-semibold ${
                    isActive ? 'bg-white text-success shadow-sm' : 'text-white'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? '#ffffff' : 'rgba(255,255,255,.08)'
                })}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            className="btn w-100 rounded-4 fw-bold"
            style={{
              background: 'rgba(255,255,255,.15)',
              color: '#fff'
            }}
          >
            <IconLogout size={20} className="me-2" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-fill">
        <header className="bg-white border-bottom">
          <div className="container-fluid px-4 py-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-light d-lg-none">
                <IconMenu2 size={22} />
              </button>
              <div>
                <h1 className="h3 fw-bold mb-0">Dashboard</h1>
                <small className="text-secondary">Welcome back to Tenora</small>
              </div>
            </div>

            <button
              className="btn rounded-4 fw-bold text-white"
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Add Property
            </button>
          </div>
        </header>

        <div className="container-fluid p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
