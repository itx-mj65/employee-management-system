# Employee Management System (EMS)

A modern, full-stack Employee Management System built with Next.js, MongoDB, and Tailwind CSS. Designed for small teams (~10 employees) with a premium SaaS-style UI.

## Features

### Employee Features
- **Daily Check-In** with automatic task entry popup
- **Task Management** — Create, edit, delete, track tasks with 6 statuses
- **Task Comments** — Comment threads on every task
- **Request Approval** — Submit tasks for admin approval
- **Attendance** — Check-in/out, lunch breaks, short breaks with queue
- **Short Break Queue** — One at a time; waiting employees get notified
- **Real-time Notifications** — Approvals, comments, announcements, break availability
- **Holiday Calendar**, **Task History**, **Dark/Light Mode**, **Profile & Password**

### Admin Features
- **Dashboard** — Stats, charts (weekly tasks, attendance pie)
- **Employee Management** — Full CRUD, reset passwords, enable/disable, roles
- **Task Oversight** — View all, approve/reject, comment
- **Attendance Reports** — Filter by employee/month, export PDF/Excel
- **Monthly Performance** — Auto-calculated stats + remarks
- **Announcements** — Instant delivery to all employees
- **Analytics** — 4 chart types via Recharts

## Tech Stack

Next.js 14+ (App Router) · React · Tailwind CSS · Shadcn UI · Framer Motion · MongoDB Atlas · Mongoose · JWT · bcrypt · TanStack Query · Recharts · Supabase Realtime · jsPDF · SheetJS

## Quick Start

```bash
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Seed: `POST /api/seed` → Admin: admin@ems.com / admin123

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `NEXT_PUBLIC_SUPABASE_URL` | (Optional) Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Optional) Supabase key |

## Deployment

Push to GitHub → Import in Vercel → Add env vars → Deploy.
