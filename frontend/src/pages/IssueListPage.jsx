import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../api/client.js';
import { Avatar, PriorityIcon, StatusIcon } from '../components/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { statusMeta } from '../constants.js';

/**
 * A flat, searchable list of issues. `mine` scopes it to the signed-in user.
 */
const IssueListPage = ({ mine = false }) => {
  const { user } = useAuth();
  const { registerCreateHandler } = useOutletContext();

  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getAllIssues();
      setIssues(data.issues);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    registerCreateHandler({ team: null, onCreated: load });
    return () => registerCreateHandler(null);
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return issues
      .filter((i) => (mine ? i.assignee?._id === user?._id : true))
      .filter(
        (i) =>
          !term ||
          i.title.toLowerCase().includes(term) ||
          i.identifier.toLowerCase().includes(term)
      );
  }, [issues, search, mine, user?._id]);

  return (
    <div className="list-page">
      <input
        className="search"
        placeholder="Search by title or identifier"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <div className="empty">Loading issues...</div>}

      {!loading && visible.length === 0 && (
        <div className="empty">
          {mine
            ? 'Nothing is assigned to you right now.'
            : 'No issues match that search.'}
        </div>
      )}

      <ul className="rows">
        {visible.map((issue) => (
          <li key={issue._id}>
            <Link to={`/issue/${issue.identifier}`} className="row">
              <PriorityIcon priority={issue.priority} />
              <span className="row__id">{issue.identifier}</span>
              <StatusIcon status={issue.status} />
              <span className="row__title">{issue.title}</span>
              {issue.parentIssue && <span className="row__sub">sub-issue</span>}
              <span className="row__status">{statusMeta(issue.status).label}</span>
              <Avatar user={issue.assignee} size={20} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IssueListPage;
