# FitQuest

Private, single-user adaptive fitness trainer. The local-first app implements a deterministic training system: a complete 30-day anchor-and-rotation plan, readiness scoring, exercise-specific load estimation, set-by-set autoregulation, recovery and pain safeguards, a guided muscle-specific post-workout cooldown, daily offline meditation with history and streaks, optional Spotify App Remote playlist control, expected-versus-performed workout energy ranges, plan history, XP, measurements, activity, manual nutrition, weekly review, workout history, backup/import, Android packaging, and light/dark modes. Every catalog exercise includes both a looping movement demonstration and a selected YouTube technique guide.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm test
npm run build
```

## Architecture

- React + TypeScript + Vite UI
- IndexedDB via Dexie for private local records
- Pure TypeScript domain engine in `src/domain/engine.ts`
- Asia/Kolkata local-date keys, injected dates in engine tests
- Plan versions remain separate from actual workout records
- Manual meal estimates retain source and confidence instead of pretending to be exact
- Export/import uses a validated versioned JSON schema and stable record IDs
- The optional AI instructor calls Groq directly; no FitQuest server exists
- The Android app stores the user-supplied Groq key with Android Keystore and excludes it from backups

## Optional AI instructor

The AI instructor is deliberately non-essential. The local rules remain authoritative for training loads, readiness, pain safeguards, and plan adaptation. Before every AI request, FitQuest shows an item-by-item context picker. The user can choose recommended records, any other records, no records, or one-time information, then inspect the exact JSON payload before sending it once. A local receipt records which fitness records were shared; the API key is never placed in that payload.

The fixed hosted model is Groq's `openai/gpt-oss-20b`. A local scope gate blocks obvious unrelated requests, while a strict response schema restricts displayed answers to training, recovery, nutrition, exercise form, and fitness progress. This reduces misuse but cannot make a probabilistic model infallible.

## Android package

The Capacitor wrapper targets Android 7.0 (API 24) or newer. Build it with:

```bash
npm run native:sync
cd android
gradlew.bat assembleDebug testDebugUnitTest
```

The installable APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The repository never contains a Groq key, signing password, exported health backup, or local SDK.

## Exercise guidance

Every programmed exercise has a matched looping demonstration and a selected YouTube technique guide. Most loops come from ExerciseDB OSS; a few use credited StrengthLog, SELF, or GIPHY media where ExerciseDB depicted a different variation. YouTube tutorials are embedded with `youtube-nocookie.com` only after the user opens them. External media needs internet and may change or disappear.

Android updates keep the same `app.fitquest.personal` application ID, HTTPS Capacitor origin, and `fitquest` IndexedDB name. Install the new APK over the existing app without uninstalling or clearing storage. The Day 3 light workout confirmed by the owner is credited once on existing installs, even when its check-in is absent; the training calendar and dashboard both read that completion record. Export a backup from Settings before changing phones or removing the app.

Earned XP is shown immediately in a brief on-screen message with the reason and new total. The header shows the saved total on every screen, and the dashboard shows recent awards.

The first campaign is fixed to 21 Nov–20 Dec 2026. Starting weight is stored as a profile estimate—not an observation—and waist stays unknown until measured.

## Current limits

The local rule engine owns progression, recovery, schedule changes, set-by-set decisions and safety constraints. It uses only recorded observations, provides reasons and confidence, and does not invent missing measurements.

Cloud sync and verified wearable ingestion are intentionally absent. Browser reminder delivery is best-effort and platform-dependent. The service worker caches the application shell after a production visit. Exported JSON backups contain private health records and are not independently encrypted. ExerciseDB demonstrations and YouTube guides require internet; all training logic and saved records remain usable without them. Groq availability and free-tier limits are controlled by Groq and can change.

FitQuest supports consistent decisions and logging; it cannot guarantee a body-composition, strength, medical, or attendance outcome in 30 days.
