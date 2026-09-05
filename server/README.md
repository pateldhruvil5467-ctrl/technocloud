# TechnoCloud API

A modular-monolith Express + MongoDB backend. This document covers
configuration, the versioning strategy, and every endpoint.

## Configuration

All environment variables are read once, centrally, in `config/env.js`
(no controller/middleware reads `process.env` directly anymore). Copy
`.env.example` to `.env` and fill in real values — see that file for
the full list and defaults. `MONGO_URI` and `JWT_SECRET` are the only
two required values; startup fails immediately and clearly if either is
missing. Everything else has a safe local-development default.

## Versioning strategy

`/api/v1/*` is the canonical API going forward. It does **not** yet
duplicate every legacy resource — only the endpoints that actually
needed new capability this phase:

- `GET /api/v1/tracks` — paginated, filterable, sortable track listing
- `GET /api/v1/health` — liveness/readiness

The legacy `/api/*` routes (`/api/auth`, `/api/tracks`, `/api/users`,
`/api/artists`) are **unchanged** and remain in place as the
compatibility layer the existing frontend consumes today
(`client/src/services/*Api.js`, `Dashboard.js`). In particular, `GET
/api/tracks` still returns a **bare array**, not `{data, pagination}` —
several existing frontend call sites depend on that exact shape, and
changing it would be a breaking change with no compensating benefit
this phase.

Deliberately **not** done this phase: duplicating `POST
/api/tracks/upload`, `PUT /api/tracks/:id`, or `DELETE /api/tracks/:id`
under `/api/v1/tracks/*`. None of those needed pagination, filtering, or
any other v1-motivated capability — mirroring them would be pure route
duplication with no new behavior, which only adds surface area to keep
in sync. If/when a real reason to move them arises (a genuine contract
change), do it then, not preemptively.

## Endpoints

### Health

**`GET /api/v1/health`** — no auth.

Response `200` (database connected) or `503` (not connected):
```json
{ "status": "ok", "uptime": 123.4, "database": "connected" }
```
No secrets, connection strings, or infrastructure details are ever
included.

### Auth (legacy, unversioned — unchanged)

**`POST /api/auth/register`** — no auth. Rate-limited (see
`AUTH_RATE_LIMIT_*`).

Body: `{ username, email, password }` (`role` is accepted but silently
ignored — public registration always creates a `USER`). Validation:
username 1–50 chars, email must look like an email (≤254 chars),
password 8–128 chars.

Response `201`: `{ id, username, email, role }`.
Errors: `400 { message }` for a duplicate email or invalid input.

**`POST /api/auth/login`** — no auth. Rate-limited.

Body: `{ email, password }`.
Response `200`: `{ token, user: { id, username, role } }`. The JWT
itself carries `{ id, username, role }` and is sent back on
subsequent requests as a **raw** `Authorization` header value (no
`Bearer ` prefix).
Errors: `400 { message }` for an unknown email, wrong password, or
missing/invalid password.

### Users (legacy, unversioned — unchanged)

**`GET /api/users/me`** — auth required.

Response `200`: `{ id, username, email, role }`, plus `artistProfile`
when the caller is an `ARTIST` with one already created (there is none
until their first successful track upload).

### Artists (legacy, unversioned — unchanged)

**`GET /api/artists/:id`** — no auth.

Response `200`: `{ artistProfile, tracks }` — `tracks` is filtered to
`visibility: "public"` only.
Errors: `400 { error: { code: "INVALID_ID", message } }` for a
malformed id; `404 { message }` for a well-formed but nonexistent one.

### Tracks — legacy (unversioned — unchanged)

**`GET /api/tracks`** — no auth. Returns **every** track, every
visibility, unfiltered, sorted newest-first — a **bare array**, not
paginated. Kept exactly as-is for existing frontend compatibility; use
`GET /api/v1/tracks` for anything new.

**`POST /api/tracks/upload`** — auth required, role `ARTIST` or
`ADMIN`. Multipart form: `title`, `artist`, `audio` (file, MP3 only,
≤`UPLOAD_MAX_BYTES`). Response `201`: `{ message, track }`.

**`PUT /api/tracks/:id`** — auth required, role `ARTIST`/`ADMIN`,
ownership enforced (an `ARTIST` may only edit their own track; `ADMIN`
may edit any). Body (all optional, only present fields change):
`title`, `artist`, `genre`, `subgenre`, `tags` (string array),
`isMix` (boolean), `visibility` (`draft`/`public`/`unlisted`/
`takedown`). Response `200`: `{ message, track }`.

**`DELETE /api/tracks/:id`** — auth required, role `ARTIST`/`ADMIN`,
ownership enforced. Response `200`: `{ message }`.

Errors on the last three: `400 { error: { code: "INVALID_ID" } }` for a
malformed id, `400 { error: { code: "VALIDATION_ERROR" } }` for an
invalid body value, `403 { message }` for a role/ownership failure,
`404 { message }` for a track that doesn't exist.

