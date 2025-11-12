# Golf League Tracking Application - Project Context

## Project Overview

A modern web application for managing golf leagues, tracking scores, calculating handicaps, and running competitions.

**Status**: Phase 1-4 Complete (Authentication, Profile, Events, Score Entry Implemented)

## Technology Stack

### Frontend
- **Framework**: Vue 3 with Composition API (`<script setup>`)
- **Build Tool**: Vite 5.4.x (Node 18 compatible)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.x
- **State Management**: Pinia
- **Router**: Vue Router 4
- **UI Components**: HeadlessUI, Heroicons

### Backend
- **Platform**: Supabase (BaaS)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (JWT-based)
- **Realtime**: Supabase Realtime subscriptions
- **Row Level Security**: Enabled on all tables

### Environment
- **Node.js Version**: 18.12.1 (dependencies downgraded for compatibility)
- **Dev Server**: http://localhost:5173
- **Supabase URL**: https://vrwylvcyoqszrkbbxgaf.supabase.co

## Database Schema

### Core Tables

#### profiles
- Extends Supabase `auth.users`
- Stores: first_name, last_name, phone, ghin_number, role (admin/member/viewer), current_handicap_index, avatar_url
- Automatically created via trigger on user signup

#### courses
- Golf course information
- Fields: name, city, state, total_par
- Related: holes, tee_boxes

#### tee_boxes
- Different tee options for each course
- Fields: course_id, name, color, course_rating, slope_rating, total_yardage

#### holes
- Individual hole details (18 per course)
- Fields: course_id, hole_number, par, handicap_index, yardage_blue, yardage_white, yardage_red

#### events
- League events and tournaments
- Fields: name, description, event_date, start_time, course_id, tee_box_id, scoring_format, event_type, status, created_by
- Scoring formats: stroke, match, stableford

#### event_registrations
- User RSVPs for events
- Fields: event_id, user_id, status (registered/confirmed/cancelled)

#### rounds
- Individual golf rounds played
- Fields: user_id, event_id, course_id, tee_box_id, played_date, total_score, course_handicap, adjusted_score, score_differential, is_posted_for_handicap

#### scores
- Hole-by-hole scoring
- Fields: round_id, hole_id, strokes, putts, fairway_hit, gir

#### teams
- Team competition management
- Fields: name, captain_id, season_year

#### team_members
- Team roster
- Fields: team_id, user_id

#### team_scores
- Team event results
- Fields: team_id, event_id, total_points, ranking

#### handicap_history
- Historical handicap tracking
- Fields: user_id, handicap_index, calculated_date, rounds_used

#### event_pairings
- Generated pairings/groups for events
- Fields: event_id, group_number, tee_time, starting_hole, notes, is_finalized
- Used for organizing players into tee time groups

#### pairing_members
- Players assigned to each pairing group
- Fields: pairing_id, user_id, position
- Links players to their assigned groups

## Authentication System

### Implementation Status: ✅ Complete

#### Components
1. **Auth Store** (`src/stores/auth.ts`)
   - Pinia store for global auth state
   - Methods: signIn, signUp, signOut, updateUserProfile
   - Session persistence and auto-refresh

2. **Auth Composable** (`src/composables/useAuth.ts`)
   - Alternative API for auth operations
   - Can be used alongside or instead of store

3. **Login Page** (`src/pages/auth/LoginPage.vue`)
   - Route: `/login`
   - Email/password authentication
   - Golf-themed Tailwind design

4. **Register Page** (`src/pages/auth/RegisterPage.vue`)
   - Route: `/register`
   - User signup with profile data
   - Auto-creates profile via database trigger

5. **Dashboard** (`src/pages/dashboard/DashboardPage.vue`)
   - Route: `/dashboard`
   - Protected route (requires authentication)
   - Displays user profile and quick actions

#### Router Guards
- Routes with `meta: { requiresAuth: true }` require login
- Routes with `meta: { requiresGuest: true }` redirect if authenticated
- Auto-redirects to login if not authenticated
- Session state initialized on app load

## Row Level Security (RLS)

### Enabled on All Tables

#### Key Policies:
- **Public Read**: Courses, holes, tee_boxes, events visible to all
- **User Data**: Users can only modify their own rounds, scores, registrations
- **Admin Access**: Admins can manage courses, events, teams
- **Team Captains**: Can manage their team members
- **Profile Updates**: Users can update their own profile

## Sample Data

### Seeded Courses (migration 003)
1. **Pebble Beach Golf Links** - Par 72, Pebble Beach, CA
2. **Augusta National Golf Club** - Par 72, Augusta, GA
3. **St Andrews Old Course** - Par 72, St Andrews, Scotland

Each with full 18-hole data and multiple tee boxes.

