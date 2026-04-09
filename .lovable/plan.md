

# End-to-End Login System for Teachers, Students & Admin

## Current State
- Email/password sign-up + Google OAuth already working
- All new users get "student" role automatically via DB trigger
- Teacher/admin roles exist in `user_roles` table but can only be assigned via direct DB insert
- No password reset flow, no role-based dashboards, no admin panel to manage users/roles

---

## 1. Password Reset Flow
- Add "Forgot password?" link on the Auth page
- Create `/reset-password` page that reads the recovery token from URL hash and lets users set a new password
- Uses `supabase.auth.resetPasswordForEmail()` and `supabase.auth.updateUser()`

## 2. Role-Based Post-Login Routing
- After sign-in, redirect based on role:
  - **Student** → `/browse` (or home)
  - **Teacher** → `/review` (if pending answers exist) or `/browse`
  - **Admin** → `/admin` dashboard
- Show role badge on the auth page after login redirect

## 3. Admin Dashboard (`/admin`)
- Only accessible to users with "admin" role
- **User management table**: list all profiles with their roles, reputation, join date
- **Role assignment**: admin can promote/demote users (student ↔ teacher ↔ admin)
  - Requires new RLS policy: admins can insert/delete on `user_roles`
  - DB function `manage_role(target_user_id, role, action)` as SECURITY DEFINER to safely handle role changes
- **Stats overview**: total users, questions, answers, pending reviews
- **Pending review shortcut**: link to teacher review queue with count

## 4. Teacher Onboarding
- When a user is promoted to teacher, show a welcome toast/banner on next login
- Add a "Teacher Guide" section on the review page explaining the review workflow

## 5. Protected Routes & Guards
- Create a `<ProtectedRoute>` wrapper component that checks auth + optional role
- Wrap `/ask`, `/profile` with auth guard (redirect to `/auth` if not logged in)
- Wrap `/review` with teacher/admin guard
- Wrap `/admin` with admin guard
- Show appropriate "Access Denied" page instead of blank redirects

## 6. Profile Enhancements per Role
- **Student profile**: show questions asked, answers received, reputation
- **Teacher profile**: add "Reviews completed" stat (count of answers they approved/rejected)
- **Admin profile**: add link to admin dashboard

## 7. Auth Page Polish
- Add role selector on sign-up: "I am a Student" (default) — teachers/admins are assigned by admin only, so add a note: "Want to become a teacher? Contact an admin"
- Add email verification reminder banner for unverified users

---

## Database Changes

1. **Migration: Admin role management policies**
   - RLS policy on `user_roles` allowing admins to INSERT and DELETE any row
   - `manage_user_role` SECURITY DEFINER function for safe role changes

2. **Migration: Add review stats tracking**
   - Add `reviews_completed` column to `profiles` (default 0)
   - Trigger on `answers` table: when status changes from 'pending' to 'approved'/'rejected', increment the reviewer's count

---

## Files to Create
- `src/pages/ResetPassword.tsx` — password reset form
- `src/pages/Admin.tsx` — admin dashboard with user/role management
- `src/components/ProtectedRoute.tsx` — auth + role guard wrapper

## Files to Modify
- `src/pages/Auth.tsx` — add forgot password link, role info note
- `src/App.tsx` — add new routes, wrap with ProtectedRoute
- `src/lib/auth.tsx` — add helper for post-login redirect logic
- `src/components/Navbar.tsx` — add Admin link for admin users
- `src/pages/Profile.tsx` — add role-specific stats
- `src/pages/TeacherReview.tsx` — track who approved/rejected

## Technical Details
- Password reset uses Supabase built-in `resetPasswordForEmail` with redirect to `/reset-password`
- Role management uses SECURITY DEFINER function to bypass RLS safely
- Protected routes use `useAuth()` hook to check roles before rendering
- Admin dashboard queries profiles + user_roles tables with joins

