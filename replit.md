# OddsAura - AI Football Prediction Platform

## Overview
AI-powered football match prediction and analysis platform using real-time Football Data API data, statistical models (Poisson, xG, Elo, Monte Carlo, Bayesian, Kelly Criterion), and instant AI analysis to deliver comprehensive prediction insights. Now with PWA support, theme toggle, bankroll tracking, team favorites, and more.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI with dark/light theme toggle
- **Backend**: Express.js with Football Data API integration
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: Built-in AI Advisor with natural language analysis powered by statistical models (no external API needed) + Statistical prediction engine
- **Auth**: Replit Auth integration
- **PWA**: Service worker, manifest, installable on mobile

## Key Features
- Landing page with cinematic hero video background, feature showcase, stats highlights, and CTAs
- Dashboard with match prediction cards, date navigation (7-day windows), league filters, LIVE match filter
- Match results (scores) displayed on cards and detail pages for finished/live matches with HT scores
- Match detail pages with 23+ betting markets, team comparison charts, top 3 picks showcase
- Form Guide: Recent W/D/L badges for both teams on match detail pages
- Head-to-Head: Past meeting results and win/draw/loss aggregate stats
- Match Timeline: Goals, cards, substitutions in chronological order for finished/live matches
- Animated SVG confidence meters on all prediction displays
- Beginner-friendly tooltips explaining all market types (1X2, BTTS, O/U, etc.)
- AI Advisor powered by built-in statistical analysis engine with real-time match data, natural language conversation (no external API needed)
- AI summaries with specific xG data, clean sheet %, BTTS %, scoring probabilities, and most likely scoreline
- Intelligent top-3 pick selection using market categories, match profiles, and match-specific seed diversity
- Daily Picks page with explanation panel and confidence meters
- Longshot Accumulator: Daily 20-25 leg multi-bet across different days/leagues with combined odds
- "My Picks" panel - minimized pill button, expands on tap, save-as-image (Canvas API), share link
- Shareable Picks: Generate unique share links for picks, viewable by anyone
- Bankroll Tracker: Log bets, mark won/lost, track profit/loss, ROI, total staked/returned
- Favorite Teams: Follow teams with heart icons on match detail, dedicated favorites page
- Onboarding Tour: Multi-step guided tour for new users on first visit
- Dark/Light Theme Toggle: Switch between dark premium UI and light mode
- Analytics page with ALL league standings (12 competitions), team search, league filters
- Statistics page - AI performance dashboard with accuracy tracking, donut charts, market breakdowns, trends, streak tracker
- Odds Comparison: Compare odds across 5 bookmakers on match detail pages with best odds highlighted
- Pick History: Archived daily picks grouped by date with result tracking
- Performance Summary: Weekly/monthly stats with streaks, competition breakdown, daily results
- Leaderboard: User rankings by accuracy and ROI
- Streak Tracking: Current/longest win/loss streaks with automatic updates
- Bankroll CSV Export: Download complete betting history as CSV file
- Browser Notifications: Goal alerts for favorite teams, daily picks refresh, match kickoff reminders
- ALL available leagues from Football Data API
- LIVE match indicators with clickable filter
- Mobile-responsive with back buttons on all inner pages
- PWA Support: Installable on mobile, service worker caching, push notifications

## Project Structure
- `client/src/pages/` - Dashboard, Match Detail, Daily Picks, Longshot Accumulator, AI Chat, Analytics, Statistics, Bankroll, Favorites, SharedPicks, Privacy Policy, Pick History, Performance Summary, Leaderboard
- `client/src/components/` - MatchCard, BetSlip (My Picks with share link), StatsOverview, AppSidebar, OnboardingTour
- `client/src/lib/` - bet-slip-context, theme-context, queryClient, notifications
- `server/routes.ts` - All API endpoints + AI chat with match context
- `server/ai-advisor.ts` - Built-in AI Advisor engine with intent detection, natural language responses, and real-time match data analysis
- `server/football-api.ts` - Football Data API client (12 competitions, 7-day fetch window, H2H, team form, match details)
- `server/prediction-engine.ts` - Match prediction generation with beginner-friendly AI summaries + score tracking
- `server/storage.ts` - Database operations (conversations, predictions, dailyPicks, favorites, bankroll, sharedPicks)
- `server/db.ts` - Database connection
- `shared/schema.ts` - Drizzle schema + TypeScript types (includes MatchScore, FavoriteTeam, BankrollEntry, SharedPick)
- `client/public/` - PWA manifest, service worker, app icons

