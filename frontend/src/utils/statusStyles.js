const statusStyles = {
  active: { background: '#d1fae5', color: '#047857' },
  paid: { background: '#d1fae5', color: '#047857' },
  sent: { background: '#d1fae5', color: '#047857' },
  acknowledged: { background: '#d1fae5', color: '#047857' },
  issued: { background: '#dbeafe', color: '#1d4ed8' },
  pending: { background: '#fef3c7', color: '#b45309' },
  draft: { background: '#f1f5f9', color: '#475569' },
  expired: { background: '#e2e8f0', color: '#475569' },
  terminated: { background: '#fee2e2', color: '#b91c1c' },
  failed: { background: '#fee2e2', color: '#b91c1c' },
  cancelled: { background: '#fee2e2', color: '#b91c1c' },
  overdue: { background: '#fee2e2', color: '#b91c1c' }
};

export const getStatusStyle = (status) => (
  statusStyles[String(status || '').toLowerCase()] || { background: '#f1f5f9', color: '#475569' }
);

export const getBooleanStatusStyle = (value) => (
  value ? statusStyles.acknowledged : { background: '#f1f5f9', color: '#475569' }
);
