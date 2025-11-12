# Authentication System Guide

## Overview

The authentication system is built with:
- **Vue 3 Composition API** with `<script setup>`
- **Pinia** for state management
- **Supabase Auth** for backend authentication
- **Tailwind CSS** for styling
- **Vue Router** with navigation guards

## Features Implemented

✅ User registration with email/password
✅ User login with email/password
✅ Automatic profile creation on signup
✅ Protected routes with auth guards
✅ Persistent sessions
✅ User profile fetching from database
✅ Sign out functionality
✅ Real-time auth state management

## How to Use

### 1. Run Database Migrations First!

Before testing authentication, you MUST run the database migrations in your Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/vrwylvcyoqszrkbbxgaf/sql
2. Click "New Query"
3. Run these migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_seed_data.sql` (optional)

### 2. Test the Authentication Flow

1. **Open the app**: http://localhost:5173
2. **Register a new account**:
   - Click "create a new account" or go to `/register`
   - Fill in first name, last name, email, and password
   - Click "Create account"
   - You'll see a success message
3. **Check your email** (if email confirmation is enabled in Supabase)
4. **Sign in**:
   - Go to `/login`
   - Enter your email and password
   - Click "Sign in"
   - You'll be redirected to the dashboard
5. **View Dashboard**:
   - You should see your profile information
   - Your name, email, role, and handicap (if set)
6. **Sign Out**:
   - Click the "Sign Out" button
   - You'll be redirected back to login

### 3. Make Your First User an Admin

After creating your first account, make yourself an admin:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace email with yours):

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

3. Sign out and sign back in
4. You'll see your role as "admin" on the dashboard

## Routes

### Public Routes (No Auth Required)
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Auth Required)
- `/dashboard` - User dashboard (default after login)
- All future routes will be protected by default

## File Structure

```
src/
├── stores/
│   └── auth.ts              # Pinia authentication store
├── composables/
│   └── useAuth.ts           # Authentication composable (alternative to store)
├── pages/
│   ├── auth/
│   │   ├── LoginPage.vue    # Login page component
│   │   └── RegisterPage.vue # Registration page component
│   └── dashboard/
│       └── DashboardPage.vue # Protected dashboard
├── router/
│   └── index.ts             # Router config with auth guards
├── lib/
│   └── supabase.ts          # Supabase client configuration
└── App.vue                   # Root component with auth initialization
```

## How It Works

### 1. Authentication Store (Pinia)

The auth store (`stores/auth.ts`) manages:
- User state
- Authentication methods (signIn, signUp, signOut)
- Profile fetching
- Session persistence

### 2. Router Guards

The router (`router/index.ts`) has navigation guards that:
- Check if routes require authentication
- Redirect to login if not authenticated
- Redirect to dashboard if already authenticated and accessing login/register
- Initialize auth state before navigation

### 3. Session Management

- Sessions are automatically restored on page refresh
- Supabase handles JWT token refresh
- Auth state changes trigger UI updates

### 4. Profile System

When a user signs up:
1. Supabase creates an auth.users record
2. A database trigger automatically creates a profiles record
3. The app fetches the profile and merges it with auth data
4. The complete user object is stored in Pinia

## Supabase Auth Configuration

### Current Settings
- Email/Password authentication enabled
- Email confirmation: Check your Supabase settings
- Password requirements: Minimum 8 characters

### Customize in Supabase Dashboard
Go to: Authentication → Settings

You can enable:
- Email confirmation
- Magic links
- Social OAuth (Google, GitHub, etc.)
- Password recovery
- Custom email templates

## Troubleshooting

### "Invalid login credentials" error
- Check that you ran the database migrations
- Verify the email and password are correct
- Make sure the profiles table exists

### Redirects to login after signing in
- Check that the database migrations ran successfully
- Verify RLS policies are enabled
- Check browser console for errors

### "relation does not exist" error
- You need to run the database migrations first!
- Go to Supabase SQL Editor and run `001_initial_schema.sql`

### Can't see user profile data
- Make sure the profiles table was created
- Check that the automatic profile creation trigger is working
- Try manually creating a profile record

## Next Steps

1. **Run the database migrations** (if you haven't yet)
2. **Create your first account**
3. **Make yourself an admin**
4. **Start building more features**:
   - Course management
   - Event creation
   - Score entry
   - Leaderboards
   - Team management

## Security Notes

- Passwords are hashed by Supabase (never stored in plain text)
- JWTs are used for session management
- Row Level Security (RLS) protects database access
- Users can only modify their own data (except admins)
- Email/password validation on both client and server

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the Supabase logs in your dashboard
3. Verify all migrations ran successfully
4. Check that your `.env` file has the correct credentials
