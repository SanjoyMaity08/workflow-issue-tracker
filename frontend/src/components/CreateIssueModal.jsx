import { useEffect } from 'react';
import IssueForm from './IssueForm.jsx';

const CreateIssueModal = ({ open, onClose, teams, users, team, onCreate }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create issue"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <span className="modal__title">New issue</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            &#215;
          </button>
        </div>

        <IssueForm
          team={team}
          teams={teams}
          users={users}
          onSubmit={async (payload) => {
            await onCreate(payload);
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export default CreateIssueModal;
