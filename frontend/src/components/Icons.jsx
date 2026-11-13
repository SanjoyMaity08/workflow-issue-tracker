import { priorityMeta, statusMeta } from '../constants.js';

/**
 * A ring whose fill shows how far along an issue is, echoing the board legend.
 */
export const StatusIcon = ({ status, size = 14 }) => {
  const meta = statusMeta(status);
  const r = size / 2 - 1.5;
  const circumference = 2 * Math.PI * r;

  const progress = {
    backlog: 0,
    todo: 0,
    in_progress: 0.5,
    in_review: 0.75,
    done: 1,
    canceled: 1,
  }[status] ?? 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={meta.color}
        strokeWidth="1.5"
        strokeDasharray={status === 'backlog' ? '2 2' : undefined}
      />
      {progress > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r / 2}
          fill="none"
          stroke={meta.color}
          strokeWidth={r}
          strokeDasharray={`${(circumference / 2) * progress} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
};

/**
 * Priority as a small bar chart: more bars, more urgent.
 */
export const PriorityIcon = ({ priority, size = 14 }) => {
  const meta = priorityMeta(priority);
  const heights = [4, 7, 10];

  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={1 + i * 4.5}
          y={12 - h}
          width="3"
          height={h}
          rx="1"
          fill={meta.bars > i ? meta.color : '#3a3d44'}
        />
      ))}
    </svg>
  );
};

export const Avatar = ({ user, size = 22 }) => {
  const initial = (user?.name || '?').charAt(0).toUpperCase();
  // Deterministic hue from the name, so a person keeps the same colour.
  const hue = (user?.name || '?')
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <span
      className="avatar"
      title={user?.name || 'Unassigned'}
      style={{
        width: size,
        height: size,
        background: user ? `hsl(${hue} 55% 45%)` : 'transparent',
        border: user ? 'none' : '1px dashed var(--line-strong)',
        fontSize: size * 0.45,
      }}
    >
      {user ? initial : ''}
    </span>
  );
};
