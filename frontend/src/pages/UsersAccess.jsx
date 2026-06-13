import { useEffect, useMemo, useState } from 'react';
import {
  IconEdit,
  IconKey,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconUserCheck,
  IconUsers,
  IconUserX,
  IconX
} from '@tabler/icons-react';

import apiClient from '../api/apiClient';
import { ConfirmModal, FeedbackModal } from '../components/ActionModal';
import PaginationControls from '../components/PaginationControls';
import { useAuth } from '../context/AuthContext';
import { EmptyState, MobileRecordCard, PageHeader, StatusBadge } from '../components/TenoraUI';

const emptyForm = {
  full_name: '',
  email: '',
  role: 'user',
  is_active: true,
  password: ''
};

const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User'
};

const formatDateTime = (value) => (
  value
    ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never'
);

const UsersAccess = () => {
  const { user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, disabled: 0, super_admins: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusTarget, setStatusTarget] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null);

  const query = useMemo(
    () => ({ page, limit: 10, search, role, status }),
    [page, role, search, status]
  );

  const loadUsers = async () => {
    setIsLoading(true);

    try {
      const response = await apiClient.get('/users', { params: query });
      setUsers(response.data.data.users || []);
      setSummary(response.data.data.summary || summary);
      setPagination(response.data.data.pagination || pagination);
    } catch (error) {
      setFeedbackModal({
        variant: 'danger',
        title: 'Users could not be loaded',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      full_name: user.fullName || '',
      email: user.email || '',
      role: user.role || 'user',
      is_active: Boolean(user.isActive),
      password: ''
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (editingUser) {
        await apiClient.put(`/users/${editingUser.id}`, {
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          is_active: form.is_active
        });

        if (editingUser.id === currentUser.id) {
          await refreshUser();
        }
      } else {
        await apiClient.post('/users', form);
      }

      closeForm();
      setFeedbackModal({
        variant: 'success',
        title: editingUser ? 'User updated' : 'User created',
        message: editingUser
          ? 'The user profile and access settings were saved.'
          : 'The new user can now sign in with the password provided.'
      });
      await loadUsers();
    } catch (error) {
      setFeedbackModal({
        variant: 'danger',
        title: 'User could not be saved',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setIsSaving(true);

    try {
      const nextActive = !statusTarget.isActive;
      await apiClient.patch(`/users/${statusTarget.id}/status`, { is_active: nextActive });
      setStatusTarget(null);
      setFeedbackModal({
        variant: 'success',
        title: nextActive ? 'User enabled' : 'User disabled',
        message: nextActive
          ? 'The user can sign in and access Tenora again.'
          : 'The user has been signed out and can no longer access protected APIs.'
      });
      await loadUsers();
    } catch (error) {
      setStatusTarget(null);
      setFeedbackModal({
        variant: 'danger',
        title: 'Status could not be changed',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!passwordTarget) return;
    setIsSaving(true);

    try {
      await apiClient.patch(`/users/${passwordTarget.id}/password`, { password: newPassword });
      setPasswordTarget(null);
      setNewPassword('');
      setFeedbackModal({
        variant: 'success',
        title: 'Password reset',
        message: 'The new password is active and all previous sessions for this user are invalid.'
      });
      await loadUsers();
    } catch (error) {
      setFeedbackModal({
        variant: 'danger',
        title: 'Password could not be reset',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setPage(1);
  };

  const actionButtons = (user) => (
    <div className="d-flex flex-wrap justify-content-end gap-2">
      <button className="btn btn-sm btn-light btn-icon" type="button" onClick={() => openEdit(user)} title="Edit user"><IconEdit size={16} /></button>
      <button className="btn btn-sm btn-light btn-icon" type="button" onClick={() => { setPasswordTarget(user); setNewPassword(''); }} title="Reset password"><IconKey size={16} /></button>
      <button
        className={`btn btn-sm btn-icon ${user.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
        type="button"
        onClick={() => setStatusTarget(user)}
        title={user.isActive ? 'Disable user' : 'Enable user'}
      >
        {user.isActive ? <IconLock size={16} /> : <IconLockOpen size={16} />}
      </button>
    </div>
  );

  return (
    <div className="tenora-properties">
      <PageHeader
        eyebrow="Settings / Security"
        title="Users & Access"
        description="Manage who can sign in, administer Tenora, and access property operations."
        action={{ label: 'Create User', onClick: openCreate, icon: <IconPlus size={18} /> }}
      />

      <section className="tenora-budget-summary">
        <article><span className="tenora-property-summary-icon"><IconUsers size={19} /></span><div><small>Total users</small><strong>{isLoading ? '...' : summary.total}</strong></div></article>
        <article><span className="tenora-property-summary-icon"><IconUserCheck size={19} /></span><div><small>Active users</small><strong>{isLoading ? '...' : summary.active}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-slate"><IconUserX size={19} /></span><div><small>Disabled users</small><strong>{isLoading ? '...' : summary.disabled}</strong></div></article>
        <article><span className="tenora-property-summary-icon is-blue"><IconShieldCheck size={19} /></span><div><small>Super admins</small><strong>{isLoading ? '...' : summary.super_admins}</strong></div></article>
      </section>

      <section className="tenora-property-toolbar">
        <div className="tenora-tenant-filters">
          <div className="tenora-property-search">
            <IconSearch size={17} />
            <input aria-label="Search users" placeholder="Search name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <select className="form-select" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select className="form-select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <button className="btn btn-light border d-inline-flex align-items-center justify-content-center gap-2" type="button" onClick={loadUsers}><IconRefresh size={16} /> Refresh</button>
          <button className="btn btn-light border" type="button" onClick={resetFilters}>Reset</button>
        </div>
      </section>

      <section className="tenora-property-workspace">
        <header><div><h2>Access directory</h2><p>{pagination.total || 0} user account{pagination.total === 1 ? '' : 's'} match the current filters</p></div><span className="tenora-inventory-context">Super-admin controlled</span></header>

        {!isLoading && users.length === 0 && <EmptyState title="No users match these filters" description="Reset the filters or create a new user account." actionLabel="Create User" onAction={openCreate} icon={IconUsers} />}

        {(users.length > 0 || isLoading) && <div className="table-responsive tenora-desktop-table"><table className="table table-vcenter mb-0">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last login</th><th>Last updated</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan="6" className="text-center py-5 text-secondary">Loading users...</td></tr>}
            {!isLoading && users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.fullName}</strong><div className="small text-secondary">{user.email}{user.id === currentUser.id ? ' · You' : ''}</div></td>
                <td><StatusBadge status={user.role} label={roleLabels[user.role]} /></td>
                <td><StatusBadge status={user.isActive ? 'active' : 'disabled'} /></td>
                <td>{formatDateTime(user.lastLoginAt)}</td>
                <td>{formatDateTime(user.updatedAt)}</td>
                <td className="text-end">{actionButtons(user)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>}

        <div className="tenora-mobile-list">
          {users.map((user) => (
            <MobileRecordCard
              key={user.id}
              title={`${user.fullName}${user.id === currentUser.id ? ' (You)' : ''}`}
              subtitle={user.email}
              status={user.isActive ? 'active' : 'disabled'}
              meta={[
                ['Role', roleLabels[user.role]],
                ['Last login', formatDateTime(user.lastLoginAt)],
                ['Updated', formatDateTime(user.updatedAt)]
              ]}
            >
              {actionButtons(user)}
            </MobileRecordCard>
          ))}
        </div>

        {(users.length > 0 || isLoading) && <PaginationControls currentPage={pagination.page || page} totalPages={pagination.totalPages || 1} total={pagination.total || 0} isLoading={isLoading} onPageChange={setPage} />}
      </section>

      {formOpen && <div className="tenora-property-modal-backdrop">
        <form className="tenora-property-modal" onSubmit={handleSubmit}>
          <header><div><span>{editingUser ? 'Access profile' : 'New user'}</span><h3>{editingUser ? 'Edit user' : 'Create user'}</h3><p>Assign the minimum role needed for this person’s work.</p></div><button className="btn btn-light btn-icon" type="button" onClick={closeForm}><IconX size={18} /></button></header>
          <div className="tenora-property-modal-body">
            {editingUser?.id === currentUser.id && <div className="alert alert-warning mb-0">You are editing your own account. Role or status changes can affect your access immediately.</div>}
            <div className="tenora-form-section"><div><strong>Identity</strong><span>Name and email used for sign-in and audit records.</span></div><div className="row g-3"><div className="col-12"><label className="form-label">Full name</label><input className="form-control" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required /></div><div className="col-12"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></div></div></div>
            <div className="tenora-form-section"><div><strong>Access</strong><span>Super admins can manage users. Other roles cannot open this page.</span></div><div className="row g-3"><div className="col-12 col-md-6"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="user">User</option></select></div><div className="col-12 col-md-6"><label className="form-label">Status</label>{editingUser ? <div className="form-control bg-light"><StatusBadge status={form.is_active ? 'active' : 'disabled'} /></div> : <select className="form-select" value={form.is_active ? 'active' : 'disabled'} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.value === 'active' }))}><option value="active">Active</option><option value="disabled">Disabled</option></select>}<div className="form-text">{editingUser ? 'Use the Enable/Disable action so status changes are confirmed.' : 'Disabled users cannot sign in.'}</div></div></div></div>
            {!editingUser && <div className="tenora-form-section"><div><strong>Initial password</strong><span>Share it securely and reset it if exposure is suspected.</span></div><div><label className="form-label">Password</label><input className="form-control" type="password" minLength="8" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} autoComplete="new-password" required /><div className="form-text">Minimum 8 characters.</div></div></div>}
          </div>
          <footer><button className="btn btn-light border" type="button" onClick={closeForm}>Cancel</button><button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : editingUser ? 'Save changes' : 'Create user'}</button></footer>
        </form>
      </div>}

      {passwordTarget && <div className="tenora-property-modal-backdrop">
        <form className="tenora-property-modal" onSubmit={resetPassword}>
          <header><div><span>Security action</span><h3>Reset password</h3><p>This immediately invalidates every existing session for {passwordTarget.fullName}.</p></div><button className="btn btn-light btn-icon" type="button" onClick={() => setPasswordTarget(null)}><IconX size={18} /></button></header>
          <div className="tenora-property-modal-body"><div className="tenora-form-section"><div><strong>New password</strong><span>Use at least 8 characters and share it securely.</span></div><div><label className="form-label">Password</label><input className="form-control" type="password" minLength="8" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /></div></div></div>
          <footer><button className="btn btn-light border" type="button" onClick={() => setPasswordTarget(null)}>Cancel</button><button className="btn btn-primary tenora-primary-btn" type="submit" disabled={isSaving}>{isSaving ? 'Resetting...' : 'Reset password'}</button></footer>
        </form>
      </div>}

      <ConfirmModal
        isOpen={Boolean(statusTarget)}
        title={statusTarget?.isActive ? 'Disable this user?' : 'Enable this user?'}
        message={statusTarget?.isActive
          ? `${statusTarget?.fullName} will immediately lose access, including any currently active session.`
          : `${statusTarget?.fullName} will be able to sign in and use Tenora again.`}
        details={statusTarget && <div><strong>{statusTarget.email}</strong><div className="small text-secondary mt-1">{roleLabels[statusTarget.role]}</div></div>}
        confirmLabel={statusTarget?.isActive ? 'Disable user' : 'Enable user'}
        variant={statusTarget?.isActive ? 'danger' : 'success'}
        isWorking={isSaving}
        onCancel={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
      />
      <FeedbackModal isOpen={Boolean(feedbackModal)} {...(feedbackModal || {})} onClose={() => setFeedbackModal(null)} />
    </div>
  );
};

export default UsersAccess;
