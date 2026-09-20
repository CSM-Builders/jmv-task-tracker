# JMV Task Tracker

JMV Task Tracker is a responsive personal productivity dashboard built with the Next.js App Router. It supports task creation, editing, deletion with confirmation, status changes, priorities, due dates, search, filtering, sorting, progress statistics, and dark/light themes.

The sprint-support release adds projects, one-level parent/subtask planning, dependency-aware blocking, estimates, evidence notes and links, project-timezone dates, and a safe dry-run-first JSON importer. Project progress counts leaf work only, so parent milestones never inflate completion or estimate totals.

The application is immediately usable in **Demo Mode** without an account. When Supabase is configured, it adds email/password authentication, private PostgreSQL storage, server-side validation, and Row Level Security (RLS) so each person can access only their own tasks.

## Live application

The production application is available at: https://jmv-task-tracker.vercel.app

## Screenshots

Add portfolio screenshots here after you have run the app locally:

- Desktop dashboard (dark theme)
- Mobile task flow
- Light theme
- Sign-in screen

## Technology stack

- Next.js 16 App Router, React 19, and strict TypeScript
- Tailwind CSS 4 and CSS design tokens
- Supabase PostgreSQL, Auth, and the Supabase JavaScript/SSR clients
- Zod and React Hook Form
- Lucide React icons
- Vitest, React Testing Library, and Playwright
- ESLint and Prettier

All dependencies are open source. Supabase and Vercel both provide genuine free tiers suitable for a small portfolio project; review their current quotas before production use.

## Folder structure

```text
app/                    Routes, layouts, loading/error states, and protected API routes
components/auth/        Sign-in and registration UI
components/dashboard/   Dashboard state and statistics
components/layout/      Header and responsive navigation
components/tasks/       Task form, cards, and filters
components/ui/          Small reusable interface elements
hooks/                  Optional browser-agent integration
lib/supabase/           Supabase environment, browser, server, and session helpers
lib/tasks/              Repository interface and local/remote implementations
lib/utils/              Filtering, sorting, date, and statistics helpers
lib/validation/         Shared Zod schemas
supabase/migrations/    Versioned PostgreSQL schema and RLS policies
tests/                  Unit, component, and browser tests
types/                  Shared TypeScript models
```

## Prerequisites

- Node.js 20.9 or newer (Node.js 24 was used during development)
- npm 10 or newer
- A modern browser
- Optional: a free Supabase account for authentication and synchronized storage

## Local installation

From this folder, run:

```bash
npm install
copy .env.example .env.local
npm run dev
```

On macOS or Linux, use `cp .env.example .env.local` instead of `copy`.