## Project Structure

```
golf-league-app/
├── src/
│   ├── assets/          # Styles (main.css with Tailwind)
│   ├── components/      # Reusable Vue components
│   │   ├── common/
│   │   ├── layout/
│   │   ├── score/
│   │   ├── leaderboard/
│   │   ├── events/
│   │   └── teams/
│   ├── composables/     # Composition functions
│   │   └── useAuth.ts
│   ├── layouts/         # Page layouts
│   ├── lib/             # External configs
│   │   └── supabase.ts  # Supabase client
│   ├── pages/           # Page components
│   │   ├── auth/        # Login, Register
│   │   ├── dashboard/   # Dashboard
│   │   ├── profile/     # ProfilePage (edit user info)
│   │   ├── events/      # EventsListPage, EventDetailPage, CreateEventPage
│   │   ├── rounds/      # EnterScorePage, RoundsHistoryPage
│   │   ├── leaderboards/
│   │   ├── teams/
│   │   ├── courses/
│   │   └── admin/
│   ├── router/          # Vue Router config
│   │   └── index.ts
│   ├── stores/          # Pinia stores
│   │   └── auth.ts
│   ├── types/           # TypeScript types
│   │   ├── database.types.ts
│   │   └── models.ts
│   ├── utils/           # Utility functions
│   │   ├── handicap.ts  # USGA handicap calculations
│   │   └── scoring.ts   # Scoring format logic
│   ├── App.vue
│   └── main.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # Database tables
│   │   ├── 002_row_level_security.sql   # RLS policies
│   │   ├── 003_seed_data.sql            # Sample courses
│   │   └── 004_pairings_and_tee_times.sql # Pairing tables
│   └── README.md
├── .env                 # Supabase credentials (gitignored)
├── .env.example
├── tailwind.config.js   # Tailwind with golf theme colors
├── package.json
└── README.md
```

## Key Design Patterns

### Composition API
- All components use `<script setup>` syntax
- Composables for reusable logic
- Pinia stores for global state

### Type Safety
- TypeScript throughout
- Database types generated from Supabase schema
- Domain models for business logic

### Styling
- Tailwind CSS utility-first
- Custom golf theme colors (golf-green, golf-fairway, etc.)
- Responsive mobile-first design

## Development Workflow

### Running the App
```bash
cd golf-league-app
npm run dev
# Opens on http://localhost:5173
```

### Database Migrations
**Status**: ✅ Migrations 1-3 Complete, Migration 4 Ready

Migration files applied:
1. `001_initial_schema.sql` - Database tables created ✅
2. `002_row_level_security.sql` - RLS policies applied ✅
3. `003_seed_data.sql` - Sample courses seeded ✅
4. `004_pairings_and_tee_times.sql` - Pairing tables (needs to be run)

To apply migration 004:
1. Go to Supabase SQL Editor
2. Run the contents of `004_pairings_and_tee_times.sql`
3. Verify event_pairings and pairing_members tables created

### Making a User Admin
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'user@example.com';
```

## Implementation Phases

### Phase 1: Authentication & Deployment ✅ Complete
- [x] Vue 3 project setup with TypeScript
- [x] Authentication system (login/register)
- [x] Router with auth guards
- [x] Dashboard
- [x] Vercel deployment

### Phase 2: User Profile Management ✅ Complete
- [x] User profile page with edit functionality
- [x] Profile fields: name, phone, GHIN, handicap
- [x] View member since date
- [x] Update profile information
- [x] Admin user management
- [x] Course listing and detail pages
- [x] Course management (admin)

### Phase 3: Event Management ✅ Complete
- [x] Event creation (admin only)
- [x] Event listing with filters (upcoming/all/past)
- [x] Event detail page
- [x] Event registration/unregistration
- [x] Participant list with handicaps
- [x] Registration count and limits
- [x] Pairing generation (admin only)
- [x] Event calendar view

### Phase 4: Score Entry ✅ Complete
- [x] Score entry form (hole-by-hole)
- [x] Round history with expandable scorecards
- [x] Track strokes, putts, fairways, GIR
- [x] Color-coded scorecard display
- [x] Real-time score totals
- [ ] Score validation (pending)
- [ ] Score differential calculation (pending)

### Phase 5: Handicap System (Pending)
- [ ] USGA handicap calculation
- [ ] Automatic updates after rounds
- [ ] Handicap history tracking
- [ ] Course handicap calculator

### Phase 6: Leaderboards (Pending)
- [ ] Event leaderboards
- [ ] Season standings
- [ ] Real-time updates (Supabase Realtime)
- [ ] Multiple scoring formats

### Phase 7: Team Competitions (Pending)
- [ ] Team creation and management
- [ ] Team scoring (best ball, scramble, etc.)
- [ ] Team standings
- [ ] Team statistics

## Important Notes

### Node Version Compatibility
- Project configured for Node 18.12.1
- Vite 5.x (not 7.x)
- Dependencies downgraded from latest for compatibility
- Works without upgrade, but recommend Node 20+ eventually

### Supabase Configuration
- Email confirmation: Check settings in Supabase dashboard
- Auth callbacks configured for localhost:5173
- RLS must be enabled before production use

### Tailwind Custom Colors
```js
colors: {
  primary: { ... }, // Green theme
  golf: {
    green: '#2d6a4f',
    fairway: '#52b788',
    rough: '#74c69d',
    sand: '#d4a574',
  }
}
```

### Git & Deployment
- Repository: https://github.com/robertkeele/go4thepin
- Initial commit made
- `.env` is gitignored (contains secrets)
- Deployed to Vercel
- Automatic deployments on push to main branch

## Useful Queries

### Get All Users
```sql
SELECT * FROM profiles ORDER BY created_at DESC;
```

### Get Event with Participants
```sql
SELECT e.*,
       json_agg(p.*) as participants
