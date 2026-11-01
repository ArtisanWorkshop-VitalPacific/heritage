# Build ownership

Four agents build in parallel on one repo. Each owns a set of files; nobody edits another area's files. Shared foundation files are read-only for agents.

| Area | Owner | Files |
|---|---|---|
| Foundation | lead | `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/seed.ts`, `src/lib/roles.ts`, `src/lib/speech.ts`, `src/lib/illustrations*.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/app/layout.tsx`, `src/app/app/page.tsx`, `src/components/app/**`, `src/components/Illustration.tsx`, `src/components/VowelLadder.tsx`, `src/components/vowel-ladder.css`, `src/components/icons.tsx`, `src/app/api/health`, `src/app/api/tts`, `scripts/**`, `package.json`, `next.config.ts` |
| Engine | engine agent | `src/lib/ladder/**` (except it must keep the exports in `index.ts`), `src/lib/align.ts`, `src/lib/tutor-script.ts`, `src/lib/persona.ts`, `src/lib/tutor-client.ts`, `src/app/api/tutor/**`, `src/app/api/passage/**`, tests next to them |
| Site | site agent | `src/app/(site)/**`, `src/components/site/**`, `src/styles/site.css` |
| Student | student agent | `src/app/app/{student,lesson,drill,talk,placement,ladder}/**`, `src/components/student/**`, `src/styles/student.css` |
| Grown-up | adult agent | `src/app/app/{onboarding,report,print,referrals,admin,teacher,settings}/**`, `src/components/adult/**`, `src/styles/app.css`, `src/styles/print.css` |

Rules:

- CSS class prefixes: `s-` site, `st-` student, `ap-` grown-up app (shared with the frame), `pr-` print. Base classes in `globals.css` are unprefixed.
- Local dev servers: `NEXT_DIST_DIR=.next-<area> npx next dev -p <port>` so builds do not collide. Ports: site 3101, student 3102, adult 3103, engine 3104.
- Do not run `next build` (the lead runs builds). Type-check with `npx tsc --noEmit -p tsconfig.json`.
- Need a foundation change? Write it in your final report; do not edit the file.
- No new npm dependencies without asking the lead.
