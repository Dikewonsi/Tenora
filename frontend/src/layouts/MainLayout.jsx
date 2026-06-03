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
  IconReceiptTax,
  IconSettings,
  IconUsers,
  IconX
} from '@tabler/icons-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: IconHomeStats },
  { label: 'Properties', path: '/properties', icon: IconBuildingEstate },
  { label: 'Tenants', path: '/tenants', icon: IconUsers },
  { label: 'Leases', path: '/leases', icon: IconFileInvoice },
  { label: 'Payments', path: '/payments', icon: IconReceipt },
  { label: 'Service Charges', path: '/service-charges', icon: IconReceiptTax },
  { label: 'Reminders', path: '/reminders', icon: IconBell },
  { label: 'Reports', path: '/reports', icon: IconChartBar },
  { label: 'Settings', path: '/settings', icon: IconSettings }
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isPropertiesPage = location.pathname.startsWith('/properties');
  const isTenantsPage = location.pathname.startsWith('/tenants');
  const isLeasesPage = location.pathname.startsWith('/leases');
  const isPaymentsPage = location.pathname.startsWith('/payments');
  const isServiceChargesPage = location.pathname.startsWith('/service-charges');
  const isRemindersPage = location.pathname.startsWith('/reminders');
  const isReportsPage = location.pathname.startsWith('/reports');
  const isSettingsPage = location.pathname.startsWith('/settings');
  const pageTitle = isPropertiesPage ? 'Properties' : isTenantsPage ? 'Tenants' : isLeasesPage ? 'Leases' : isPaymentsPage ? 'Payments' : isServiceChargesPage ? 'Service Charges' : isRemindersPage ? 'Reminders' : isReportsPage ? 'Reports' : isSettingsPage ? 'Settings' : 'Dashboard';
  const pageSubtitle = isPropertiesPage
    ? 'Manage portfolio records and lettable space'
    : isTenantsPage
      ? 'Manage tenant records and contact details'
      : isLeasesPage
        ? 'Manage tenancy terms, rent, and renewal dates'
        : isPaymentsPage
          ? 'Track rent and service charge payments'
          : isServiceChargesPage
            ? 'Manage service charge demands and line items'
            : isRemindersPage
              ? 'Manage scheduled notices and acknowledgements'
              : isReportsPage
                ? 'Review arrears, balances, and expiring leases'
                : isSettingsPage
                  ? 'Manage account and workspace basics'
                  : 'Welcome back to Tenora';
  // const actionLabel = isTenantsPage ? 'Add Tenant' : isLeasesPage ? 'Add Lease' : isPaymentsPage ? 'Add Payment' : isServiceChargesPage ? 'Add Demand' : isRemindersPage ? 'Add Reminder' : isReportsPage ? 'Refresh' : isSettingsPage ? 'Profile' : 'Add Property';
  const actionPath = isTenantsPage ? '/tenants' : isLeasesPage ? '/leases' : isPaymentsPage ? '/payments' : isServiceChargesPage ? '/service-charges' : isRemindersPage ? '/reminders' : isReportsPage ? '/reports' : isSettingsPage ? '/settings' : '/properties';
  const displayName = user?.fullName || user?.full_name || user?.name || 'Tenora Admin';
  const displayEmail = user?.email || 'admin workspace';

  const renderNavLinks = (onNavigate) => navItems.map((item) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onNavigate}
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
  });

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
          {renderNavLinks()}
        </nav>

        <div className="mt-auto d-grid gap-3">
          <div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,.12)' }}>
            <div className="fw-bold text-truncate">{displayName}</div>
            <small className="d-block text-truncate" style={{ color: 'rgba(255,255,255,.72)' }}>{displayEmail}</small>
          </div>
          <button
            className="btn w-100 rounded-4 fw-bold"
            type="button"
            onClick={logout}
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

      {isMobileNavOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-lg-none" style={{ zIndex: 1060 }}>
          <button
            className="position-absolute top-0 start-0 w-100 h-100 border-0"
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMobileNavOpen(false)}
            style={{ background: 'rgba(15, 23, 42, 0.48)' }}
          />
          <aside
            className="position-relative h-100 p-4 d-flex flex-column"
            style={{
              width: 'min(86vw, 340px)',
              background: 'linear-gradient(180deg, #064e3b 0%, #059669 100%)',
              color: '#fff'
            }}
          >
            <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center rounded-4 bg-white" style={{ width: 48, height: 48, color: '#059669' }}>
                  <IconBuildingCommunity size={26} />
                </div>
                <div>
                  <h2 className="h2 fw-bold mb-0">Tenora</h2>
                  <small style={{ color: 'rgba(255,255,255,.75)' }}>Property Management</small>
                </div>
              </div>
              <button className="btn btn-light btn-icon rounded-4" type="button" onClick={() => setIsMobileNavOpen(false)}>
                <IconX size={20} />
              </button>
            </div>

            <nav className="d-grid gap-2">
              {renderNavLinks(() => setIsMobileNavOpen(false))}
            </nav>

            <div className="mt-auto d-grid gap-3">
              <div className="p-3 rounded-4" style={{ background: 'rgba(255,255,255,.12)' }}>
                <div className="fw-bold text-truncate">{displayName}</div>
                <small className="d-block text-truncate" style={{ color: 'rgba(255,255,255,.72)' }}>{displayEmail}</small>
              </div>
              <button className="btn w-100 rounded-4 fw-bold" type="button" onClick={logout} style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>
                <IconLogout size={20} className="me-2" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-fill">
        <header className="bg-white border-bottom">
          <div className="container-fluid px-4 py-3 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-light d-lg-none" type="button" onClick={() => setIsMobileNavOpen(true)}>
                <IconMenu2 size={22} />
              </button>
              <div>
                <h1 className="h3 fw-bold mb-0">{pageTitle}</h1>
                <small className="text-secondary">{pageSubtitle}</small>
              </div>
            </div>

            {/* <button
              className="btn rounded-4 fw-bold text-white"
              type="button"
              onClick={() => navigate(actionPath)}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              {actionLabel}
            </button> */}
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
