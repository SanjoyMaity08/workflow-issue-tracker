import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import api from '../api/client.js';
import Select from '../components/Select.jsx';
import IssueForm from '../components/IssueForm.jsx';
import { Avatar, PriorityIcon, StatusIcon } from '../components/Icons.jsx';
import { PRIORITIES, STATUSES, priorityMeta, statusMeta } from '../constants.js';

const timeAgo = (iso) => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const describeActivity = (activity) => {
  if (activity.action === 'created') return 'created the issue';
  if (activity.action === 'commented') return 'left a comment';

  if (activity.action.startsWith('updated_')) {
    const field = activity.action.replace('updated_', '');
    const to = activity.changes?.newValue;
    if (field === 'status') return `moved it to ${statusMeta(to).label}`;
    if (field === 'priority') return `set priority to ${priorityMeta(to).label}`;
    return `changed the ${field}`;
  }

  return activity.action;
};

const IssueDetailPage = () => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const { users, teams } = useOutletContext();

  const [issue, setIssue] = useState(null);
  const [subIssues, setSubIssues] = useState([]);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [detail, activityData, commentData] = await Promise.all([
        api.getIssue(identifier),
        api.getActivities(identifier),
        api.getComments(identifier),
      ]);
      setIssue(detail.issue);
      setSubIssues(detail.subIssues || []);
      setActivities(activityData.activities || []);
      setComments(commentData.comments || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [identifier]);

  const patch = async (payload) => {
    const data = await api.updateIssue(identifier, payload);
    setIssue(data.issue);
    const activityData = await api.getActivities(identifier);
    setActivities(activityData.activities || []);
  };

  const createSubIssue = async (payload) => {
    await api.createIssue({ ...payload, parentIssue: issue._id });
    setAddingSub(false);
    // Re-read the parent so the new child is listed straight away.
    await load();
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    await api.createComment(identifier, comment.trim());
    setComment('');
    const [commentData, activityData] = await Promise.all([
      api.getComments(identifier),
      api.getActivities(identifier),
    ]);
    setComments(commentData.comments || []);
    setActivities(activityData.activities || []);
  };

  const remove = async () => {
    await api.deleteIssue(identifier);
    navigate(issue?.team?.key ? `/team/${issue.team.key}` : '/');
  };

  if (loading) return <div className="empty">Loading issue...</div>;
  if (error) return <div className="empty">{error}</div>;
  if (!issue) return <div className="empty">Issue not found.</div>;

  const doneCount = subIssues.filter((s) => s.status === 'done').length;

  return (
    <div className="detail">
      <div className="detail__main">
        <div className="detail__breadcrumb">
          {issue.team && <Link to={`/team/${issue.team.key}`}>{issue.team.name}</Link>}
          <span>{issue.identifier}</span>
          {issue.parentIssue && (
            <Link to={`/issue/${issue.parentIssue.identifier}`}>
              sub-issue of {issue.parentIssue.identifier}
            </Link>
          )}
        </div>

        <h1 className="detail__title">{issue.title}</h1>

        <p className={issue.description ? 'detail__description' : 'detail__description is-empty'}>
          {issue.description || 'No description yet.'}
        </p>

        <section className="sub-issues">
          <header className="sub-issues__head">
            <h2>Sub-issues</h2>
            <span className="counter">
              {doneCount}/{subIssues.length}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setAddingSub((v) => !v)}
            >
              {addingSub ? 'Close' : 'Add sub-issue'}
            </button>
          </header>

          {addingSub && (
            <IssueForm
              compact
              team={issue.team}
              teams={teams}
              users={users}
              submitLabel="Create"
              onCancel={() => setAddingSub(false)}
              onSubmit={createSubIssue}
            />
          )}

          <ul className="sub-issues__list">
            {subIssues.map((sub) => (
              <li key={sub._id}>
                <Link to={`/issue/${sub.identifier}`}>
                  <StatusIcon status={sub.status} />
                  <span className="sub-issues__id">{sub.identifier}</span>
                  <span className="sub-issues__title">{sub.title}</span>
                  <Avatar user={sub.assignee} size={18} />
                </Link>
              </li>
            ))}
            {subIssues.length === 0 && !addingSub && (
              <li className="sub-issues__empty">
                Break this down into smaller pieces with Add sub-issue.
              </li>
            )}
          </ul>
        </section>

        <section className="activity">
          <h2>Activity</h2>

          <ul className="activity__list">
            {activities.map((a) => (
              <li key={a._id}>
                <Avatar user={a.user} size={20} />
                <span>
                  <strong>{a.user?.name}</strong> {describeActivity(a)}
                </span>
                <time>{timeAgo(a.createdAt)}</time>
              </li>
            ))}
          </ul>

          <ul className="comments">
            {comments.map((c) => (
              <li key={c._id}>
                <Avatar user={c.user} size={24} />
                <div>
                  <div className="comments__head">
                    <strong>{c.user?.name}</strong>
                    <time>{timeAgo(c.createdAt)}</time>
                  </div>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="comment-box">
            <textarea
              placeholder="Leave a comment..."
              value={comment}
              rows={3}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') postComment();
              }}
            />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={postComment}
              disabled={!comment.trim()}
            >
              Comment
            </button>
          </div>
        </section>
      </div>

      <aside className="detail__side">
        <div className="detail__prop">
          <span className="detail__label">Status</span>
          <Select
            value={issue.status}
            onChange={(v) => patch({ status: v })}
            trigger={
              <>
                <StatusIcon status={issue.status} />
                <span>{statusMeta(issue.status).label}</span>
              </>
            }
            options={STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
              icon: <StatusIcon status={s.value} />,
            }))}
          />
        </div>

        <div className="detail__prop">
          <span className="detail__label">Priority</span>
          <Select
            value={issue.priority}
            onChange={(v) => patch({ priority: v })}
            trigger={
              <>
                <PriorityIcon priority={issue.priority} />
                <span>{priorityMeta(issue.priority).label}</span>
              </>
            }
            options={PRIORITIES.map((p) => ({
              value: p.value,
              label: p.label,
              icon: <PriorityIcon priority={p.value} />,
            }))}
          />
        </div>

        <div className="detail__prop">
          <span className="detail__label">Assignee</span>
          <Select
            value={issue.assignee?._id || ''}
            onChange={(v) => patch({ assignee: v || null })}
            trigger={
              <>
                <Avatar user={issue.assignee} size={16} />
                <span>{issue.assignee?.name || 'Unassigned'}</span>
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

        {issue.labels?.length > 0 && (
          <div className="detail__prop">
            <span className="detail__label">Labels</span>
            <div className="detail__labels">
              {issue.labels.map((l) => (
                <span key={l} className="label">
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="detail__prop">
          <span className="detail__label">Created by</span>
          <div className="chip chip--static">
            <Avatar user={issue.creator} size={16} />
            <span>{issue.creator?.name}</span>
          </div>
        </div>

        <button type="button" className="btn btn--danger btn--sm" onClick={remove}>
          Delete issue
        </button>
      </aside>
    </div>
  );
};

export default IssueDetailPage;
