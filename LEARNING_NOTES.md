# JMV Task Tracker learning notes

This guide explains the application without assuming prior Next.js or database experience.

## Pages and layouts

Next.js uses the folders inside `app/` to create routes. `app/page.tsx` is the home page at `/`. `app/sign-in/page.tsx` becomes `/sign-in`. `app/layout.tsx` wraps every route, loads global fonts and styles, and provides shared page metadata.

Special files have framework meanings:

- `loading.tsx` appears while a route is resolving data or a session.
- `error.tsx` catches unexpected rendering failures and offers recovery.
- `route.ts` files implement HTTP endpoints rather than visible pages.
- `proxy.ts` refreshes Supabase session cookies before a request reaches a route.

## Server and Client Components

Components are Server Components by default. They run on the server and cannot use browser state, click handlers, `localStorage`, or React effects. The home page is a Server Component because it decides whether Supabase is configured and verifies a real user before rendering synchronized data.

A file begins with `"use client"` only when it needs browser interactivity. The dashboard shell, forms, theme control, and task cards are Client Components because they respond to input and keep temporary UI state.

Keeping the boundary small reduces browser JavaScript and prevents server-only credentials or cookie code from entering the client bundle.

## How task data flows

```text
Dashboard UI → TaskRepository interface
                 ├─ Demo: LocalTaskRepository → localStorage
                 └─ Configured: RemoteTaskRepository → /api/tasks → Supabase + RLS
```

The dashboard does not know how a task is stored. It calls `list`, `create`, `update`, and `remove`. This is called a repository pattern. It makes Demo Mode genuinely functional while keeping a clean path to the production database.

In configured mode, browser requests go to protected Next.js route handlers. Those handlers verify the current user, validate request data with Zod, and then query Supabase. Supabase applies RLS once more before PostgreSQL reads or changes a row.

## What Supabase provides

Supabase supplies two services used here:

1. **Auth** manages email/password accounts and secure sessions.
2. **PostgreSQL** stores tasks in a relational table with constraints and indexes.

The Supabase JavaScript client talks to both services. The `@supabase/ssr` helpers keep browser and server cookies in sync for the Next.js App Router.

## Environment variables

Environment variables are configuration values kept outside source files. `.env.example` lists the names the app expects but contains no credentials. Your local values belong in `.env.local`, which Git ignores.

Variables beginning with `NEXT_PUBLIC_` are included in browser code. Therefore, only Supabase's public Project URL and publishable key may use this prefix. A service-role or secret key must never be placed there.

## Why Row Level Security is necessary

Authentication answers “Who is this user?” Authorization answers “Which rows may this user access?” RLS performs authorization inside the database.

Each task stores a `user_id`. The policies allow an operation only when that value matches the signed-in user's `auth.uid()`. Even if someone manually calls the API or a future UI bug requests another person's task, the database rejects it.

## How to inspect errors

1. Read the friendly message shown in the interface.
2. Open the browser developer tools and check the **Console** for rendering errors.
3. Check the **Network** tab for a failed `/api/tasks` request and its HTTP status.
4. Read the terminal running `npm run dev` for server-route errors.
5. In Supabase, inspect database and authentication logs without copying credentials into an issue or chat.
6. Run `npm run typecheck`, `npm run lint`, and `npm test` to catch common mistakes locally.

## Important files to study first

1. `types/task.ts` — the shape of a task and its allowed status/priority values.
2. `lib/validation/task.ts` — input rules shared by forms, repositories, and routes.
3. `lib/tasks/repository.ts` — the small contract every storage implementation follows.
4. `lib/tasks/local-repository.ts` — readable browser-storage CRUD.
5. `components/dashboard/dashboard-shell.tsx` — how UI state and repository calls meet.
6. `app/api/tasks/route.ts` and `app/api/tasks/[id]/route.ts` — protected server mutations.
7. `supabase/migrations/001_create_tasks.sql` — table constraints, indexes, trigger, and RLS.
8. `app/globals.css` — the visual design tokens and reusable interaction styles.
9. `tests/e2e/demo.spec.ts` — the user journey expressed as an automated browser test.

When changing behavior, start with the task type and validation, update the repository or route, then change the component. Finish by adding or updating the smallest test that proves the behavior.
