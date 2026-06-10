import { IconClockHour4 } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';

const pad = (value) => String(Math.max(0, value)).padStart(2, '0');

const AccessCountdown = ({ sidebar = false }) => {
  const { accessStatus, isAccessLoading } = useAuth();

  if (isAccessLoading || !accessStatus) {
    return (
      <div className={`tenora-access-countdown ${sidebar ? 'is-sidebar' : ''} is-loading`} aria-label="Loading access period">
        <IconClockHour4 size={17} />
        <span>Checking access...</span>
      </div>
    );
  }

  const totalSeconds = Math.max(0, Number(accessStatus.remainingSeconds) || 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div
      className={`tenora-access-countdown ${sidebar ? 'is-sidebar' : ''} ${accessStatus.isExpired ? 'is-expired' : ''}`}
      title={`Access expires ${accessStatus.expiresAt ? new Date(accessStatus.expiresAt).toLocaleString() : ''}`}
      aria-label={`Access remaining: ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`}
    >
      <IconClockHour4 size={17} />
      <div>
        <small>{accessStatus.isExpired ? 'Access expired' : 'Access remaining'}</small>
        {!accessStatus.isExpired && (
          <strong>
            <span>{days}<em>d</em></span>
            <span>{pad(hours)}<em>h</em></span>
            <span>{pad(minutes)}<em>m</em></span>
            <span>{pad(seconds)}<em>s</em></span>
          </strong>
        )}
      </div>
    </div>
  );
};

export default AccessCountdown;
