# Employee Management System (EMS) - Architecture Document

## 1. Project Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────┐
│                 Client (Browser)             │
│  Next.js App Router + React + Tailwind CSS   │
│  + Shadcn UI + Framer Motion                 │
├─────────────────────────────────────────────┤
│           Next.js Middleware                  │
│    (JWT Verification + Route Protection)      │
├─────────────────────────────────────────────┤
│         Next.js Route Handlers (API)          │
│    /api/auth, /api/employees, /api/tasks...   │
├─────────────────────────────────────────────┤
│              Mongoose ODM                     │
├─────────────────────────────────────────────┤
│            MongoDB Atlas                      │
├─────────────────────────────────────────────┤
│          Supabase Realtime                    │
│     (Notifications + Break Queue)             │
└─────────────────────────────────────────────┘
```

## 2. Required Packages

### Core Framework
- next (14.x) - App Router, SSR, API Routes
- react / react-dom - UI library

### UI & Styling
- tailwindcss / postcss / autoprefixer - Utility-first CSS
- @shadcn/ui components - Pre-built accessible components
- framer-motion - Smooth animations
- lucide-react - Icon library
- next-themes - Dark/Light mode

### Forms & Validation
- react-hook-form - Performant form handling
- @hookform/resolvers - Zod integration
- zod - Schema validation (shared client/server)

### Data Fetching
- @tanstack/react-query - Server state management
- axios - HTTP client

### Tables & Charts
- @tanstack/react-table - Headless table
- recharts - Data visualization

### Dates
- dayjs - Lightweight date library

### Notifications
- react-hot-toast - Toast notifications

### Database
- mongoose - MongoDB ODM
- mongodb - MongoDB driver

### Authentication
- jsonwebtoken - JWT tokens
- bcryptjs - Password hashing
- jose - Edge-compatible JWT (for middleware)

### Real-time
- @supabase/supabase-js - Realtime subscriptions

### Reports
- jspdf - PDF generation
- jspdf-autotable - PDF tables
- xlsx - Excel export

## 3. Database Schema

### Users Collection
- _id: ObjectId
- name: String (required)
- email: String (unique, required)
- password: String (hashed, required)
- role: Enum ['admin', 'employee'] (default: 'employee')
- department: String
- position: String
- phone: String
- avatar: String (URL)
- isActive: Boolean (default: true)
- createdAt: Date
- updatedAt: Date

### Attendance Collection
- _id: ObjectId
- userId: ObjectId (ref: Users)
- date: Date
- checkIn: Date
- checkOut: Date
- lunchBreakStart: Date
- lunchBreakEnd: Date
- shortBreaks: [{ start: Date, end: Date }]
- totalWorkingHours: Number
- totalBreakHours: Number
- status: Enum ['present', 'absent', 'half-day', 'holiday']
- createdAt: Date

### DailyTaskLists Collection
- _id: ObjectId
- userId: ObjectId (ref: Users)
- date: Date
- tasks: [ObjectId] (ref: Tasks)
- isCheckedIn: Boolean
- createdAt: Date

### Tasks Collection
- _id: ObjectId
- dailyTaskListId: ObjectId (ref: DailyTaskLists)
- userId: ObjectId (ref: Users)
- title: String (required)
- description: String
- priority: Enum ['low', 'medium', 'high', 'urgent']
- status: Enum ['todo', 'in-progress', 'pending-approval', 'approved', 'rejected', 'on-hold']
- expectedCompletionTime: String
- completedAt: Date
- approvedBy: ObjectId (ref: Users)
- approvedAt: Date
- date: Date
- createdAt: Date
- updatedAt: Date

### TaskComments Collection
- _id: ObjectId
- taskId: ObjectId (ref: Tasks)
- userId: ObjectId (ref: Users)
- content: String (required)
- createdAt: Date

### Notifications Collection
- _id: ObjectId
- userId: ObjectId (ref: Users)
- type: Enum ['task-approved', 'task-rejected', 'new-comment', 'announcement', 'break-available']
- title: String
- message: String
- isRead: Boolean (default: false)
- relatedId: ObjectId
- createdAt: Date

### Announcements Collection
- _id: ObjectId
- title: String (required)
- content: String (required)
- createdBy: ObjectId (ref: Users)
- isActive: Boolean (default: true)
- createdAt: Date
- updatedAt: Date

### MonthlyRemarks Collection
- _id: ObjectId
- userId: ObjectId (ref: Users)
- month: Number
- year: Number
- completedTasks: Number
- pendingTasks: Number
- rejectedTasks: Number
- attendancePercentage: Number
- performanceScore: Number
- remarks: String
- createdBy: ObjectId (ref: Users)
- createdAt: Date
- updatedAt: Date

### CompanyHolidays Collection
- _id: ObjectId
- title: String (required)
- date: Date (required)
- description: String
- createdBy: ObjectId (ref: Users)
- createdAt: Date

## 4. API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- PUT  /api/auth/change-password

### Users (Admin)
- GET    /api/users
- POST   /api/users
- GET    /api/users/:id
- PUT    /api/users/:id
- DELETE /api/users/:id
- PUT    /api/users/:id/reset-password
- PUT    /api/users/:id/toggle-status

### Attendance
- POST /api/attendance/check-in
- PUT  /api/attendance/check-out
- PUT  /api/attendance/lunch-start
- PUT  /api/attendance/lunch-end
- PUT  /api/attendance/break-start
- PUT  /api/attendance/break-end
- GET  /api/attendance (history)
- GET  /api/attendance/today
- GET  /api/attendance/break-status
- GET  /api/attendance/reports

### Tasks
- GET    /api/tasks
- POST   /api/tasks
- GET    /api/tasks/:id
- PUT    /api/tasks/:id
- DELETE /api/tasks/:id
- PUT    /api/tasks/:id/status
- PUT    /api/tasks/:id/request-approval
- PUT    /api/tasks/:id/approve
- PUT    /api/tasks/:id/reject

### Daily Task Lists
- GET  /api/daily-tasks
- POST /api/daily-tasks
- GET  /api/daily-tasks/today
- GET  /api/daily-tasks/history

### Comments
- GET  /api/tasks/:id/comments
- POST /api/tasks/:id/comments

### Notifications
- GET  /api/notifications
- PUT  /api/notifications/:id/read
- PUT  /api/notifications/read-all
- GET  /api/notifications/unread-count

### Announcements
- GET    /api/announcements
- POST   /api/announcements
- PUT    /api/announcements/:id
- DELETE /api/announcements/:id

### Monthly Remarks
- GET  /api/remarks
- POST /api/remarks
- PUT  /api/remarks/:id

### Company Holidays
- GET    /api/holidays
- POST   /api/holidays
- PUT    /api/holidays/:id
- DELETE /api/holidays/:id

### Dashboard (Admin)
- GET /api/dashboard/stats
- GET /api/dashboard/analytics

## 5. Folder Structure

```
/src
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.js
│   ├── (dashboard)/
│   │   ├── layout.js
│   │   ├── dashboard/
│   │   │   └── page.js
│   │   ├── tasks/
│   │   │   └── page.js
│   │   ├── attendance/
│   │   │   └── page.js
│   │   ├── employees/
│   │   │   └── page.js
│   │   ├── announcements/
│   │   │   └── page.js
│   │   ├── holidays/
│   │   │   └── page.js
│   │   ├── performance/
│   │   │   └── page.js
│   │   ├── analytics/
│   │   │   └── page.js
│   │   ├── notifications/
│   │   │   └── page.js
│   │   └── profile/
│   │       └── page.js
│   ├── api/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── attendance/
│   │   ├── tasks/
│   │   ├── daily-tasks/
│   │   ├── notifications/
│   │   ├── announcements/
│   │   ├── remarks/
│   │   ├── holidays/
│   │   └── dashboard/
│   ├── layout.js
│   ├── page.js
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── layout/
│   │   ├── Sidebar.js
│   │   ├── Header.js
│   │   ├── MobileNav.js
│   │   └── ThemeToggle.js
│   ├── dashboard/
│   ├── tasks/
│   ├── attendance/
│   ├── employees/
│   ├── announcements/
│   ├── notifications/
│   ├── performance/
│   ├── analytics/
│   └── shared/
│       ├── LoadingSkeleton.js
│       ├── EmptyState.js
│       ├── ErrorState.js
│       ├── Modal.js
│       ├── DataTable.js
│       ├── SearchInput.js
│       ├── StatusBadge.js
│       └── ConfirmDialog.js
├── hooks/
│   ├── useAuth.js
│   ├── useNotifications.js
│   ├── useRealtime.js
│   └── useDebounce.js
├── lib/
│   ├── db.js
│   ├── auth.js
│   ├── supabase.js
│   ├── axios.js
│   └── utils.js
├── models/
│   ├── User.js
│   ├── Attendance.js
│   ├── DailyTaskList.js
│   ├── Task.js
│   ├── TaskComment.js
│   ├── Notification.js
│   ├── Announcement.js
│   ├── MonthlyRemark.js
│   └── CompanyHoliday.js
├── middleware.js
├── providers/
│   ├── QueryProvider.js
│   ├── ThemeProvider.js
│   └── AuthProvider.js
└── constants/
    └── index.js
