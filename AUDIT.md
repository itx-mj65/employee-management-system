# Codebase Audit — Issues Found

## 1. Dashboard doesn't include leave/assigned task data
- Employee dashboard only shows tasks by userId, not assignedTo
- No pending leave count in admin dashboard
- No leave data in employee dashboard

## 2. Performance API doesn't account for leave days  
- Attendance percentage treats leave days as absent
- Should subtract approved leave days from absent count

## 3. Task queries inconsistent
- Dashboard uses userId only, not $or with assignedTo
- Daily tasks query doesn't include assigned tasks

## 4. Security gaps
- Attendance check-in has no rate limiting
- Leave API doesn't validate date formats
- No input sanitization on text fields (XSS risk)

## 5. Data integrity
- When employee is disabled, their pending leaves should auto-reject
- Deleted tasks should cascade to comments
- Check-out should recalculate hours including ongoing breaks

## 6. Error handling gaps
- No try-catch in some useEffect hooks
- Axios interceptor doesn't handle network errors
- No offline state detection

## 7. Scalability concerns
- API routes import all models even when not needed
- No API response standardization
- No pagination on leaves
