import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Icons.jsx';

const Sidebar = ({ teams }) => {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand-mark" aria-hidden="true" />
        Workflow
      </div>

      <nav className="sidebar__nav">
        <NavLink to="/my-issues" className="sidebar__link">
          My issues
        </NavLink>
        <NavLink to="/all-issues" className="sidebar__link">
          All issues
        </NavLink>
      </nav>

      <div className="sidebar__section">Teams</div>
      <nav className="sidebar__nav">
        {teams.map((team) => (
          <NavLink key={team._id} to={`/team/${team.key}`} className="sidebar__link">
            <span className="team-badge team-badge--sm" style={{ background: team.color }}>
              {team.key.charAt(0)}
            </span>
            {team.name}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__foot">
        <Avatar user={user} size={24} />
        <div className="sidebar__user">
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
