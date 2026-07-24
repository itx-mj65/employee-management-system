export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  PENDING_APPROVAL: 'pending-approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ON_HOLD: 'on-hold',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half-day',
  HOLIDAY: 'holiday',
};

export const NOTIFICATION_TYPES = {
  TASK_APPROVED: 'task-approved',
  TASK_REJECTED: 'task-rejected',
  NEW_COMMENT: 'new-comment',
  ANNOUNCEMENT: 'announcement',
  BREAK_AVAILABLE: 'break-available',
};

export const TASK_STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', color: 'bg-slate-500' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'pending-approval', label: 'Pending Approval', color: 'bg-yellow-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'on-hold', label: 'On Hold', color: 'bg-orange-500' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-slate-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

export const NAV_ITEMS_EMPLOYEE = [
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

export const NAV_ITEMS_ADMIN = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/employees', label: 'Employees', icon: 'Users' },
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
