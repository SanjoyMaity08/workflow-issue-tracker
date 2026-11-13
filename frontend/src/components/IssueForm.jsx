import { useState } from 'react';
import Select from './Select.jsx';
import { Avatar, PriorityIcon, StatusIcon } from './Icons.jsx';
import { PRIORITIES, STATUSES, priorityMeta, statusMeta } from '../constants.js';

/**
 * The shared issue composer. Used both by the "+" modal on the board and by
 * the inline sub-issue form on the detail page.
 */
const IssueForm = ({
  team,
  teams = [],
  users = [],
  onSubmit,
  onCancel,
  submitLabel = 'Create issue',
  compact = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState(team?._id || teams[0]?._id || '');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeTeam = team || teams.find((t) => t._id === teamId);

  const submit = async () => {
    if (!title.trim()) {
      setError('Give the issue a title before creating it.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        teamId,
        status,
        priority,
        assignee: assignee || undefined,
      });
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const onKeyDown = (e) => {
    // Cmd/Ctrl + Enter creates without reaching for the mouse.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
  };

  return (
    <div className={compact ? 'issue-form issue-form--compact' : 'issue-form'}>
      {!compact && activeTeam && (
        <div className="issue-form__team">
          <span className="team-badge" style={{ background: activeTeam.color }}>
            {activeTeam.key.charAt(0)}
          </span>
          {activeTeam.key}
        </div>
      )}

      <input
        className="issue-form__title"
        placeholder="Issue title"
        value={title}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <textarea
        className="issue-form__description"
        placeholder="Add description..."
        value={description}
        rows={compact ? 2 : 3}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <div className="issue-form__row">
        <div className="issue-form__chips">
          {teams.length > 1 && !team && (
            <Select
              value={teamId}
              onChange={setTeamId}
              trigger={<span>{teams.find((t) => t._id === teamId)?.key || 'Team'}</span>}
              options={teams.map((t) => ({
                value: t._id,
                label: t.name,
                icon: (
                  <span className="team-badge team-badge--sm" style={{ background: t.color }}>
                    {t.key.charAt(0)}
                  </span>
                ),
              }))}
            />
          )}

          <Select
            value={status}
            onChange={setStatus}
            trigger={
              <>
                <StatusIcon status={status} />
                <span>{statusMeta(status).label}</span>
              </>
            }
            options={STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
              icon: <StatusIcon status={s.value} />,
            }))}
          />

          <Select
            value={priority}
            onChange={setPriority}
            trigger={
              <>
                <PriorityIcon priority={priority} />
                <span>{priorityMeta(priority).label}</span>
              </>
            }
            options={PRIORITIES.map((p) => ({
              value: p.value,
              label: p.label,
              icon: <PriorityIcon priority={p.value} />,
            }))}
          />

          <Select
            value={assignee}
            onChange={setAssignee}
            trigger={
              <>
                <Avatar user={users.find((u) => u._id === assignee)} size={16} />
                <span>{users.find((u) => u._id === assignee)?.name || 'Unassigned'}</span>
              </>
            }
            options={[
              { value: '', label: 'Unassigned', icon: <Avatar user={null} size={16} /> },
              ...users.map((u) => ({
                value: u._id,
                label: u.name,
                icon: <Avatar user={u} size={16} />,
              })),
            ]}
          />
        </div>

        <div className="issue-form__actions">
          {onCancel && (
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'Creating...' : submitLabel}
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

export default IssueForm;
