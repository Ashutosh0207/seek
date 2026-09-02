# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# EventSpark Agent Instructions

## Project

EventSpark is an event-based social/dating mobile application.

Users attend a real-world event, scan a QR code, join that event's
Social Room, discover other attendees, like them, match mutually,
and chat.

## Technology

Frontend:
- Expo
- React Native
- TypeScript
- Expo Router

Backend:
- Supabase
- PostgreSQL
- Supabase Auth
- PostgreSQL RPC functions
- Row Level Security
- Supabase Storage
- Supabase Realtime

## Core Flow

Authentication
→ Profile
→ Join Event
→ Discovery
→ Likes
→ Match
→ Chat

## Important Product Rules

- Profiles are global and reusable between events.
- Only admins can create events.
- Users become discoverable when they join an event.
- Discovery only shows eligible users in the same event.
- Discovery respects the viewer's interested_in preference.
- Likes are not anonymous.
- Incoming likes are visible on the Likes screen.
- Mutual likes create a match.
- Matches can chat.
- Profile photos are private.
- Profile photos use signed URLs.
- Do not expose exact user location or distance.

## Current Features

Implemented:
- signup
- login
- logout
- profile onboarding
- profile editing
- add profile photo
- replace profile photo
- delete profile photo
- QR scanning
- joining events
- discovery
- likes
- mutual matches
- matches screen
- messaging
- Supabase Realtime chat

## Architecture Rules

Use React Native for:
- UI
- navigation
- temporary screen state

Use Supabase Auth for:
- authentication

Use PostgreSQL/RPC for:
- multi-table or security-sensitive business logic

Use RLS for:
- data authorization

Use Supabase Storage for:
- profile photos

Use Supabase Realtime for:
- live messaging updates

General principle:

Client expresses intent.
Trusted backend validates and enforces important rules.

## Security Rules

Never:
- put a Supabase service-role key in the mobile application
- bypass RLS just to make something work
- move security-sensitive filtering purely to the frontend
- make private profile photos public

## Coding Rules

- Use TypeScript.
- Preserve existing behavior unless explicitly asked to change it.
- Read existing files before changing them.
- Prefer small scoped changes over large rewrites.
- Do not introduce packages unless needed.
- Explain architectural changes.
- Run lint/type checks after significant changes.
- Do not silently change database schema.

## Current Priority

Improve EventSpark's UI and UX while preserving existing functionality.