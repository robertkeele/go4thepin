# Golf League Tracking Application - Project Context

## Project Overview

A modern web application for managing golf leagues, tracking scores, calculating handicaps, and running competitions.

**Status**: Phase 1 Complete (Authentication System Implemented)

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
│   │   ├── events/
│   │   ├── rounds/
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
│   │   └── 003_seed_data.sql            # Sample courses
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
1. Go to Supabase SQL Editor
2. Run migrations in order (001, 002, 003)
3. Verify tables created

### Making a User Admin
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'user@example.com';
```

## Next Implementation Phases

### Phase 2: User & Course Management (Pending)
- [ ] User profile page
- [ ] Admin user management
- [ ] Course listing and detail pages
- [ ] Course management (admin)

### Phase 3: Event Management (Pending)
- [ ] Event creation (admin)
- [ ] Event listing and calendar
- [ ] Event registration/RSVP
- [ ] Pairing generation

### Phase 4: Score Entry (Pending)
- [ ] Score entry form (hole-by-hole)
- [ ] Round history
- [ ] Score validation
- [ ] Score differential calculation

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

### Git
- Repository initialized
- Initial commit made
- `.env` is gitignored (contains secrets)

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

## Documentation Files

- **README.md** - Project overview and setup
- **AUTHENTICATION_GUIDE.md** - Auth system documentation
- **supabase/README.md** - Database setup guide
- **design.md** - Technical design document
- **requirements.md** - Full requirements specification
- **tasks.md** - Detailed task list and timeline
- **claude.md** - This file (project context)

## Current Status Summary

✅ **Completed**:
- Vue 3 project setup
- Tailwind CSS configuration
- Supabase integration
- Database schema (ready to run)
- RLS policies
- Authentication system (login/register/dashboard)
- Router with auth guards
- Pinia auth store
- Sample seed data

⏳ **In Progress**:
- Testing authentication flow
- Running database migrations

📋 **Next Up**:
- User profile management
- Course listing and management
- Event creation and scheduling

---

**Last Updated**: 2025-11-12
**Phase**: Phase 1 - Authentication ✅ Complete