### Tracks — v1

**`GET /api/v1/tracks`** — no auth.

Query parameters (all optional; unrecognized parameters are ignored,
recognized ones are strictly validated — see "Security" below):

| Parameter    | Type                                                   | Default  |
|--------------|---------------------------------------------------------|----------|
| `page`       | positive integer                                        | `1`      |
| `limit`      | integer, `1`–`100`                                       | `20`     |
| `sort`       | `newest` \| `oldest` \| `title_asc` \| `title_desc`       | `newest` |
| `genre`      | string                                                   | —        |
| `subgenre`   | string                                                   | —        |
| `artistId`   | valid ObjectId                                           | —        |
| `isMix`      | `"true"` \| `"false"`                                    | —        |
| `visibility` | `draft` \| `public` \| `unlisted` \| `takedown`           | `public` |
| `search`     | string, ≤100 chars — literal (escaped) substring match against `title`/`artist` | — |

Response `200`:
```json
{
  "data": [ /* track documents */ ],
  "pagination": {
    "page": 1, "limit": 20, "total": 42, "totalPages": 3,
    "hasNextPage": true, "hasPreviousPage": false
  }
}
```
An out-of-range `page` returns an empty `data` array with accurate
`pagination`, not an error. Ordering is always tiebroken by `_id` so
pagination stays stable even when multiple tracks share a timestamp or
title.

Errors: `400 { error: { code: "VALIDATION_ERROR", message } }` for any
parameter that fails validation (wrong type, out of range, not in its
enum).

**Note on `visibility` default:** unlike the legacy endpoint (which
returns every visibility unfiltered), this endpoint defaults to
`public`-only when `visibility` isn't specified — a deliberately safer
default for a "canonical, going-forward" endpoint. An explicit
`?visibility=draft` (etc.) still works, with no additional
owner/authentication scoping yet — see Known Limitations.

## Error format

Any error that reaches the global error handler (`middleware/
errorHandler.js`) — new v1 routes, new validation middleware, or any
genuinely unexpected exception anywhere — responds as:
```json
{ "error": { "code": "SOME_CODE", "message": "Human-readable message." } }
```
This does **not** apply to the legacy `/api/auth/*`, `/api/tracks/*`
(existing paths), `/api/users/me`, or `/api/artists/:id` (existing
paths) responses that already had their own explicit try/catch —
those keep their pre-existing `{ message }` (or, for a couple of
`trackController.js` paths, `{ error: "..." }` as a string) shapes
exactly as before, to avoid a silent frontend-breaking change.

Unmatched routes (anything not listed above) return a clean
`404 { error: { code: "NOT_FOUND", message } }` instead of Express's
default plain-text 404 page.

## Security notes

- Query parameters for `GET /api/v1/tracks` are whitelisted and
  type-checked before ever reaching a Mongo query — a value is rejected
  outright unless it is a plain string (or, for `page`/`limit`, a
  string of digits) matching its expected shape. This is verified
  against this app's actual query parser (Express 5's default "simple"
  parser): it does not build nested objects from bracket notation the
  way Express 4 + `qs` did, but it does turn a repeated key
  (`?limit=10&limit=20`) into an array, which the type check rejects.
- `search` is escaped before being used in a `$regex`, so it can only
  ever match a literal substring — never construct an
  attacker-controlled pattern or operator.
- JWTs are read from a raw `Authorization` header (no `Bearer` prefix)
  — this is the existing, established convention; both `login` and
  every frontend service already use it this way.
- `artistId`, `uploadedBy`, and `role` are never accepted from request
  bodies for mutation — they are always resolved server-side from the
  authenticated identity (see `trackController.uploadTrack`,
  `requireTrackOwnership.js`). Adding request validation this phase did
  not change or widen any controller's field allowlist.

## Known limitations / natural next steps

- `GET /api/v1/tracks?visibility=draft` (etc.) has no owner-scoped
  authentication — it's currently exactly as open as the legacy
  endpoint for any explicitly-requested visibility. A real "my tracks"
  endpoint (scoped to the authenticated artist) is a reasonable next
  step once the frontend Studio actually needs one.
- Full-text `search` is a plain, escaped, case-insensitive regex match
  against `title`/`artist`. This is appropriate at the current catalog
  size; MongoDB Atlas Search (or a native `$text` index) is the
  documented scaling path once catalog size or query complexity
  justifies it — not implemented preemptively.
- `GET /api/v1/health` is a single combined liveness/readiness check.
  If this app is ever deployed behind an orchestrator (Kubernetes, ECS)
  that wants to distinguish "process is alive" from "ready to serve
  traffic," split it into two endpoints then — not needed for a single
  Node process today.
- No dedicated index on `genre`/`subgenre` yet — current data volume
  and selectivity don't justify the extra write/storage cost. Add one
  once genre-filtering becomes a heavily-used, high-cardinality query
  path (see `models/Track.js`'s index comments).