FROM events e
LEFT JOIN event_registrations er ON er.event_id = e.id
LEFT JOIN profiles p ON p.id = er.user_id
WHERE e.id = 'event-uuid'
GROUP BY e.id;
```

### Get User's Recent Rounds
```sql
SELECT r.*, c.name as course_name
FROM rounds r
JOIN courses c ON c.id = r.course_id
WHERE r.user_id = 'user-uuid'
ORDER BY r.played_date DESC
LIMIT 10;
```

## Deployment

### Vercel Configuration
- **Platform**: Vercel
- **Repository**: https://github.com/robertkeele/go4thepin
- **Root Directory**: `golf-league-app`
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x

### Environment Variables (Set in Vercel)
```
VITE_SUPABASE_URL=https://vrwylvcyoqszrkbbxgaf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### TypeScript Build Fixes
Due to Node 18 compatibility requirements, we use Supabase v2.45.4 which has limited TypeScript inference. Fixed by:
- Adding explicit type annotations with `ProfileRow` type for Supabase queries
- Using `.single<ProfileRow>()` for type-safe query results
- Adding `@ts-ignore` comments for `.update()` methods (Supabase v2.45.4 limitation)
- Casting `supabase.from()` to `any` for insert operations
- Adding null checks for query results before mapping
- Using `as any` type assertions for complex query responses

### Deployment Process
1. Push to GitHub main branch
2. Vercel auto-deploys
3. Build runs `npm run build` (type-check + vite build)
4. Deployment completes in ~1-2 minutes

### Post-Deployment Setup
After deploying, update Supabase Auth settings:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add Vercel URL to Site URL and Redirect URLs

## Documentation Files

- **README.md** - Project overview and setup
- **AUTHENTICATION_GUIDE.md** - Auth system documentation
- **supabase/README.md** - Database setup guide
- **design.md** - Technical design document
- **requirements.md** - Full requirements specification
- **tasks.md** - Detailed task list and timeline
- **claude.md** - This file (project context)

## Current Status Summary

✅ **Completed (Phase 1-7)**:

**Foundation:**
- Vue 3 project setup with TypeScript
- Tailwind CSS configuration with golf theme
- Supabase integration
- Database schema (all 12 tables)
- RLS policies for security
- GitHub repository setup
- Vercel deployment (production ready)
- TypeScript build configuration for Node 18
- ESLint 8.x configuration

**Authentication System:**
- Login/register pages
- Protected routes with auth guards
- Pinia auth store
- Session persistence
- Dashboard with user profile display

**Profile Management:**
- User profile page (`/profile`)
- Edit personal information (name, phone, GHIN, handicap)
- View member since date
- Profile link in navigation
- Handicap widget with trend display

**Events Management:**
- Events listing page (`/events`) with filters
- Event detail page (`/events/:id`)
- Event registration/unregistration
- Create event page (`/events/create`) - admin only
- Participant list with handicaps
- Registration counts and limits
- Event status tracking
- Event calendar view (`/events-calendar`) - monthly grid display
- Calendar view with color-coded events by type
- Registration status indicators on calendar
- Pairing generation (admin only) - automated tee time grouping
- Configurable group sizes (2-4 players)
- Shotgun start or sequential tee times
- Finalize/regenerate/delete pairings

**Score Entry & History:**
- Score entry page (`/rounds/enter`)
- Hole-by-hole score input (18 holes)
- Track strokes, putts, fairways hit, GIR
- Real-time score calculation
- "Post for Handicap" checkbox integration
- Rounds history page (`/rounds/history`)
- Expandable scorecards (front 9, back 9)
- Color-coded scores (eagle/birdie/par/bogey)
- Stats summary per round

