import { Link } from 'react-router-dom';
import { Avatar, PriorityIcon, StatusIcon } from './Icons.jsx';
import { priorityMeta } from '../constants.js';

const IssueCard = ({ issue }) => (
  <Link to={`/issue/${issue.identifier}`} className="card">
    <div className="card__top">
      <span className="card__id">{issue.identifier}</span>
      <Avatar user={issue.assignee} size={18} />
    </div>

    <div className="card__title">
      <StatusIcon status={issue.status} />
      <span>{issue.title}</span>
    </div>

    <div className="card__meta">
      <span className="card__priority">
        <PriorityIcon priority={issue.priority} />
        {priorityMeta(issue.priority).label}
      </span>
      {issue.labels?.slice(0, 2).map((label) => (
        <span key={label} className="label">
          {label}
        </span>
      ))}
    </div>
  </Link>
);

export default IssueCard;
