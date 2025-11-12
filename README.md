# Golf League Tracking Application

A modern web application for managing golf leagues, tracking scores, calculating handicaps, and running competitions.

## Tech Stack

- **Frontend**: Vue 3 with Composition API (`<script setup>`)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **UI Components**: HeadlessUI, Heroicons

## Features

- User authentication and profile management
- Course management with hole-by-hole details
- Event scheduling and registration
- Score entry with multiple formats (Stroke play, Match play, Stableford)
- USGA handicap calculation
- Real-time leaderboards
- Team competitions
- Statistics and performance tracking

## Project Structure

```
src/
├── assets/              # Static assets and styles
├── components/          # Reusable Vue components
│   ├── common/          # Generic UI components
│   ├── layout/          # Layout components
│   ├── score/           # Score entry components
│   ├── leaderboard/     # Leaderboard components
│   ├── events/          # Event components
│   └── teams/           # Team components
├── composables/         # Composition API composables
├── layouts/             # Page layouts
├── lib/                 # External library configs
│   └── supabase.ts      # Supabase client
├── pages/               # Page components (views)
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard
│   ├── events/          # Event pages
│   ├── rounds/          # Score entry & history
│   ├── leaderboards/    # Leaderboards
│   ├── teams/           # Team management
│   ├── courses/         # Course management
│   └── admin/           # Admin pages
├── router/              # Vue Router configuration
├── stores/              # Pinia stores
├── types/               # TypeScript type definitions
│   ├── database.types.ts # Supabase database types
│   └── models.ts        # Domain models
├── utils/               # Utility functions
│   ├── handicap.ts      # Handicap calculations
│   └── scoring.ts       # Scoring logic
└── main.ts              # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm or yarn
- Supabase account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key from Project Settings -> API
   - Update `.env` with your Supabase credentials:
     ```env
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Set up the database**
   - Run the SQL migration scripts in Supabase SQL Editor
   - Enable Row Level Security (RLS) policies
   - Seed initial data if needed

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Type-check, compile and minify for production
- `npm run preview` - Preview production build
- `npm run test:unit` - Run unit tests with Vitest
- `npm run lint` - Lint code with ESLint

## Development

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (disable Vetur)

### Code Style

- ESLint + Prettier for code formatting
- Vue 3 Composition API with `<script setup>` syntax
- TypeScript for type safety
- Tailwind CSS for styling

## Supabase Setup

### Database Tables

The application requires the following tables:
- `profiles` - User profiles extending Supabase auth.users
- `courses` - Golf courses
- `holes` - Hole details (par, yardage, etc.)
- `tee_boxes` - Tee box information (rating, slope)
- `events` - League events
- `event_registrations` - Event RSVPs
- `rounds` - Golf rounds
- `scores` - Hole-by-hole scores
- `teams` - Teams
- `team_members` - Team membership
- `team_scores` - Team event scores
- `handicap_history` - Handicap tracking over time

### Row Level Security

All tables should have RLS enabled with appropriate policies:
- Users can read all public data
- Users can only modify their own data
- Admins have elevated permissions for management tasks

## Deployment

### Frontend (Vercel/Netlify)

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy

### Database (Supabase)

Supabase handles hosting automatically. Ensure:
- All migrations are applied
- RLS policies are enabled
- Authentication settings are configured

## Next Steps

See the project task list in `tasks.md` for the full development roadmap and implementation plan.

## License

MIT
