import {
  IconBuildingCommunity,
  IconBuildingEstate,
  IconChevronDown,
  IconChevronRight,
  IconFileInvoice,
  IconHome,
  IconHomeStats,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconReceipt,
  IconReceiptTax,
  IconSearch,
  IconSettings,
  IconUsers,
  IconX
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AccessCountdown from '../components/AccessCountdown';
import { ConfirmModal } from '../components/ActionModal';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    label: '',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: IconHomeStats }]
  },
  {
    label: 'Portfolio',
    items: [
      { label: 'Properties', path: '/properties', icon: IconBuildingEstate },
      { label: 'Units', path: '/units', icon: IconHome }
    ]
  },
  {
    label: 'People',
    items: [
      { label: 'Tenants', path: '/tenants', icon: IconUsers },
      { label: 'Tenancies', path: '/leases', icon: IconFileInvoice }
    ]
  },
  {
    label: 'Money',
    items: [
      { label: 'Service Charges', path: '/service-charges', icon: IconReceiptTax },
      { label: 'Payments', path: '/payments', icon: IconReceipt }
    ]
  },
  {
    label: '',
    items: [{ label: 'Settings', path: '/settings', icon: IconSettings }]
  }
];

const pageMeta = [
  { match: /^\/dashboard/, title: 'Dashboard', parent: 'Workspace' },
  { match: /^\/properties/, title: 'Properties', parent: 'Portfolio' },
  { match: /^\/units/, title: 'Units', parent: 'Portfolio' },
  { match: /^\/tenants/, title: 'Tenants', parent: 'People' },
  { match: /^\/leases/, title: 'Tenancies', parent: 'People' },
  { match: /^\/payments/, title: 'Payments', parent: 'Money' },
  { match: /\/service-charges\/.+\/document/, title: 'Demand Notice', parent: 'Service Charges' },
  { match: /\/service-charges\/.+\/schedule/, title: 'Budget Schedule', parent: 'Service Charges' },
  { match: /^\/service-charges/, title: 'Service Charges', parent: 'Money' },
  { match: /^\/settings/, title: 'Settings', parent: 'Workspace' }
];

