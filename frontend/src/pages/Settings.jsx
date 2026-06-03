import { useMemo, useState } from 'react';
import {
  IconApi,
  IconBuildingCommunity,
  IconCheck,
  IconLogout,
  IconRefresh,
  IconSettings,
  IconShieldLock,
  IconUserCircle
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const getInitials = (user) => {
  const source = user?.fullName || user?.full_name || user?.name || user?.email || 'Tenora User';

  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TU';
};

const Settings = () => {
  const { user, logout, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const emerald = '#10b981';
  const emeraldDark = '#059669';
  const cardShadow = '0 16px 38px rgba(15, 23, 42, 0.06)';
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'Not configured';

  const profileRows = useMemo(() => ([
    ['Name', user?.fullName || user?.full_name || user?.name || 'Not provided'],
    ['Email', user?.email || 'Not provided'],
    ['Role', user?.role || user?.user_role || 'Admin'],
    ['User ID', user?.id || 'Not available']
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

  return (
    <div className="d-grid gap-4">
      <section
        className="card border-0 overflow-hidden"
        style={{
          borderRadius: 30,
          background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 54%, #d1fae5 100%)',
          boxShadow: cardShadow
        }}
      >
        <div className="card-body p-4 p-xl-5">
          <div className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center justify-content-between gap-4">
            <div>
              <span className="badge border-0 mb-3 px-3 py-2" style={{ background: '#d1fae5', color: emeraldDark }}>
                Settings
              </span>
              <h1 className="display-6 fw-bold mb-2" style={{ color: '#101816' }}>
                Workspace Settings
              </h1>
              <p className="fs-3 text-secondary mb-0" style={{ maxWidth: 780 }}>
                Review account, session, and API configuration for the Tenora admin workspace.
              </p>
            </div>

            <button
              className="btn btn-lg text-white border-0 d-inline-flex align-items-center gap-2"
              type="button"
              onClick={handleRefreshProfile}
              disabled={isRefreshing}
              style={{ background: emerald, borderRadius: 16 }}
            >
              <IconRefresh size={20} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Profile'}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="alert alert-danger rounded-4 border-0 mb-0" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success rounded-4 border-0 mb-0" role="alert">
          {message}
        </div>
      )}

      <section className="row g-4">
        <div className="col-12 col-xl-5">
          <article className="card border-0 h-100" style={{ borderRadius: 26, boxShadow: cardShadow }}>
            <div className="card-body p-4 p-xl-5">
              <div className="d-flex align-items-center gap-4 mb-4">
                <div
                  className="d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    fontSize: 24
                  }}
                >
                  {getInitials(user)}
                </div>
                <div>
                  <h2 className="h2 fw-bold mb-1" style={{ color: '#101816' }}>
                    {user?.fullName || user?.full_name || user?.name || 'Tenora Admin'}
                  </h2>
                  <p className="text-secondary mb-0">{user?.email || 'No email stored'}</p>
                </div>
              </div>

              <div className="d-grid gap-3">
                {profileRows.map(([label, value]) => (
                  <div className="d-flex align-items-center justify-content-between gap-3 border-bottom pb-3" key={label}>
                    <span className="text-secondary">{label}</span>
                    <span className="fw-semibold text-end" style={{ color: '#101816' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="col-12 col-xl-7">
          <div className="row g-4">
            <div className="col-12 col-md-6">
              <article className="card border-0 h-100" style={{ borderRadius: 26, boxShadow: cardShadow }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{ width: 48, height: 48, borderRadius: 16, background: '#d1fae5', color: emeraldDark }}
                    >
                      <IconShieldLock size={23} />
                    </div>
                    <div>
                      <h3 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>Session</h3>
                      <p className="text-secondary mb-0">JWT protected access</p>
                    </div>
                  </div>

                  <div className="d-grid gap-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-secondary">Auth status</span>
                      <span className="badge bg-success-lt text-success">Active</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="text-secondary">Token storage</span>
                      <span className="fw-semibold">localStorage</span>
                    </div>
                    <button className="btn btn-outline-danger d-inline-flex align-items-center justify-content-center gap-2 mt-2" type="button" onClick={logout} style={{ borderRadius: 12 }}>
                      <IconLogout size={18} />
                      Logout
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div className="col-12 col-md-6">
              <article className="card border-0 h-100" style={{ borderRadius: 26, boxShadow: cardShadow }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-4">
                    <div
                      className="d-flex align-items-center justify-content-center"
                      style={{ width: 48, height: 48, borderRadius: 16, background: '#d1fae5', color: emeraldDark }}
                    >
                      <IconApi size={23} />
                    </div>
                    <div>
                      <h3 className="h3 fw-bold mb-1" style={{ color: '#101816' }}>API</h3>
                      <p className="text-secondary mb-0">Frontend connection</p>
                    </div>
                  </div>

                  <div className="d-grid gap-3">
                    <div>
                      <span className="text-secondary d-block mb-1">Base URL</span>
                      <code className="d-block p-3 rounded-4 text-break" style={{ background: '#f1f5f9', color: '#101816' }}>
                        {apiBaseUrl}
                      </code>
                    </div>
                    <div className="d-flex align-items-center gap-2" style={{ color: emeraldDark }}>
                      <IconCheck size={18} />
                      <span className="fw-semibold">Axios client configured</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="row g-4">
        {[
          {
            title: 'Workspace',
            description: 'Portfolio defaults, currency, and property preferences can live here later.',
            icon: IconBuildingCommunity
          },
          {
            title: 'Security',
            description: 'Change password and user management are intentionally left for a later backend phase.',
            icon: IconShieldLock
          },
          {
            title: 'Interface',
            description: 'Theme, table density, and notification preferences can be added when needed.',
            icon: IconSettings
          },
          {
            title: 'Profile',
            description: 'The current profile is loaded from the protected /auth/me endpoint.',
            icon: IconUserCircle
          }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div className="col-12 col-md-6 col-xl-3" key={item.title}>
              <article className="card border-0 h-100" style={{ borderRadius: 24, boxShadow: cardShadow }}>
                <div className="card-body p-4">
                  <div
                    className="d-flex align-items-center justify-content-center mb-4"
                    style={{ width: 46, height: 46, borderRadius: 15, background: '#d1fae5', color: emeraldDark }}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className="h4 fw-bold mb-2" style={{ color: '#101816' }}>{item.title}</h3>
                  <p className="text-secondary mb-0">{item.description}</p>
                </div>
              </article>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default Settings;