Open [http://localhost:3000](http://localhost:3000). Leaving both values in `.env.local` blank keeps the app in Demo Mode.

## Commands

```bash
npm run dev          # Start the local development server
npm run build        # Create a production build
npm run start        # Serve the production build
npm run lint         # Run ESLint
npm run typecheck    # Check strict TypeScript types
npm test             # Run unit and component tests once
npm run test:watch   # Run tests while files change
npm run test:e2e     # Run the demo workflow in desktop and mobile Chromium
npx prettier . --check
```

Install Playwright's local Chromium once before the first browser test:

```bash
npx playwright install chromium
```

## Demo Mode

Demo Mode activates automatically when either public Supabase environment variable is missing.

- A discreet badge identifies the mode.
- Sample tasks make the interface immediately reviewable.
- Create, update, complete, filter, sort, and delete all work locally.
- Tasks and theme preference are stored in this browser's `localStorage`.
- Data does **not** sync to another device and is not protected by an account.
- Clearing site data removes demo tasks and restores fresh samples on the next visit.

The UI depends on a `TaskRepository` interface. Demo Mode selects `LocalTaskRepository`; configured mode selects `RemoteTaskRepository`, which calls protected Next.js routes. This boundary keeps visual components independent from storage.

## Supabase setup

1. Create a free project at [supabase.com](https://supabase.com). Do not enable a paid plan or trial for this project.
2. In the Supabase dashboard, open **Project Settings → API**.
3. Copy the **Project URL**.
4. Copy the client-safe **Publishable key**. Older projects may label the equivalent browser key as `anon`; never use the `service_role` or secret key in this application.
5. Copy `.env.example` to `.env.local` and add only these public client values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

6. In Supabase, open **SQL Editor**, create a new query, paste the full contents of `supabase/migrations/001_create_tasks.sql`, and run it once.
   - Existing installations must then apply `supabase/migrations/002_add_projects_hierarchy_and_import.sql` once. Back up and validate in a test project first; never rerun migration 001 as a reset.
7. Open **Authentication → Providers → Email** and keep Email/Password enabled.
8. For local development, add `http://localhost:3000` as the Site URL or an allowed redirect URL under **Authentication → URL Configuration**.
9. Restart `npm run dev`. The root route now redirects signed-out visitors to `/sign-in`.
10. Register a test user. If email confirmation is enabled, use the confirmation message from Supabase before signing in.

### How RLS protects tasks

The migration enables Row Level Security and creates separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies. Every policy compares `user_id` with `auth.uid()`. The server also derives `user_id` from the verified session and never accepts an owner ID from the browser. These two layers prevent one signed-in user from reading or changing another user's rows.

## Testing

Run the fast checks first:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Then run the browser workflow:

```bash
npx playwright install chromium
npm run test:e2e
```

The default Playwright run sets `NEXT_PUBLIC_FORCE_DEMO_MODE=1` for the test server, so a developer's `.env.local` cannot accidentally redirect the isolated demo suite into a live Supabase account. It clears local storage, creates a task, edits it, completes it, filters it, and deletes it on desktop and a Pixel-sized mobile viewport.

An opt-in authenticated test in `tests/e2e/supabase-sprint.spec.ts` validates the complete 36-record sprint manifest against a disposable development Supabase project. It is skipped unless `RUN_SUPABASE_INTEGRATION=1` and dedicated test-user credentials are supplied. See `docs/SPRINT_SUPPORT.md` for the exact migration and execution steps. Never point this write test at production.

## Deploy to Vercel Hobby

Deployment is intentionally not performed by this project setup.

1. Push the repository to your own GitHub account after reviewing it.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected Next.js framework settings and npm build command.
4. Under **Project Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production and Preview.
5. Deploy on the free Hobby plan.
6. Copy the production URL and add it in Supabase under **Authentication → URL Configuration** as the Site URL and an allowed redirect URL.
7. Redeploy if you changed environment variables after the first build.

### Verify production

- Open the deployed URL in a private browser window.
- Register and sign in with a non-sensitive test account.
- Create a task, refresh, and confirm it remains.
- Confirm another test account cannot see the first account's task.
- Check desktop and phone widths, both themes, and keyboard focus.
- Review Vercel function logs and the browser console for errors without copying secrets into logs.

## Troubleshooting

- **The app still says Demo Mode:** confirm both `.env.local` values are present, have no placeholder text, and restart the development server.
- **Sign-in succeeds but returns to sign-in:** confirm the Project URL/key match the same Supabase project and that cookies are allowed.
- **Tasks cannot be saved:** run the migration, then inspect the Supabase SQL error and RLS policies.
- **Email confirmation link returns to the wrong site:** update Supabase Authentication URL Configuration.
- **Playwright cannot find a browser:** run `npx playwright install chromium`.
- **Port 3000 is busy:** stop the other local server or run `npm run dev -- --port 3001`; update Playwright configuration if testing that port.

## Free-tier limitations

Free projects have quotas, inactivity policies, and platform limits that can change. A free Supabase project may pause after inactivity, and Vercel Hobby is intended for personal/non-commercial use. Check the providers' current documentation before relying on the app for important operations. The app does not activate trials, metered add-ons, paid email providers, or external AI APIs.

## Security notes

- Never commit `.env.local`; it is ignored by Git.
- Only the public Supabase URL and publishable key belong in browser-visible variables.
- Never place a Supabase secret or service-role key in frontend code or normal application routes.
- Task input is validated in the form, repository, and protected server routes.
- User-provided text is rendered as React text; no raw HTML rendering is used.
- RLS remains the final authorization boundary even if a route implementation changes.
- Treat the publishable key as public configuration, not as the authorization mechanism.

## Suggested next improvements

The strongest next feature is **recurring tasks with a focused activity history**. It extends personal planning without turning the app into a team product, and it creates a useful audit trail for portfolio demonstrations.

## Sprint import and rollout

See [`docs/SPRINT_SUPPORT.md`](docs/SPRINT_SUPPORT.md) for the additive migration order, rollback strategy, authenticated API/WebMCP contract, dependency rules, and dry-run-first import guide.
