# Heritage Readers Demo: Build Gameplan

Runner: Claude Opus 5.5 at max effort, in Claude Code, with GitHub and Vercel access. Written 2026-11-01. The same plan is being executed in the current cloud session as a fallback; whichever finishes first ships.

## 0. Definition of done

Matt walks Susan and a few others through the product on a phone, an iPad and a laptop, from a single Vercel URL, without any screen that says "coming soon." Everything below is live in demo mode (browser-stored data, seeded family and school):

1. Marketing site with period illustrations: home, method, for schools, pricing, about Susan.
2. Create a parent profile and a child profile. Set age band, interests, faith track, modern comparisons, screen cap.
3. Placement exam: letter names, letter sounds, phonograms, words, one passage. Mic in Chrome and Safari, tap-to-mark fallback. Produces a rung.
4. Lesson: the passage screen, tap-to-hear, reading check with the moving underline, tutor caption, the Hay and Wingo vowel ladder drill.
5. Verbal conversation with the tutor: push to talk, reply in voice.
6. Ladder, seals, shelf. Parent report with chart, recordings, next skills, projected date, screen minutes next to paper minutes.
7. Print packet: teacher page, student page, score sheet, from the same lesson object, via the browser print dialog.
8. Referral program: give a month, get a month, link, ledger, milestone share prompt.
9. Admin surface: organization, members, roles, licenses, audit log. Teacher surface: mastery board, class packets. Role switcher: Parent, Teacher, Admin, Student. Permission gating enforced in the UI and in the data layer.
10. Dark mode on adult surfaces. Student surfaces light only. Phone width works everywhere.

Not in scope: real accounts and database, payments, native iOS, the recorded voice, child-tuned ASR, the full 90-rung corpus.

## 1. What already exists

- Design system showcase (artifact "Heritage Readers Design System") with components and the three screens.
- `heritage-readers.tokens.json` in the project files. Update it with the sampled colors in section 5.
- `poc-state-machine.md` in the project files. The TypeScript port follows it exactly.
- Five photographs of Hay and Wingo, Reading with Phonics (pages 36-39, 42-45, 54-55), in `ref/`. They define the drill form and the sampled colors.
- This plan.

## 2. Environment and accounts

