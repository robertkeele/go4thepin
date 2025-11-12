# Supabase Database Setup

This directory contains SQL migration files for setting up the Golf League Tracking Application database.

## Running Migrations

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of each migration file in order:
   - `001_initial_schema.sql` - Creates all tables, indexes, and triggers
   - `002_row_level_security.sql` - Sets up RLS policies
   - `003_seed_data.sql` - Adds sample courses and holes
5. Click **Run** for each migration

### Method 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Migration Files

### 001_initial_schema.sql
Creates the core database structure:
- **profiles** - User profiles extending Supabase auth.users
- **courses** - Golf courses
- **tee_boxes** - Different tee boxes for each course
- **holes** - Individual hole information
- **events** - Golf league events
- **event_registrations** - User event RSVPs
- **rounds** - Individual golf rounds
- **scores** - Hole-by-hole scores
- **teams** - Teams for competitions
- **team_members** - Team membership
- **team_scores** - Team event scores
- **handicap_history** - Historical handicap tracking

Also includes:
- Indexes for query optimization
- Triggers for automatic timestamp updates
- Automatic profile creation on user signup

### 002_row_level_security.sql
Sets up Row Level Security (RLS) policies:
- Public read access for most data (courses, events, leaderboards)
- Users can only modify their own data
- Admins have elevated permissions
- Team captains can manage their teams

### 003_seed_data.sql
Populates the database with sample data:
- 3 famous golf courses (Pebble Beach, Augusta National, St Andrews)
- Tee boxes for each course
- Complete hole information (par, yardage, handicap)

## After Running Migrations

### 1. Create Admin User

After signing up through the app, promote your user to admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 2. Verify Tables

Check that all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- courses
- event_registrations
- events
- handicap_history
- holes
- profiles
- rounds
- scores
- team_members
- team_scores
- teams
- tee_boxes

### 3. Verify RLS Policies

Check that RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

## Database Schema Overview

```
auth.users (Supabase managed)
    ↓
profiles (extends auth.users)
    ↓
├─ rounds → scores → holes → courses
│                              ↓
├─ event_registrations → events → tee_boxes
│
├─ team_members → teams
│
└─ handicap_history
```

## Common Queries

### Get all courses with holes
```sql
SELECT c.*,
       json_agg(h.*) as holes
FROM courses c
LEFT JOIN holes h ON h.course_id = c.id
GROUP BY c.id;
```

### Get event leaderboard
```sql
SELECT p.first_name, p.last_name, r.total_score, r.course_handicap
FROM rounds r
JOIN profiles p ON p.id = r.user_id
WHERE r.event_id = 'event-id-here'
ORDER BY r.total_score ASC;
```

### Get user's recent rounds
```sql
SELECT r.*, c.name as course_name, r.total_score
FROM rounds r
JOIN courses c ON c.id = r.course_id
WHERE r.user_id = 'user-id-here'
ORDER BY r.played_date DESC
LIMIT 10;
```

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the migrations in order
- Check that you're connected to the correct database

### RLS policy errors
- Verify that RLS is enabled on all tables
- Check that your user has the correct role (admin, member, viewer)

### Can't insert data
- Verify RLS policies allow the operation
- Check foreign key constraints
- Ensure required fields are provided

## Next Steps

After setting up the database:
1. Test the connection by starting the dev server
2. Create your admin user account
3. Start building the authentication UI
4. Add more courses for your league
