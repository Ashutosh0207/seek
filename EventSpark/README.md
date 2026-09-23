# EventSpark

EventSpark is an event-based social and dating application built with Expo,
React Native, TypeScript, Expo Router, and Supabase.

People join a real-world event by scanning its QR code, enter that event's
Social Room, discover eligible attendees, send visible likes, form mutual
matches, and chat.

## Requirements

- Node.js compatible with the Expo version in `package.json`
- Expo Go or an Android/iOS development environment
- A configured Supabase project

## Environment

Create a local `.env` file containing:

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-publishable-or-anon-client-key
```

`EXPO_PUBLIC_SUPABASE_KEY` must be a publishable/anonymous client key. Never
place a Supabase service-role key or any other secret in an `EXPO_PUBLIC_`
variable because values with that prefix are included in the client app.

## Run locally

```bash
npm install
npm start
```

Scan the development-server QR code with Expo Go, or use one of the platform
scripts:

```bash
npm run android
npm run ios
npm run web
```

## Validation

```bash
npx tsc --noEmit
npm run lint
```

## Architecture

The React Native application owns UI, navigation, and temporary screen state.
Supabase Auth owns authentication; PostgreSQL RPC functions enforce event,
discovery, like, match, and message operations; RLS authorizes data access;
Supabase Storage keeps profile photos private; and Supabase Realtime delivers
live chat updates.

Profile records store private Storage paths rather than public URLs. The app
requests short-lived signed URLs when it needs to render a profile photo.

See the project documentation for more detail:

- [`docs/PRODUCT.md`](docs/PRODUCT.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md)

## Backend source-of-truth note

This repository currently does not contain Supabase migrations, RPC
definitions, RLS policies, or Storage policies. Those backend definitions must
be reviewed in the configured Supabase project before production deployment.
