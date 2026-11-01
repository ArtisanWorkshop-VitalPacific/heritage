# Heritage Readers

A classical reading tutor that listens. Hay & Wingo phonics and the McGuffey tradition, taught one child at a time, on paper first. Built on the methods of Susan Weaver, M.A.

This repository is the walkthrough demo: the marketing site and the full web app in demo mode (data stays in the browser).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # reading engine tests
npm run build      # also downloads and converts the illustrations
```

## Map

- `src/app/(site)` marketing site
- `src/app/app` the app: student, parent, teacher, admin surfaces
- `src/lib/ladder` the deterministic reading engine (rungs, decoder, validator, state machine, placement)
- `src/lib/store.tsx` demo store, roles and permissions
- `design/heritage-readers.tokens.json` design tokens
- `docs/` state machine spec, build plan, walkthrough

## Environment

None required. Optional:

- `ELEVENLABS_API_KEY` switches the tutor to the ElevenLabs voice (`ELEVENLABS_VOICE_ID`, `ELEVENLABS_VOICE_ID_UK` to choose voices).
- `TUTOR_MODEL` overrides the AI Gateway model list (comma-separated).
- `AI_GATEWAY_API_KEY` for local development; on Vercel the OIDC token is used.
