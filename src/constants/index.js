export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEAD: 'team-lead',
  EMPLOYEE: 'employee',
};

export const ROLE_HIERARCHY = { admin: 4, manager: 3, 'team-lead': 2, employee: 1 };
export const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', 'team-lead': 'Team Lead', employee: 'Employee' };

export const TASK_STATUS = {
  TODO: 'todo', IN_PROGRESS: 'in-progress', PENDING_TL: 'pending-tl',
  PENDING_MANAGER: 'pending-manager', PENDING_ADMIN: 'pending-admin',
  APPROVED: 'approved', REJECTED: 'rejected', ON_HOLD: 'on-hold',
};

export const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'pending-tl', label: 'Pending TL' },
  { value: 'pending-manager', label: 'Pending Manager' },
  { value: 'pending-admin', label: 'Pending Admin' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'on-hold', label: 'On Hold' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'team-lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const base = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/tasks', label: 'Tasks', icon: 'CheckSquare' },
  { href: '/attendance', label: 'Attendance', icon: 'Clock' },
  { href: '/leaves', label: 'Leaves', icon: 'CalendarOff' },
  { href: '/announcements', label: 'Announcements', icon: 'Megaphone' },
  { href: '/holidays', label: 'Holidays', icon: 'Calendar' },
  { href: '/performance', label: 'Performance', icon: 'TrendingUp' },
  { href: '/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/profile', label: 'Profile', icon: 'User' },
];

export const NAV_ITEMS_EMPLOYEE = base;
export const NAV_ITEMS_TEAM_LEAD = base;
export const NAV_ITEMS_MANAGER = base;

export const NAV_ITEMS_ADMIN = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/employees', label: 'Employees', icon: 'Users' },
  { href: '/departments', label: 'Departments', icon: 'Building2' },
  { href: '/tasks', label: 'Tasks', icon: 'CheckSquare' },
  { href: '/attendance', label: 'Attendance', icon: 'Clock' },
  { href: '/leaves', label: 'Leaves', icon: 'CalendarOff' },
  { href: '/announcements', label: 'Announcements', icon: 'Megaphone' },
  { href: '/holidays', label: 'Holidays', icon: 'Calendar' },
  { href: '/performance', label: 'Performance', icon: 'TrendingUp' },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3' },
  { href: '/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/profile', label: 'Profile', icon: 'User' },
];
