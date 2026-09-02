# EventSpark Architecture

## Frontend

Expo + React Native + TypeScript.

Expo Router provides file-based navigation.

Important screens include:

- app/index.tsx
- app/signup.tsx
- app/login.tsx
- app/profile-setup.tsx
- app/add-photo.tsx
- app/home.tsx
- app/edit-profile.tsx
- app/join-event.tsx
- app/event-preview.tsx
- app/discover.tsx
- app/likes.tsx
- app/matches.tsx
- app/chat.tsx

## Backend

Supabase provides:

- Authentication
- PostgreSQL
- RPC
- Row Level Security
- Storage
- Realtime

## Important Tables

- users
- profiles
- events
- event_participants
- likes
- matches
- messages
- notifications
- blocks
- reports

## Important RPC Functions

- join_event
- send_like
- get_discovery_profiles
- get_received_likes
- get_matches
- send_message
- get_messages

## Discovery Architecture

React Native calls:

get_discovery_profiles(eventId)

PostgreSQL determines which profiles are eligible.

The frontend should not reproduce security-sensitive discovery logic.

## Photos

Bucket:

profile-photos

The bucket is private.

Path structure:

USER_UUID/profile-TIMESTAMP.jpg

profiles.photo_path contains the Storage path.

Signed URLs are used when displaying images.

## Chat

Messages are written using send_message().

Message history is loaded using get_messages().

Supabase Realtime subscribes to INSERT events for the current match.

PostgreSQL remains the durable source of truth.

## Security

Authentication answers:

Who are you?

RLS answers:

Which database rows may you access?

RPC functions enforce:

Business operations involving security or multiple tables.