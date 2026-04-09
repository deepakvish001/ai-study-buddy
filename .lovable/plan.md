

# Student Doubt Solver — Phase 1 MVP

## Design System
- **Dark theme**: Deep black background (`#0A0A0A`), dark cards (`#141414`)
- **Primary accent**: Orange (`#F97316`) for CTAs, highlights, AI badges
- **Secondary**: Green (`#22C55E`) for success states, verified badges, upvotes
- **Text**: White (`#FFFFFF`) headings, light gray (`#A1A1AA`) body text
- **Modern, clean UI** with subtle borders and rounded cards

## Pages & Layout

### 1. Landing Page
- Hero section with search bar front and center — "What's your doubt?"
- Popular topics/tags grid
- Recent questions feed
- Stats bar (questions answered, avg response time)

### 2. Auth (Sign Up / Login)
- Email/password authentication via Lovable Cloud
- Role selection on signup (Student or Teacher)
- User roles stored in separate `user_roles` table (security best practice)

### 3. Ask Question Page
- Title + rich description editor with tag selection
- **Real-time similar question suggestions** as user types (basic text search for MVP)
- Submit triggers AI auto-answer via Lovable AI Gateway

### 4. Question Thread Page
- Question display with tags, author info, timestamps
- **AI-generated answer** prominently displayed with "AI" badge (orange)
- Other answers section (manual answers from users/teachers)
- Upvote/downvote on answers
- Accept answer button (for question owner & teachers)
- Comment thread on each answer

### 5. Browse / Search Page
- List of all questions with filters (tag, status, date)
- Search bar with text-based search

### 6. Teacher Review Queue
- List of AI answers flagged as low-confidence
- Edit & approve workflow for teachers
- "Verified by Teacher" green badge on approved answers

### 7. User Profile Page
- Activity feed (questions asked, answers given)
- Reputation score display
- Role badge (Student/Teacher)

## Database (Lovable Cloud)
- `profiles` — id, display_name, avatar_url, bio
- `user_roles` — user_id, role (student/teacher/admin)
- `questions` — id, user_id, title, body, tags, status, created_at
- `answers` — id, question_id, user_id, body, is_ai, sources_json, confidence, upvotes, downvotes, is_accepted, status (approved/pending), created_at
- `comments` — id, answer_id, user_id, body, created_at
- `votes` — id, user_id, answer_id, vote_type (up/down)
- RLS policies on all tables

## AI Auto-Answer (Real)
- Edge function calling Lovable AI Gateway (Gemini model)
- System prompt instructs AI to act as an educational tutor, provide step-by-step explanations, and self-rate confidence (high/medium/low)
- Low-confidence answers auto-flagged for teacher review
- Answers streamed to the user in real-time

## Key Interactions
- Student posts question → AI generates answer in ~3-8 seconds with streaming
- Teachers see review queue → can edit and approve AI answers
- Users upvote/downvote → reputation system tracks contributions
- Similar questions shown before posting to reduce duplicates

