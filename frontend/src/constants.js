export const STATUSES = [
  { value: 'backlog', label: 'Backlog', color: '#8a8f98' },
  { value: 'todo', label: 'Todo', color: '#b3b8c2' },
  { value: 'in_progress', label: 'In Progress', color: '#f2c94c' },
  { value: 'in_review', label: 'In Review', color: '#4cb782' },
  { value: 'done', label: 'Done', color: '#5e6ad2' },
  { value: 'canceled', label: 'Canceled', color: '#6b6f76' },
];

// The columns the board shows, in order.
export const BOARD_COLUMNS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

export const PRIORITIES = [
  { value: 'no_priority', label: 'No priority', color: '#6b6f76', bars: 0 },
  { value: 'low', label: 'Low', color: '#8a8f98', bars: 1 },
  { value: 'medium', label: 'Medium', color: '#e2b203', bars: 2 },
  { value: 'high', label: 'High', color: '#f2994a', bars: 3 },
  { value: 'urgent', label: 'Urgent', color: '#eb5757', bars: 4 },
];

export const statusMeta = (value) =>
  STATUSES.find((s) => s.value === value) || STATUSES[1];

export const priorityMeta = (value) =>
  PRIORITIES.find((p) => p.value === value) || PRIORITIES[0];
