import { useMemo, useState } from 'react';
import {
  IconBuildingCommunity,
  IconCreditCard,
  IconLogout,
  IconPalette,
  IconRefresh,
  IconShieldLock,
  IconUserCircle
} from '@tabler/icons-react';
import { ConfirmModal } from '../components/ActionModal';
import { useAuth } from '../context/AuthContext';
import { PageHeader, StatusBadge } from '../components/TenoraUI';

const getInitials = (user) => {
  const source = user?.fullName || user?.full_name || user?.name || user?.email || 'Tenora User';
  return source.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TU';
};

const Settings = () => {
  const { user, logout, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const profileRows = useMemo(() => ([
    ['Name', user?.fullName || user?.full_name || user?.name || 'Not provided'],
    ['Email', user?.email || 'Not provided'],
    ['Role', user?.role || user?.user_role || 'Admin']
  ]), [user]);

  const handleRefreshProfile = async () => {
    setIsRefreshing(true);
    setMessage('');
    setError('');
    try {
      await refreshUser();
      setMessage('Profile refreshed successfully');
    } catch (refreshError) {
      setError(refreshError.response?.data?.message || refreshError.message || 'Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  const settingCards = [
    {
      title: 'Company profile',
      description: 'Company name, contact details, and office address used on formal notices.',
      detail: 'Company profile editing will be connected in a later settings phase.',
      icon: IconBuildingCommunity
    },
    {
      title: 'Bank and payment instructions',
      description: 'Default Nigerian bank account and transfer instructions for demands and receipts.',
      detail: 'Budget-specific payment instructions remain available today.',
      icon: IconCreditCard
    },
    {
      title: 'Demand and receipt branding',
      description: 'Logo, signatory details, footer text, and printable document preferences.',
      detail: 'Current demand notices remain printable with the existing template.',
      icon: IconPalette
    },
    {
      title: 'User and security',
      description: 'Password management, additional administrators, and access controls.',
      detail: 'Your current account is protected and active.',
      icon: IconShieldLock
    }
  ];

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your company identity, payment instructions, document branding, and account security."
      >
        <button className="btn btn-light d-inline-flex align-items-center gap-2" type="button" onClick={handleRefreshProfile} disabled={isRefreshing}>
          <IconRefresh size={18} /> {isRefreshing ? 'Refreshing...' : 'Refresh profile'}
        </button>
      </PageHeader>

      {error && <div className="alert alert-danger border-0 mb-0">{error}</div>}
      {message && <div className="alert alert-success border-0 mb-0">{message}</div>}

      <section className="row g-3 g-xl-4">
        <div className="col-12 col-xl-5">
          <article className="tenora-panel h-100">
            <div className="p-4">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 62, height: 62, borderRadius: 16, background: 'linear-gradient(135deg, #047857, #10b981)', fontSize: 20 }}>
                  {getInitials(user)}
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2"><h2 className="h3 fw-bold mb-0">{user?.fullName || user?.full_name || user?.name || 'Tenora Admin'}</h2><StatusBadge status="active" /></div>
                  <p className="text-secondary mb-0 mt-1">{user?.email || 'No email stored'}</p>
                </div>
              </div>

              <div className="d-grid gap-3">
                {profileRows.map(([label, value]) => (
                  <div className="d-flex align-items-center justify-content-between gap-3 border-bottom pb-3" key={label}>
                    <span className="text-secondary">{label}</span><strong className="text-end">{value}</strong>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline-danger d-inline-flex align-items-center justify-content-center gap-2 mt-4" type="button" onClick={() => setIsLogoutModalOpen(true)}>
                <IconLogout size={18} /> Sign out
              </button>
            </div>
          </article>
        </div>

        <div className="col-12 col-xl-7">
          <div className="row g-3">
            {settingCards.map((item) => {
              const Icon = item.icon;
              return (
                <div className="col-12 col-md-6" key={item.title}>
                  <article className="tenora-panel h-100">
                    <div className="p-4">
                      <span className="tenora-icon-tile mb-3"><Icon size={21} /></span>
                      <h3 className="h4 fw-bold mb-2">{item.title}</h3>
                      <p className="text-secondary mb-3">{item.description}</p>
                      <div className="small p-3 rounded-3" style={{ background: '#f7faf8', color: '#52615b' }}>{item.detail}</div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="tenora-panel">
        <div className="tenora-panel-header">
          <div className="d-flex align-items-center gap-3"><span className="tenora-icon-tile"><IconUserCircle size={21} /></span><div><h2>Account assistance</h2><div className="text-secondary small">Contact your Tenora administrator to update company-wide details that are not editable yet.</div></div></div>
        </div>
      </section>

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

export default Settings;
