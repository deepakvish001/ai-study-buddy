

# Improve All Existing Features

## Overview
Polish and enhance every major feature across the app: auth, navigation, question flow, answers, voting, teacher review, profile, browse, and file uploads.

---

## 1. Authentication (Auth.tsx)
- Add password visibility toggle (eye icon)
- Add password strength indicator on sign-up (weak/medium/strong bar)
- Show loading spinner instead of plain "Loading..." text
- Redirect authenticated users away from /auth automatically
- Add Google OAuth sign-in button

## 2. Navigation (Navbar.tsx)
- Highlight the active route link (use `useLocation` to match current path)
- Show user avatar/initials instead of generic User icon on desktop
- Add notification dot on Review link showing pending count for teachers
- Smooth close animation on mobile sheet after navigation

## 3. Landing Page (Index.tsx)
- Add skeleton loaders for stats and recent questions while loading
- Add answer count to each recent question card
- Show relative time ("2 hours ago") on recent questions
- Add animated counter for stats section
- Add a "How it works" section (3 steps: Ask → AI Answers → Teacher Verifies)

## 4. Browse Page (Browse.tsx)
- Add sort options (newest, most answers, unanswered)
- Add skeleton loading states instead of plain "Loading..." text
- Show author name on question cards (already fetching user_id, map profiles)
- Add pagination or "Load more" instead of hard limit of 50
- Debounce search input so it auto-searches without needing to click Search

## 5. Ask Question (AskQuestion.tsx)
- Add character count for title and body
- Preview mode toggle to see markdown rendering before posting
- Drag-and-drop support for file uploads
- Disable submit if user has no verified email
- Show estimated AI response time

## 6. Question Thread (QuestionThread.tsx)
- Fix voting logic: currently always increments without checking previous vote state. Track user's existing vote and toggle correctly
- Add comment/discussion thread under each answer (the `comments` table exists but is unused)
- Add "Share" button to copy question URL
- Add markdown preview for the answer input textarea
- Show loading skeleton instead of just a spinner
- Add scroll-to-answer when navigating from a notification
- Render question body with MarkdownRenderer too (not just plain text)

## 7. Teacher Review (TeacherReview.tsx)
- Add markdown preview while editing (split view: edit left, preview right)
- Add batch approve/reject functionality
- Show question body context (not just title) so teachers have full context
- Add filter by confidence level (low/medium)
- Add count badge per confidence level

## 8. Profile (Profile.tsx)
- Add editable bio and display name (the fields exist in DB)
- Add avatar upload using the existing storage bucket
- Show reputation breakdown (hover tooltip: "+5 questions, +10 answers, etc.")
- Add activity timeline/chart showing contributions over time
- Show total questions asked and answers given as stats

## 9. File Upload (FileUpload.tsx)
- Add drag-and-drop zone with visual feedback
- Show upload progress bar per file
- Add file size display on thumbnails
- Image lightbox/preview on click

## 10. Markdown Renderer (MarkdownRenderer.tsx)
- Add syntax highlighting for code blocks (use `rehype-highlight` or `react-syntax-highlighter`)
- Add copy button on code blocks
- Add support for tables

## 11. General UX
- Add page transition animations (fade in/out)
- Add scroll-to-top on route change
- Add empty state illustrations instead of plain text
- Add a footer with links

---

## Technical Details

**Database migration needed:**
- Add unique constraint on `votes(user_id, answer_id)` if not already present (for proper upsert)

**New dependencies:**
- `react-syntax-highlighter` or `rehype-highlight` for code syntax highlighting
- `framer-motion` for page transitions (optional)

**Files to modify:**
- All page components (Index, Browse, Auth, AskQuestion, QuestionThread, TeacherReview, Profile)
- Navbar.tsx, FileUpload.tsx, MarkdownRenderer.tsx
- New component: CommentThread.tsx for answer comments
- New component: ProfileEditDialog.tsx for editing bio/name/avatar

**Edge function:** No changes needed.

**Priority order:** Voting fix (bug) → Comments → Auth improvements → Browse sort/pagination → Profile editing → Code highlighting → Everything else.

