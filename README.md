<p align="center">
  <img src="./public/lume-logo.svg" alt="Lume logo" width="200">
</p>

# Lume

A personal **thread visibility cockpit** — see every ongoing effort on a calendar horizon, not buried in a flat todo list.

## Why

I built Lume while juggling several parallel commitments with different deadlines. Task apps showed *what* to do, but not *when things overlap*, *what's due soon*, or *what deserves attention today*. Lume treats each commitment as a **thread** with a start and due date on a timeline, so parallel work stays visible at a glance.

## Local setup

**Prerequisites:** Node.js 20+, a [Supabase](https://supabase.com) project

```bash
git clone https://github.com/<you>/lume.git
cd lume
npm install
cp .env.example .env.local
```

1. Add your Supabase **URL** and **anon key** to `.env.local`.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Start the dev server: `npm run dev` → http://localhost:3000

Optional: set `DATE_TZ=America/New_York` (or any IANA timezone) so server-rendered "today" matches your wall clock.

## Example threads in life

These are the kinds of threads Lume is built for — ongoing efforts with a start and end, not one-off tasks:

| Thread | Category | What it tracks |
|--------|----------|----------------|
| Job search | Career | Applications, networking, follow-ups |
| Product launch | Work | Milestones toward a v1 release |
| Certification study | Learning | Modules and practice leading up to an exam |
| Home renovation | Personal | Phases from planning through completion |
| Race training | Health | Weekly sessions building toward event day |

Each thread can have **subthreads** (checklist items), **daily logs** (short notes per day), and a **Today focus** pin so your morning scan stays calm.

## Stack

Next.js · TypeScript · Tailwind · Supabase · Zustand · Framer Motion