## Design Tokens
- Fonts: Inter (body), Rajdhani (display/headings), Roboto Mono (data/numbers)
- Colors: Black background (#0d1520 cards), neon green (#00FFA3), amber (#FFB800), red (#EF4444), white text
- Light mode: White backgrounds, dark text, same accent colors
- Animated SVG confidence rings on stat cards, match cards, daily picks, match detail
- Tooltip explanations on HelpCircle icons throughout

## API Routes
- `GET /api/predictions?dateFrom=&dateTo=` - All match predictions with date filtering (cached 5min)
- `GET /api/predictions/:matchId` - Single match prediction
- `GET /api/statistics` - Predictions with past 7 days + future 7 days for performance tracking
- `GET /api/standings` - All league standings (12 competitions with emblems)
- `GET /api/daily-picks` - Daily AI picks (top 5 by confidence)
- `GET /api/longshot` - Daily longshot accumulator (20-25 legs across multiple days/leagues)
- `GET /api/matches/:matchId/h2h` - Head-to-head history between teams
- `GET /api/teams/:teamId/form` - Recent form guide (W/D/L) for a team
- `GET /api/matches/:matchId/details` - Match timeline events (goals, cards, subs)
- `GET /api/favorites` - List favorite teams
- `POST /api/favorites` - Add team to favorites
- `DELETE /api/favorites/:teamId` - Remove team from favorites
- `GET /api/bankroll` - List all bankroll entries
- `POST /api/bankroll` - Add bankroll entry
- `PATCH /api/bankroll/:id` - Update entry result (won/lost)
- `DELETE /api/bankroll/:id` - Delete bankroll entry
- `GET /api/predictions/:matchId/odds` - Odds comparison across 5 bookmakers
- `GET /api/daily-picks/history` - Past daily picks grouped by date
- `GET /api/streaks` - Current and longest win/loss streaks
- `GET /api/leaderboard` - User rankings by accuracy/ROI
- `POST /api/leaderboard` - Submit leaderboard entry
- `GET /api/performance-summary?period=` - Performance stats (week/month/all)
- `GET /api/bankroll/export` - CSV export of bankroll entries
- `PATCH /api/daily-picks/:id/result` - Update pick result (won/lost)
- `POST /api/shared-picks` - Create shareable picks link
- `GET /api/shared-picks/:code` - Get shared picks by code
- `GET /api/conversations` - List chat conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Send message (built-in AI advisor streaming via SSE with match context)

## Database Tables
- `conversations` - AI chat conversations
- `messages` - Chat messages within conversations
- `predictions` - Stored match predictions
- `daily_picks` - Daily top picks (pickDate, matchDate, teams, competition, result)
- `favorite_teams` - User's followed teams (teamId, teamName, teamCrest)
- `bankroll_entries` - Bet tracking (matchLabel, market, pick, stake, odds, result, payout)
- `shared_picks` - Shareable pick links (shareCode, picksData as JSON)
- `user_streaks` - Win/loss streak tracking (currentStreak, longestWinStreak, longestLossStreak)
- `leaderboard_entries` - User rankings (username, totalPicks, correctPicks, accuracy, roi)

## User Preferences
- AI Advisor uses built-in statistical engine with real-time match data for natural language conversation (no external API needed)
- Show only 3 predictions per match card (top picks)
- AI gives its own prediction in plain language with 3 specific picks
- "My Picks" not "Bet Slip" - minimized pill when not in use
- ALL available leagues, not just top 5
- Beginner-friendly with tooltips and explanations
- LIVE filter to quickly find live matches
- Mobile-first responsive design
- Back buttons on all inner pages
- Match scores displayed prominently for finished/live matches
- Dark mode default, light mode available via toggle