const quickActions = [
  { label: 'Add property', path: '/properties', create: 'property', icon: IconBuildingEstate },
  { label: 'Add unit', path: '/units', create: 'unit', icon: IconHome },
  { label: 'Add tenant', path: '/tenants', create: 'tenant', icon: IconUsers },
  { label: 'Add tenancy', path: '/leases', create: 'tenancy', icon: IconFileInvoice },
  { label: 'Create service charge budget', path: '/service-charges', create: 'budget', icon: IconReceiptTax },
  { label: 'Record payment', path: '/payments', create: 'payment', icon: IconReceipt }
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const displayName = user?.fullName || user?.full_name || user?.name || 'Tenora Admin';
  const displayEmail = user?.email || 'admin workspace';
  const displayRole = user?.role || user?.user_role || 'Administrator';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TA';
  const currentPage = useMemo(
    () => pageMeta.find((item) => item.match.test(location.pathname)) || { title: 'Tenora', parent: 'Workspace' },
    [location.pathname]
  );

  const navigateToCreate = (action) => {
    setIsQuickMenuOpen(false);
    setIsMobileNavOpen(false);
    navigate(action.path, { state: { openCreate: action.create } });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    navigate(`/properties?search=${encodeURIComponent(term)}`);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  const renderNavGroups = (onNavigate) => navGroups.map((group, groupIndex) => (
    <div className="tenora-sidebar-group" key={group.label || `nav-${groupIndex}`}>
      {group.label && <div className="tenora-sidebar-label">{group.label}</div>}
      <div className="tenora-sidebar-links">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) => `tenora-sidebar-link ${isActive ? 'is-active' : ''}`}
            >
              <span className="tenora-sidebar-link-icon"><Icon size={19} /></span>
              <span>{item.label}</span>
              <IconChevronRight className="tenora-sidebar-chevron" size={15} />
            </NavLink>
          );
        })}
      </div>
    </div>
  ));

  const brand = (
    <div className="tenora-brand">
      <div className="tenora-brand-mark">
        <IconBuildingCommunity size={25} />
      </div>
      <div className="tenora-brand-copy">
        <h2>Tenora</h2>
        <small>Property Management</small>
      </div>
    </div>
  );

  return (
    <div className="tenora-shell min-vh-100 d-flex">
      <aside className="tenora-desktop-sidebar d-none d-lg-flex flex-column">
        <div className="tenora-sidebar-brand">{brand}<span className="tenora-workspace-badge">MVP</span></div>
        <nav className="tenora-sidebar-nav flex-grow-1">{renderNavGroups()}</nav>
        <div className="tenora-sidebar-footer">
          <AccessCountdown sidebar />
          <div className="tenora-sidebar-account">
            <span className="tenora-account-avatar">{initials}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{displayRole}</small>
            </div>
          </div>
          <div className="tenora-sidebar-email">{displayEmail}</div>
        </div>
      </aside>

      {isMobileNavOpen && (
        <div className="tenora-mobile-nav d-lg-none">
          <button className="tenora-mobile-nav-backdrop" type="button" aria-label="Close menu" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="tenora-mobile-sidebar">
            <div className="tenora-mobile-sidebar-header">
              {brand}
              <button className="tenora-sidebar-close" type="button" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation"><IconX size={19} /></button>
            </div>
            <nav className="tenora-sidebar-nav flex-grow-1">{renderNavGroups(() => setIsMobileNavOpen(false))}</nav>
            <div className="tenora-sidebar-footer">
              <AccessCountdown sidebar />
              <div className="tenora-sidebar-account">
                <span className="tenora-account-avatar">{initials}</span>
                <div><strong>{displayName}</strong><small>{displayRole}</small></div>
              </div>
              <div className="tenora-sidebar-email">{displayEmail}</div>
            </div>
          </aside>
        </div>
      )}

      <main className="tenora-app-main flex-fill">
        <header className="tenora-topbar">
          <div className="tenora-topbar-inner">
            <div className="tenora-topbar-context">
              <button className="tenora-mobile-menu d-lg-none" type="button" onClick={() => setIsMobileNavOpen(true)} aria-label="Open navigation"><IconMenu2 size={21} /></button>
              <div className="tenora-page-context">
                <div className="tenora-breadcrumb">{currentPage.parent} / {currentPage.title}</div>
                <div className="tenora-topbar-title">{currentPage.title}</div>
              </div>
            </div>

            <div className="tenora-topbar-actions">
              <form className="tenora-global-search input-icon" onSubmit={handleSearch}>
                <span className="input-icon-addon"><IconSearch size={17} /></span>
                <input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search properties..." aria-label="Search properties" />
              </form>
              <div className="tenora-quick-menu">
                <button className="tenora-create-button" type="button" onClick={() => setIsQuickMenuOpen((value) => !value)} aria-expanded={isQuickMenuOpen}>
                  <IconPlus size={17} /> <span>New</span> <IconChevronDown size={14} />
                </button>
                {isQuickMenuOpen && (
                  <>
                    <button className="tenora-quick-menu-backdrop" type="button" aria-label="Close quick actions" onClick={() => setIsQuickMenuOpen(false)} />
                    <div className="tenora-quick-menu-panel">
                      <div className="tenora-quick-menu-heading"><strong>Create new</strong><small>Start a common workflow</small></div>
                      {quickActions.map((action) => {
                        const Icon = action.icon;
                        return <button type="button" key={action.label} onClick={() => navigateToCreate(action)}><span><Icon size={17} /></span>{action.label}</button>;
                      })}
                    </div>
                  </>
                )}
              </div>
              <div className="tenora-topbar-access"><AccessCountdown /></div>
              <div className="tenora-topbar-account d-none d-md-flex">
                <span>{initials}</span>
                <div><strong>{displayName}</strong><small>{displayRole}</small></div>
              </div>
              <button className="tenora-logout-button" type="button" onClick={() => setIsLogoutModalOpen(true)} aria-label="Logout" title="Logout">
                <IconLogout size={19} />
              </button>
            </div>
          </div>
        </header>

        <div className="container-fluid tenora-main-content"><Outlet /></div>
      </main>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Log out of Tenora?"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log out"
        icon={IconLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

export default MainLayout;
