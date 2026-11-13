import { useEffect, useRef, useState } from 'react';

/**
 * Compact dropdown used for status / priority / assignee pickers.
 * Closes on outside click and on Escape.
 */
const Select = ({ trigger, options, value, onChange, align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="select" ref={ref}>
      <button
        type="button"
        className="chip"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && (
        <ul className={`select-menu select-menu--${align}`} role="listbox">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                className={opt.value === value ? 'is-selected' : ''}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;
