# EventSpark Product

## Purpose

EventSpark helps people meet other people attending the same
real-world event.

## Main User Journey

1. User creates an account.
2. User creates their global profile.
3. User uploads a profile photo.
4. User attends an event.
5. User scans the event QR code.
6. User joins the Social Room.
7. User discovers eligible attendees.
8. User can like another attendee.
9. The recipient can see incoming likes.
10. Mutual likes create a match.
11. Matches can chat.

## Profiles

Profiles are global and reusable.

Current fields include:
- first name
- date of birth
- gender
- interested in
- about me
- profile photo

## Discovery

Users only see eligible people participating in the same event.

Current discovery card shows:
- photo
- first name
- age
- about me
- Like button

Discovery must respect the viewing user's interested_in setting.

Example:

Male user
interested_in = Female

→ should not receive Male profiles in Discovery.

## Likes

Likes are not anonymous.

If User A likes User B:
- User B can see User A on the Likes screen.

If User B likes User A back:
- a match is created.

## Matches

A match represents a mutual like.

## Chat

Matched users can exchange messages.

Messages persist in PostgreSQL.

Supabase Realtime delivers new messages live.

## Photos

Profile photos are private.

They are stored in the profile-photos bucket.

The database stores the Storage path rather than a public URL.

The app generates signed URLs to display photos.