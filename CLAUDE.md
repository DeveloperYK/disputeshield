# Chargeback Defense Tool

## Project Overview
AI-powered chargeback defense tool for small Stripe merchants. Flat pricing ($29-49/month) vs Chargeflow's 25% cut. Win probability prediction before merchants invest time fighting.

## Tech Stack
- **Backend:** FastAPI (Python 3.9) — `/backend`
- **Frontend:** Next.js (App Router) — `/frontend`
- **Database:** PostgreSQL (SQLAlchemy ORM)
- **AI:** Claude API (analysis + response generation)
- **Auth:** JWT + Stripe Connect OAuth
- **Payments:** Stripe Billing

## Backend API Base URL
Development: `http://localhost:8000/api`

## Frontend Development Rules

### Design Philosophy
- **Break norms. Be bold.** This is not another boring SaaS dashboard.
- Design like a fintech product that merchants actually enjoy using, not tolerate.
- Every interaction should feel intentional, polished, and alive.
- Prioritise clarity over decoration — but never be boring.

### Use Vercel's Frontend Skills
- Use **Next.js App Router** with server components by default, client components only when needed.
- Use **Vercel AI SDK** (`ai` package) for streaming AI responses to the frontend (analysis explanations, letter generation).
- Use **next/font** for optimised font loading.
- Use **next/image** for all images.
- Use **Vercel Analytics** and **Speed Insights** for production monitoring.
- Follow Vercel's patterns: layouts, loading states, error boundaries, parallel routes where appropriate.
- Use **Server Actions** for form mutations where it simplifies the code.
- Use **Suspense boundaries** with skeleton loaders for async data.

### Use Anthropic's Frontend Craft
- Build UIs that feel like they were designed by someone who cares deeply about the user.
- **Micro-interactions everywhere:** hover states, transitions, loading animations. Nothing should feel static.
- **Progressive disclosure:** don't overwhelm. Show what matters, reveal depth on demand.
- **AI-native UI patterns:** streaming text for AI analysis, typewriter effects for generated letters, confidence indicators for win probability.
- **Data visualisation:** use animated charts for analytics. Make numbers feel alive, not just displayed.
- **Empty states matter:** when there are no disputes, don't show a sad empty table. Show an encouraging onboarding state.
- **Error states are opportunities:** make errors helpful, human, and recoverable.

### UI/UX Standards
- **Colour palette:** Dark mode first. Use a bold accent colour (electric blue or vivid green) against deep navy/charcoal backgrounds. The product deals with money — it should feel premium and trustworthy.
- **Typography:** Use a clean sans-serif (Inter or Geist). Large, confident headings. Generous whitespace.
- **Motion:** Use Framer Motion for page transitions, list animations, number counters, and micro-interactions. Motion should be purposeful — guide the eye, confirm actions, create rhythm.
- **Layout:** Full-width dashboard. No cramped sidebars. Use a slim, icon-driven nav rail or top nav. Content breathes.
- **Cards over tables:** Present disputes as rich cards with status badges, countdown timers, and win probability gauges — not spreadsheet rows.
- **Win probability:** Display as an animated radial gauge or arc, not just a number. Colour-coded: green (fight), amber (borderline), red (skip). This is the hero element.
- **AI interactions:** Stream analysis text in real-time. Show a thinking/reasoning indicator while Claude processes. Make the AI feel present, not hidden.
- **Mobile responsive:** Dashboard must work on mobile. Merchants check chargebacks on their phone.

### Component Library
- Use **Tailwind CSS** for styling.
- Use **shadcn/ui** as the component foundation — but customise aggressively. Don't ship default shadcn aesthetics.
- Use **Framer Motion** for animations.
- Use **Recharts** or **Tremor** for charts/analytics.
- Use **Lucide** for icons.

### File Structure
```
/frontend
  /app
    /layout.tsx              # Root layout with nav, dark theme
    /page.tsx                # Landing/marketing page
    /(auth)
      /login/page.tsx
      /register/page.tsx
    /(dashboard)
      /layout.tsx            # Dashboard layout with nav rail
      /dashboard/page.tsx    # Main inbox + stats overview
      /disputes/[id]/page.tsx # Dispute detail: score, evidence, response
      /analytics/page.tsx    # Win rate charts, $ recovered, breakdowns
      /settings/page.tsx     # Account, Stripe connection, billing
    /stripe
      /callback/page.tsx     # Stripe OAuth callback handler
    /billing
      /success/page.tsx
      /cancel/page.tsx
  /components
    /ui                      # shadcn/ui base components (customised)
    /dashboard               # Dashboard-specific components
    /disputes                # Dispute cards, detail views
    /analytics               # Charts, stat cards
    /shared                  # Reusable across the app
  /lib
    /api.ts                  # API client for backend calls
    /auth.ts                 # Auth context/hooks
    /utils.ts                # Formatting, helpers
```

## Testing
- TDD methodology: RED → GREEN → REFACTOR
- 80%+ test coverage target
- Unit tests for services, integration tests for API routes
- Backend: pytest (100 tests currently passing)
- Frontend: Vitest + React Testing Library for components, Playwright for E2E

## After Every Change (MANDATORY)
After making any code change, immediately run all tests and push:

1. **Backend tests:** `cd backend && python3 -m pytest -v` — all tests must pass
2. **Frontend build:** `cd frontend && npx next build` — must compile with zero errors
3. **Playwright E2E:** `cd frontend && npx playwright test` — all E2E tests must pass
4. **Commit & push** the changes

If any step fails, fix it before pushing. No exceptions. No `--force`. No skipping.

### Running locally for manual testing
- **Backend:** `cd backend && uvicorn app.main:app --reload --port 8000`
- **Frontend:** `cd frontend && npm run dev` (runs on port 3000)
- Frontend expects backend at `http://localhost:8000/api` (set `NEXT_PUBLIC_API_URL` to override)