- Vercel: matt@artisanws.com, username matt-8330, Hobby plan, default team id `team_5VVnzgzEWqUJvvJYNgEW4J2X`. GitHub namespace connected to Vercel: `ArtisanWorkshop-VitalPacific` (installation 102250050).
- GitHub: create `ArtisanWorkshop-VitalPacific/heritage-readers` (private). The cloud session could not create it (no GitHub credential); Claude Code with `gh auth` can.
- AI Gateway: on Vercel deployments, `VERCEL_OIDC_TOKEN` authenticates `https://ai-gateway.vercel.sh/v1/chat/completions`. Model candidates in order: `anthropic/claude-sonnet-5.5`, `anthropic/claude-sonnet-5`, `openai/gpt-6.1-sol`. If every candidate fails (credits, plan), the scripted tutor runs. Locally, set `AI_GATEWAY_API_KEY`.
- ElevenLabs: optional. If `ELEVENLABS_API_KEY` is set, `/api/tts` streams the ElevenLabs voice; otherwise the client uses `speechSynthesis`.
- Higgsfield MCP (Matt's account, 567 credits, cap 300 tonight): image model `gpt_image_2_5` (variants flare, sunburst; quality low to max; 1k to 4k; reference images). Video default `seedance_2_5` (confirm with `models_explore`). Assets generated once; the repo carries `public/illustrations/manifest.json` with URLs and `scripts/fetch-illustrations.mjs` to download them.
- Hosting constraint: GitHub Pages cannot run the API routes, so the demo runs on Vercel.

## 3. Architecture

- Next.js 16 (App Router), React 19, TypeScript 5.9. No UI framework. CSS custom properties from the token file. Fonts via `next/font/google`: Andika, Libre Caslon Text, Libre Caslon Display. System sans for interface.
- Demo store: a React context backed by `localStorage` under one key, `hr:demo:v1`, with a versioned seed. Every write goes through `store.dispatch` so the role gate can refuse writes a role is not allowed to make.
- Server: three route handlers. `/api/tutor` (gateway with fallback), `/api/tts` (ElevenLabs when configured), `/api/health` (reports which tutor path is active, used in the morning check).
- Speech: `src/lib/speech.ts` wraps `webkitSpeechRecognition` and `speechSynthesis` with feature detection. No audio is stored.
- State machine: `src/lib/ladder/` with `rungs.ts`, `bank.ts`, `validator.ts`, `machine.ts`, `placement.ts`. Pure functions, unit-tested with Vitest.
- Print: `/app/print/[lessonId]` renders the packet with a print stylesheet; a Print button calls `window.print()`.

## 4. Repo structure

```
heritage-readers/
  README.md
  package.json  next.config.ts  tsconfig.json  vitest.config.ts
  design/heritage-readers.tokens.json
  docs/poc-state-machine.md  docs/demo-gameplan.md  docs/demo-walkthrough.md
  ref/  (the five book photographs)
  scripts/fetch-illustrations.mjs
  public/illustrations/manifest.json  (+ downloaded files after the script runs)
  src/app/layout.tsx  globals.css
  src/app/(marketing)/layout.tsx  page.tsx  method/  schools/  pricing/  about/
  src/app/app/layout.tsx  page.tsx  onboarding/  placement/  lesson/  drill/  ladder/
      report/  print/[lessonId]/  referrals/  admin/  teacher/  settings/
  src/app/api/tutor/route.ts  tts/route.ts  health/route.ts
  src/lib/tokens.ts  store.tsx  seed.ts  roles.ts  speech.ts  corpus.ts  illustrations.ts
  src/lib/ladder/rungs.ts  bank.ts  validator.ts  machine.ts  placement.ts  *.test.ts
  src/components/  (Passage, VowelLadder, CourseLadder, DrillCard, Seal, Shelf, Mic, Tile,
      Sparkline, Button, Engraving, RoleSwitcher, PrintPacket, Tutor, PushToTalk, Nav, Footer)
```

## 5. Design application

Two layers, one rule: interface modern and flat, content period. Textures only inside illustration frames. Controls never pictured as period objects.

Sampled from Matt's photographs of Hay and Wingo (white-balanced on the white "ten" card on page 38; confirm against a flatbed scan later):

| Token | Value | Source |
|---|---|---|
| spot.hwPink (vowel ink) | #E36B74 | mean of two readings, #FB6D60 (p36-37) and #D86C7B (p54-55) |
| spot.hwPost (ladder post grey) | #999C96 | mean of #A9A9A4 and #8D908A |
| neutral.hwPage | #F8F5E9 | page cream |
| spot.hwYellow (plate page) | #F5C125 | page 45 plate, reading clipped at #FFC81F |
| spot.hwRed (wagon) | #F5615E | page 43 |
| spot.hwGreen (fence) | #86CC94 | page 36 |
| spot.hwBlue (sky) | #99DBE7 | page 36 |
| spot.hwOchre (horse) | #F8B466 | page 36 |

Use: hwPink for vowels in every drill and ladder word, hwPost for ladder posts and rungs, hwPage as the drill card ground, hwYellow for the plate-style letter pages. The McGuffey neutrals (parchment, lamp black, slate) and the semantic colors (hunter mastered, ochre review, navy tutor, muted red correction on adult surfaces only) stay as in the token file until McGuffey scans arrive.

The Hay and Wingo vowel ladder, exact form from the photographs:
- Header `a e i o u` in hwPink, letterspaced, above the ladder.
- Two ladders side by side. Each has two vertical posts in hwPost with five horizontal rungs. The left ladder carries consonant plus vowel (ha, he, hi, ho, hu), the right carries the finished word (hat, hen, hid, hot, hug). The bottom rung is `a`; the child climbs to `u`.
- Vowels in hwPink, consonants in ink. The rung text sits on the rung line, centered.
- Below the ladders, two rows of minimal pairs that change only the vowel (hit/hat, hum/hem).
- Below that, a three-line decodable passage and one illustration.
- A letter page introduces each consonant: a large `h H` under a single spot illustration (the book uses a horse). The app's letter pages use an original mnemonic object per letter.

Type: literacy face (Andika) for ages 4 to 6 at 30px tablet and 26px phone, book serif (Libre Caslon Text) from age 7, system sans for interface. No italics for the young bands. 56px touch targets on the student surface.

Dark mode: adult surfaces follow the system; student surfaces are light only.

## 6. Data model and seeds

Types in `src/lib/store.tsx`:

- `Tenant { id, kind: 'family'|'organization', name, plan, licenses }`
- `Member { id, tenantId, name, email, role: 'owner'|'admin'|'teacher'|'aide'|'parent'|'observer' }`
- `Child { id, tenantId, name, ageBand: 'A'|'B'|'C', age, sex, interests: string[], faithTrack, modernComparisons, screenCapMinutes, voice: 'american'|'british' }`
- `LadderState` as in the state machine spec, one per child.
- `PlacementResult { childId, date, letterNames, letterSounds, phonograms, words, passageAccuracy, rung }`
- `Session { id, childId, date, step, outcomes: WordOutcome[], accuracy, screenMinutes, paperMinutes }`
- `Referral { code, ownerMemberId, invited: {email, status, paidAt}[], monthsEarned, cap: 12 }`
- `LedgerEntry { id, memberId, kind: 'credit'|'debit', months, reason, date }`
- `AuditEvent { id, tenantId, actorId, action, target, date }`
- `Class { id, tenantId, name, teacherId, studentIds }`

Seeds: the Harper family (parent Claire Harper; children Nora, 6, band A, interests horses, baking, birds; Eli, 8, band B, interests ships, maps) and Oak Hill Classical Academy (admin Ruth Adler, teachers Mr. Bell and Mrs. Finch, 12 students across rungs 6 to 22, 40 seats licensed, 31 used). A referral code `NORA-8K2F` with two invites, one paid. Nora at rung 8 with 7 rungs mastered, 8 weeks of fluency data (31 to 44 wcpm). Eli at rung 19.

## 7. State machine

Port `docs/poc-state-machine.md` to TypeScript. Demo rung list (40 rungs, the first 20 with hand-written word banks):

1 short a · 2 short e · 3 short i · 4 short o · 5 short u · 6 m s t p n · 7 b c d f g · 8 h · 9 j · 10 w · 11 v qu y z · 12 k l r · 13 ending blends -nt -nd -mp · 14 ending blends -lk -lt -lf -st -sk -ck · 15 l-blends bl cl fl gl pl sl · 16 r-blends br cr dr fr gr pr tr · 17 s-blends sc sk sm sn sp st sw · 18 digraphs sh ch th wh · 19 -ng -nk · 20 silent e, long a · 21 silent e, long i · 22 silent e, long o u · 23 ee ea · 24 ai ay · 25 oa ow · 26 ar · 27 or · 28 er ir ur · 29 oo · 30 ou ow · 31 oi oy · 32 au aw · 33 soft c g · 34 -tch -dge · 35 y as a vowel · 36 open syllables · 37 compound words · 38 -ed -ing · 39 plurals · 40 two-syllable words.

Sight words by rung (cumulative): 1: a, the · 3: is, in, on · 5: to, and · 8: said, you · 10: come, go · 13: will, with · 15: was, of · 18: they, were.

`bank[rung]` is computed from a 600-word lexicon with hand-tagged phonogram parses, then frozen into `bank.json`. The validator rejects any generated word outside `bank[rung] ∪ sight ∪ names`. Three rejections fall back to a corpus passage. Tutor speech is not validated; anything the tutor puts on screen is.

Placement: 10 minutes. Letter names (10), letter sounds (10), phonograms (8), words (12 across rungs 1 to 20), one passage. Rung = highest rung with 95% word accuracy and no sound errors, minus 1 if the passage falls under 90%.

## 8. Screens

Each item: route, what it shows, interactions, done when.

Marketing
- `/` Hero (engraving plus the Seedance clip as a muted background video with a still fallback), thesis, how it works (three steps), the ladder (interactive vowel ladder), paper mode, for schools, Susan, pricing teaser, CTA to `/app/onboarding`. Done when every section has real copy and an illustration.
- `/method` The classical method, Hay and Wingo, McGuffey, the Trivium arc by age, what the AI does and does not decide.
- `/schools` Classical schools, co-ops, microschools. Class packets, mastery board, ESA and 529 notes, DPA line.
- `/pricing` Family $399 a year or $39 a month. Per-student $600 through ESA. Schools per seat. Give a month, get a month.
- `/about` Susan Weaver: 42 years, the six children, Biola, the books. No photo unless Matt supplies one.

App shell `/app`
- Top bar: child switcher, role switcher (Parent, Teacher, Admin, Student), theme follows system on adult surfaces.
- `/app/onboarding` Parent profile, then child profile. Age band, interests, faith track, modern comparisons, screen cap, voice. Writes the Child and routes to placement.
- `/app/placement` Five sections with progress. Mic button with live transcript; tap-to-mark fallback per item. Result screen: rung, what the child knows, what comes next, start first lesson.
- `/app/drill` The letter page and the vowel ladder for the current rung. Tap any rung to hear it. Tap "Climb" to run the ladder top to bottom with the tutor voice.
- `/app/lesson` Passage screen. Word tap sheet with phonogram split and Hear. Begin reading runs the check: Web Speech transcript aligned to the passage word by word; underline advances; misread words marked for review in ochre; result caption; the one mastery animation when a rung is earned. Talk button opens push-to-talk.
- `/app/ladder` Course ladder (the 40 rungs), seals for mastered rungs, the shelf.
- `/app/report` Three numbers, chart with norm line, two recordings (sample waveforms), next three skills, projected date, minutes on screen next to minutes on paper, Print next week, Give a friend a month.
- `/app/print/[lessonId]` Teacher page, student page, score sheet, QR placeholder. Print button.
- `/app/referrals` Code, link, copy, invite by email (demo: adds to list), ledger, cap progress, the ESA note.
- `/app/admin` Organization card, members table with role edits (gated to Admin and Owner), licenses used of total, audit log, DPA and SSO rows marked "demo".
- `/app/teacher` Mastery board: one row per child, one column per rung group, cells colored mastered, current, review. Print class packets by group.
- `/app/settings` Screen cap, voice, faith track, modern comparisons, delete demo data.

Student surface rules: no navigation beyond lesson, drill and ladder; no settings; no sharing; light theme; 56px targets; the tutor never says "wrong."

## 9. Voice pipeline

- Push to talk: hold the button, `SpeechRecognition` runs with `interimResults`, release sends the final transcript to `/api/tutor` with `{ childId snapshot, rung, lastPassage, lastOutcomes, transcript }`.
- `/api/tutor`: builds the persona prompt (section 10 of the earlier persona notes: two registers, one classical word per lesson with a plain gloss, no brands, no comparisons to other children, Direct Instruction corrections), calls the gateway with a 6 s timeout, validates any on-screen words against the bank, returns `{ text, onScreen?: string[], source: 'gateway'|'script' }`. The scripted tutor handles greetings, "what does this word say," "read it again," "I don't know," encouragement, and lesson navigation.
- Voice out: if `/api/tts` reports configured, fetch audio and play; else `speechSynthesis` with an en-US female voice when available, rate 0.9.
- Mic state visible at all times. Audio never leaves the browser except the transcript text.

## 10. Illustrations and motion

Model: `gpt_image_2_5`, variant flare, quality high for the anchor and hero, medium for the rest, 1k, aspect 3:2 for vignettes, 1:1 for spots, 16:9 for the hero. Generate the anchor first and pass it as `image_references` for every engraving. Pass the Hay and Wingo page 36 photo as the reference for the spot illustrations.

Engraving prompt base: "19th-century wood engraving in the manner of the 1879 McGuffey Readers. End-grain boxwood, fine cross-hatching and stippling, a single black ink on cream paper, vignette with soft feathered edges, pastoral American scene, anatomical proportion, restrained expressions, no text, no border."

Spot prompt base: "Mid-century children's primer illustration, 1946, gouache and ink, clean silhouettes, limited palette of coral red, grass green, sky blue and golden ochre, one object isolated on cream paper, no background, no text."

List (24 images): hero (child on a bench reading under an oak beside a one-room schoolhouse, mother nearby); tortoise and hare; little red hen with wheat; shepherd boy on a hillside with sheep; ant and grasshopper; lion and mouse; crow and pitcher; fox and grapes; mother and child reading at a hearth; teacher with four children at a schoolhouse table; printed primer on a wooden desk with inkwell; wren on a branch; child with slate and chalk; shelf of old readers; village lane with church spire. Spots: bell, hen, hat, fan, wagon, tent, kite, sun, nest, jug, ship, clock.

Motion: one Seedance clip from the hero engraving, 5 s, 16:9, slow push-in, leaves and light moving, no people moving their mouths. Used muted and looped behind the hero with the still as poster and fallback.

Credits: preflight with `get_cost`. Stop at 300.

## 11. Deployment

1. `gh repo create ArtisanWorkshop-VitalPacific/heritage-readers --private`, push main.
2. Vercel: link the repo to a project named `heritage-readers` (team `team_5VVnzgzEWqUJvvJYNgEW4J2X`), framework Next.js, Node 22. OIDC on (default).
3. Env vars: none required. Optional `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `TUTOR_MODEL`.
4. After deploy: `GET /api/health` returns `{ tutor: 'gateway' | 'script', tts: 'elevenlabs' | 'browser' }`. Record the answer in the morning note.
5. Add `demo.heritagereaders.com` later if Matt buys the domain.

## 12. QA checklist

- iPhone Safari, iPad Safari, Mac Chrome: every route renders, no horizontal scroll, 16px gutters.
- Mic permission prompt appears once; denial leaves tap-to-mark working.
- Placement produces a rung for Nora near 8 when read correctly, lower when words are skipped.
- Lesson check marks a deliberately misread word for review, never says "wrong."
- Role switch to Student hides every adult control; Teacher cannot edit roles; Admin can.
- Referral: inviting, marking paid, ledger credit of one month each side, cap at 12.
- Print preview shows three pages with correct page breaks.
- Dark mode on report and admin; lesson stays light.
- `/api/health` reports the active tutor path.

## 13. Work breakdown

Phase 0, 30 min: repo, Next.js scaffold, tokens, fonts, globals.css, layout, Vercel project. Done when `/` deploys with the hero copy.
Phase 1, 2 h: state machine port with tests, lexicon and bank for rungs 1 to 20, corpus passages for rungs 1 to 20, placement scoring.
Phase 2, 2 h: components (Passage, VowelLadder, CourseLadder, DrillCard, Seal, Shelf, Mic, Tile, Sparkline, Engraving, Button).
Phase 3, 3 h: app shell, store, seeds, roles, onboarding, placement, drill, lesson, ladder.
Phase 4, 1.5 h: tutor route with gateway and script fallback, push-to-talk, TTS route, speech helpers.
Phase 5, 2 h: report, print packet, referrals, admin, teacher, settings.
Phase 6, 2 h: marketing pages with copy and illustrations, hero video.
Phase 7, 1 h: QA pass on three devices, dark mode, fixes, walkthrough doc, morning note.

Parallelizable: Phase 1 and Phase 2 together; illustration generation runs alongside everything.

## 14. Master prompt for the runner

"Build the Heritage Readers demo exactly as specified in docs/demo-gameplan.md. Start with Phase 0 and deploy after every phase. Use the token file for every color, size and duration. Student surfaces are light only and never show adult controls. The tutor route must never return a word on screen that fails the bank validator. Do not add gamification mechanics beyond those listed. Do not use licensed characters in any prompt. Stop and report at 300 Higgsfield credits. When a decision is ambiguous, choose the option that keeps the walkthrough complete and note it in docs/demo-walkthrough.md."

## 15. Say so in the demo

A small "Demo mode" line on adult surfaces: data lives in this browser; the voice is the browser voice unless ElevenLabs is configured; speech scoring is the browser's recognizer, not the child-tuned scorer; colors sampled from photographs pending scans.