**Course Management:**
- Courses listing page (`/courses`) - browse all courses
- Course detail page (`/courses/:id`) - view full scorecard and details
- Create course page (`/courses/create`) - 3-step wizard (admin only)
- Edit course information (admin only)
- Delete courses (admin only)
- Tee boxes and hole configuration display

**Admin Features:**
- User management page (`/admin/users`)
- View all users with search and filtering
- Edit user roles (admin/member/viewer)
- Admin route guards and navigation
- Admin-only quick actions on dashboard
- Purple-themed admin UI elements

**Handicap System (Phase 6 ✅):**
- USGA-compliant handicap calculation (`utils/handicap.ts`)
- Score differential calculation: (113 / Slope) × (AGS - Course Rating)
- Handicap index from best 8 of 20 rounds
- Course handicap calculation by tee box
- Equitable Stroke Control (ESC) for adjusted scores
- Handicap composable (`composables/useHandicap.ts`)
- Automatic handicap updates when rounds posted
- Handicap history tracking in database
- HandicapWidget component with visual trends
- Handicap widget on dashboard and profile
- Mini-chart showing handicap history
- Trend indicators (up/down arrows)
- Admin recalculation function for all users

**Leaderboards & Real-time (Phase 7 ✅):**
- Event leaderboard page (`/leaderboards/events/:id`)
- Real-time updates using Supabase Realtime subscriptions
- Live connection indicator with animated pulse
- Auto-refresh on INSERT/UPDATE/DELETE of rounds
- Gross/net score toggle
- Position tracking with proper tie handling
- Medal badges for top 3 (🥇🥈🥉)
- Score-to-par display with color coding
- Season standings with aggregated averages
- Leaderboard composables (`composables/useLeaderboard.ts`)
- Real-time composable (`composables/useRealtimeLeaderboard.ts`)
- Manual refresh capability

**Statistics & Analytics (Phase 7 ✅):**
- Personal statistics page (`/stats`)
- Statistics composable (`composables/useStats.ts`)
- Comprehensive performance tracking
- Scoring distribution (eagles, birdies, pars, bogeys, double+)
- Visual progress bars with percentages
- Recent form (last 5 rounds) table
- Best/worst round tracking
- Average score calculations
- Performance trends over time

**Sample Data:**
- 3 seeded golf courses with full hole data
- Multiple tee boxes per course
- Ready for immediate testing

📋 **Next Up (Phase 8+)**:
- Team competitions and management
- Team scoring (best ball, scramble, aggregate)
- Team leaderboards
- Mobile optimization and PWA features

## Quick Start Guide

### For Members:
1. Register at `/register` with email/password
2. Fill in your profile at `/profile` (name, GHIN, handicap)
3. Browse events at `/events` or view calendar at `/events-calendar`
4. Register for upcoming tournaments
5. Enter your scores at `/rounds/enter` after playing
6. **Check "Post for Handicap"** to have your round count toward handicap calculation
7. View your round history at `/rounds/history` with detailed scorecards
8. **Track your handicap** on dashboard and profile with visual trend indicators
9. **View event leaderboards** at `/leaderboards/events/:id` with live updates
10. **Check your statistics** at `/stats` to see scoring distribution and performance trends

### For Admins:
1. Update your role to 'admin' via Supabase SQL:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```
2. Access admin features from dashboard or navigation
3. Create and manage events at `/events/create`
4. Generate pairings for events (tee time groups)
5. Create and manage courses at `/courses/create`
6. Manage users and roles at `/admin/users`
7. All member features plus admin capabilities

### Key Routes:
- `/login` - Sign in
- `/register` - Create account
- `/dashboard` - Main dashboard with quick actions and handicap widget
- `/profile` - View/edit your profile with handicap history
- `/events` - Browse all events (list view)
- `/events-calendar` - Browse events (calendar view)
- `/events/:id` - Event details, registration, and pairings
- `/events/create` - Create new event (admin)
- `/leaderboards/events/:id` - Live event leaderboard with real-time updates
- `/stats` - Personal statistics and performance tracking
- `/courses` - Browse all courses
- `/courses/:id` - Course details and scorecard
- `/courses/create` - Create new course (admin)
- `/admin/users` - User management (admin)
- `/rounds/enter` - Enter a new round with handicap posting
- `/rounds/history` - View your rounds with detailed scorecards

---

**Last Updated**: 2025-01-12
**Phase**: Phase 1-7 Complete ✅ (Authentication, Profile, Events, Score Entry, Calendar, Pairings, Handicaps, Leaderboards, Statistics)
**Production URL**: Deployed on Vercel
**Repository**: https://github.com/robertkeele/go4thepin
