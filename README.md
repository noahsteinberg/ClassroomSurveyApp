# Classroom Survey App

React + TypeScript + Vite project for the CSE 4095 classroom survey assignment.
Phase 1 provides the home page and development tooling. Authentication, surveys,
database integration, and deployment are pending; this is not a working survey app yet.

## Local setup

Use a recent Node.js version compatible with the installed Vite release (setup verified
with Node 25.2.0 and npm 11.6.2).

```sh
npm ci
npm run dev
```

For later Supabase integration, copy `.env.example` to `.env.local` and supply only the
project URL and browser-safe public anon key. The Phase 1 home page requires no environment
configuration. Never use a service-role key in Vite variables.

```sh
npm run lint
npm run format:check
npm run build
npm run preview
```

`src/pages` holds route pages, `src/components` shared UI, `src/lib` data helpers,
`supabase/migrations` future versioned database changes, and `public` static assets.
Tailwind uses its Vite plugin. React Router currently serves only `/`.
Supabase, Recharts, and qrcode are installed for later phases.

See the supplied specifications, `TODO.md`, and `development-notes.md` for requirements,
open decisions, verified progress, and remaining work. Production/database setup and
deployment instructions will be added when those phases are implemented.
