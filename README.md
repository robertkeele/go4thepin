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

### Core Features
- **User Authentication** - Secure login/registration with role-based access (admin/member)
- **Profile Management** - Edit personal info, view handicap history and trends
- **Course Management** - Full CRUD operations with hole-by-hole details and tee box configurations
- **Event Management** - Create, schedule, and manage league events with registration
- **Event Calendar** - Monthly calendar view with color-coded events and registration status
- **Pairing Generation** - Automated tee time grouping with configurable group sizes
- **Leaderboard Preview** - Top 5 leaderboard widget on event detail pages with live indicator

### Score Tracking
- **Score Entry** - Hole-by-hole score input with real-time calculations
- **Draft Auto-Save** - Automatically saves score entry progress to localStorage to prevent data loss
- **Draft Recovery** - Restore unfinished rounds with banner prompt on page load
- **Score Validation** - Real-time validation with error/warning messages for invalid entries
- **Visual Feedback** - Color-coded score inputs (eagle=yellow, birdie=blue, par=green, etc.)
- **Smart Validation** - Prevents saving with errors (score out of range, putts > strokes)
- **Detailed Statistics** - Track strokes, putts, fairways hit, and greens in regulation
- **Round History** - View past rounds with expandable scorecards (front 9/back 9)
- **Color-Coded Scoring** - Visual feedback for eagles, birdies, pars, bogeys, etc.

### Handicap System (Phase 6 ✅)
- **USGA Handicap Calculation** - Compliant with World Handicap System (WHS)
- **Automatic Updates** - Handicap index recalculated when rounds are posted
- **Handicap History** - Track handicap trends over time with visual charts
- **Post for Handicap** - One-click posting of rounds for handicap calculation
- **Course Handicap** - Automatic calculation based on tee box and handicap index
- **ESC Implementation** - Equitable Stroke Control for adjusted gross scores
- **Handicap Widget** - Visual display on dashboard and profile with trend indicators

### Leaderboards & Competition (Phase 7 ✅)
- **Real-time Leaderboards** - Live updates during events using Supabase Realtime
- **Leaderboard Preview Widget** - Top 5 players displayed on event detail pages
- **Multiple Scoring Options** - Toggle between gross and net scores
- **Position Tracking** - Proper handling of ties with position badges (🥇🥈🥉)
- **Event Leaderboards** - Individual event standings with score-to-par display
- **Season Standings** - Aggregate performance across all rounds
- **Live Connection Indicator** - Animated pulse showing real-time connection status
- **Quick Access** - Direct links from event pages to full leaderboards

### Statistics & Analytics
- **Personal Statistics** - Comprehensive performance tracking dashboard
- **Scoring Distribution** - Visual breakdown of eagles, birdies, pars, bogeys, etc.
- **Recent Form** - Track your last 5 rounds with trends
- **Performance Metrics** - Best/worst rounds, average scores, and improvement trends
- **Visual Charts** - Progress bars and graphs for easy analysis

### Mobile Optimization (Phase 8 ✅)
- **Par 3 Fairway Rule** - Automatically hides fairway checkbox on Par 3 holes (golf rules compliant)
- **Responsive Score Entry** - Card-based layout on mobile with large touch targets
- **Touch-Friendly Inputs** - 25-50% larger buttons, checkboxes, and input fields on mobile
- **Mobile Navigation** - Simplified navigation header for small screens with quick access to profile
- **Sticky Navigation** - Score entry nav stays at top while scrolling
- **Mobile-First Design** - Tailwind responsive patterns (sm:, md:, lg: breakpoints)
- **Optimized Auth Flow** - Larger login/register buttons with improved touch targets
- **Responsive Grid Layouts** - Automatic stacking on mobile, multi-column on desktop

## Project Structure

```
src/
├── assets/              # Static assets and styles
├── components/          # Reusable Vue components
│   ├── common/          # Generic UI components
│   ├── layout/          # Layout components
│   ├── handicap/        # Handicap widgets
│   │   └── HandicapWidget.vue
│   ├── score/           # Score entry components
│   ├── leaderboard/     # Leaderboard components
│   ├── events/          # Event components
│   └── teams/           # Team components
├── composables/         # Composition API composables
│   ├── useAuth.ts       # Authentication logic
│   ├── useHandicap.ts   # Handicap calculations
│   ├── useLeaderboard.ts # Leaderboard data
│   ├── useRealtimeLeaderboard.ts # Real-time updates
│   └── useStats.ts      # Statistics
├── layouts/             # Page layouts
├── lib/                 # External library configs
│   └── supabase.ts      # Supabase client
├── pages/               # Page components (views)
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard
│   ├── events/          # Event pages
│   ├── rounds/          # Score entry & history
│   ├── leaderboards/    # Leaderboard pages
│   │   └── EventLeaderboardPage.vue
│   ├── stats/           # Statistics pages
│   │   └── StatsPage.vue
│   ├── teams/           # Team management
│   ├── courses/         # Course management
│   ├── profile/         # User profile
│   └── admin/           # Admin pages
├── router/              # Vue Router configuration
├── stores/              # Pinia stores
│   └── auth.ts          # Auth state management
├── types/               # TypeScript type definitions
│   ├── database.types.ts # Supabase database types
│   └── models.ts        # Domain models
├── utils/               # Utility functions
│   ├── handicap.ts      # USGA handicap calculations
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

## Recent Updates (Quick Wins)

### Score Entry Improvements
- **Auto-Save Drafts**: Score entries automatically saved to browser storage
- **Draft Recovery**: Restore unfinished rounds when returning to the page
- **Real-time Validation**: Instant feedback for invalid scores with color-coded errors
- **Visual Score Feedback**: Color-coded inputs show score quality (eagle, birdie, par, etc.)

### Event Experience Enhancements
- **Leaderboard Previews**: Top 5 standings embedded on event detail pages
- **Live Indicators**: Animated pulse shows when leaderboards are updating in real-time
- **Quick Navigation**: One-click access to full leaderboards from event pages

## Next Steps

See the project task list in `tasks.md` for the full development roadmap and implementation plan.

## License

MIT
