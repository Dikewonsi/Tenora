import { useState } from 'react';
import { IconBuildingCommunity, IconLock, IconMail } from '@tabler/icons-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const {
    accessError,
    authError,
    accessStatus,
    isAccessExpired,
    isAccessLoading,
    isAuthenticated,
    login
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const expiredMessage = 'Access period has expired. Please contact the administrator.';

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isAccessExpired) {
      setError(expiredMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(form);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.response?.data?.message || loginError.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <main
    className="min-vh-100 d-flex align-items-center justify-content-center"
    style={{
      background:
        'radial-gradient(circle at top left, rgba(16, 185, 129, 0.24), transparent 34%), radial-gradient(circle at bottom right, rgba(15, 23, 42, 0.14), transparent 32%), linear-gradient(135deg, #f8fffb 0%, #ecfdf5 48%, #ffffff 100%)',
      color: '#111827'
    }}
  >
    <div className="container-xl py-5">
      <div className="row justify-content-center align-items-center g-5">
        <div className="col-lg-6 d-none d-lg-block">
          <div className="mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-4 mb-4 shadow-sm"
              style={{
                width: 72,
                height: 72,
                background: 'linear-gradient(135deg, #064e3b, #10b981)',
                color: '#fff'
              }}
            >
              <IconBuildingCommunity size={36} />
            </div>

            <span
              className="badge rounded-pill px-3 py-2 mb-3"
              style={{ background: '#d1fae5', color: '#047857' }}
            >
              Property Management System
            </span>

            <h1 className="display-5 fw-bold mb-3">
              Manage properties, tenancies, service charges, and payments from{' '}
              <span style={{ color: '#059669' }}>one workspace.</span>
            </h1>

            <p className="text-secondary fs-4 mb-4">
              Tenora gives property teams a clean dashboard for rent tracking, service charge
              demands, rent expiry monitoring, tenant records, and payment activity.
            </p>
          </div>

          <div className="row g-3">
            <div className="col-6">
              <div className="d-flex align-items-center gap-3">
                <span className="avatar rounded-4" style={{ background: '#d1fae5', color: '#047857' }}>
                  <IconBuildingCommunity size={22} />
                </span>
                <div>
                  <div className="fw-bold">Portfolio records</div>
                  <small className="text-secondary">Manage properties and units</small>
                </div>
              </div>
            </div>

            <div className="col-6">
              <div className="d-flex align-items-center gap-3">
                <span className="avatar rounded-4" style={{ background: '#d1fae5', color: '#047857' }}>
                  <IconMail size={22} />
                </span>
                <div>
                  <div className="fw-bold">Tenant directory</div>
                  <small className="text-secondary">Store tenant contact details</small>
                </div>
              </div>
            </div>

            <div className="col-6">
              <div className="d-flex align-items-center gap-3">
                <span className="avatar rounded-4" style={{ background: '#d1fae5', color: '#047857' }}>
                  <IconLock size={22} />
                </span>
                <div>
                  <div className="fw-bold">Tenancy tracking</div>
                  <small className="text-secondary">Monitor active and expiring tenancies</small>
                </div>
              </div>
            </div>

            <div className="col-6">
              <div className="d-flex align-items-center gap-3">
                <span className="avatar rounded-4" style={{ background: '#d1fae5', color: '#047857' }}>
                  <IconBuildingCommunity size={22} />
                </span>
                <div>
                  <div className="fw-bold">Service charges</div>
                  <small className="text-secondary">Track balances and demands</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5 col-md-8 col-sm-11">
          <div
            className="card border-0 rounded-5 shadow-lg"
            style={{
              backdropFilter: 'blur(18px)',
              background: 'rgba(255, 255, 255, 0.92)'
            }}
          >
            <div className="card-body p-4 p-md-5">
              <div className="text-center mb-4 d-lg-none">
                <div
                  className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-4"
                  style={{
                    width: 62,
                    height: 62,
                    background: 'linear-gradient(135deg, #064e3b, #10b981)',
                    color: '#fff'
                  }}
                >
                  <IconBuildingCommunity size={30} />
                </div>

                <h1 className="fw-bold mb-1">
                  Ten<span style={{ color: '#059669' }}>ora</span>
                </h1>

                <p className="text-secondary mb-0">
                  Property management workspace.
                </p>
              </div>

              <div className="mb-4">
                <span
                  className="badge mb-3 px-3 py-2 rounded-pill"
                  style={{
                    background: '#d1fae5',
                    color: '#047857'
                  }}
                >
                  Admin access
                </span>

                <h2 className="fw-bold mb-1">Welcome back</h2>
                <p className="text-secondary mb-0">
                  Sign in to manage your property operations.
                </p>
              </div>

              {error && (
                <div className="alert alert-danger rounded-4 border-0" role="alert">
                  {error}
                </div>
              )}

              {!error && (authError || isAccessExpired || accessError) && (
                <div className="alert alert-danger rounded-4 border-0" role="alert">
                  {authError || (isAccessExpired ? expiredMessage : accessError)}
                </div>
              )}

              {!isAccessExpired && accessStatus?.expiresAt && (
                <div className="tenora-login-access-note">
                  Access is available until {new Date(accessStatus.expiresAt).toLocaleString()}.
                </div>
              )}

              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="email">
                    Email address
                  </label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconMail size={18} />
                    </span>
                    <input
                      className="form-control form-control-lg rounded-4 border-0 shadow-sm"
                      id="email"
                      name="email"
                      type="email"
                      placeholder="admin@tenora.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold" htmlFor="password">
                    Password
                  </label>
                  <div className="input-icon">
                    <span className="input-icon-addon">
                      <IconLock size={18} />
                    </span>
                    <input
                      className="form-control form-control-lg rounded-4 border-0 shadow-sm"
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-lg w-100 rounded-4 fw-bold shadow-sm text-white"
                  disabled={isSubmitting || isAccessLoading || isAccessExpired || Boolean(accessError)}
                  style={{
                    background: '#059669',
                    borderColor: '#059669'
                  }}
                >
                  {isAccessLoading ? 'Checking access...' : isSubmitting ? 'Signing in...' : isAccessExpired ? 'Access expired' : 'Sign in'}
                </button>
              </form>

              <div className="text-center mt-4">
                <small className="text-secondary">
                  Protected Tenora workspace for property administrators.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
);
};

export default Login;