```

## 6. Authentication Flow

1. User submits login credentials
2. Server validates credentials against MongoDB
3. Server generates JWT token (24h expiry)
4. Token stored in httpOnly cookie
5. Middleware intercepts every request, verifies JWT
6. Protected routes redirect to login if no valid token
7. Auto-logout triggers when token expires
8. Role-based access: admin routes check role in middleware

## 7. Real-time Updates Flow

Using Supabase Realtime (Postgres channels):
1. Client subscribes to relevant channels on mount
2. When an action occurs (task approved, comment added), server broadcasts to Supabase channel
3. All subscribed clients receive the update instantly
4. Used for: notifications, break queue, announcements, task updates

## 8. Development Roadmap

Phase 1: Project Setup & Auth
Phase 2: Database Models & Seed Data
Phase 3: Dashboard Layout (Sidebar, Header, Theme)
Phase 4: Employee Management (Admin)
Phase 5: Attendance System
Phase 6: Task Management + Daily Check-in
Phase 7: Comments & Approvals
Phase 8: Notifications & Real-time
Phase 9: Break Queue System
Phase 10: Announcements & Holidays
Phase 11: Performance & Analytics
Phase 12: Reports (PDF/Excel)
Phase 13: Search, Filters, Pagination
Phase 14: Polish, Testing, Deployment
