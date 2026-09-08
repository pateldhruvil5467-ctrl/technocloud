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
- `GET /api/v1/me/tracks` — the authenticated artist's own catalog,
  paginated/filterable, regardless of visibility
- `GET /api/v1/artists` — paginated, filterable, searchable artist
  directory

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

### Artists — v1

**`GET /api/v1/artists`** — no auth. Paginated, filterable, searchable
artist directory listing.

Query parameters (all optional; unrecognized parameters are ignored,
recognized ones are strictly validated — same whitelist/type-check
philosophy as `GET /api/v1/tracks`, see "Security" below):

| Parameter | Type                                          | Default  |
|-----------|------------------------------------------------|----------|
| `page`    | positive integer                                | `1`      |
| `limit`   | integer, `1`–`100`                              | `20`     |
| `sort`    | `newest` \| `oldest` \| `name_asc` \| `name_desc` | `newest` |
| `genre`   | string — matches an entry in the artist's `genres` array, exact/case-sensitive | — |
| `search`  | string, ≤100 chars — literal (escaped) substring match against `displayName` | — |

Response `200`:
```json
{
  "data": [ /* public-safe artist profile documents */ ],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```
Note this envelope's shape is deliberately distinct from
`GET /api/v1/tracks`'s (`pages` instead of `totalPages`, no
`hasNextPage`/`hasPreviousPage`) — this is the exact contract this
endpoint was built to, not an inconsistency to reconcile.

**Response fields** — each artist document is an explicit projection
(a MongoDB-level `.select()`, not post-fetch filtering), containing only:
`_id`, `displayName`, `bio`, `avatarKey`, `genres`, `artistTypes`,
`links`, `verified`, `createdAt`. `userId` — the internal reference to
the owning `User` account — is never selected and can never appear in
the response.

Errors: `400 { error: { code: "VALIDATION_ERROR", message } }` for any
parameter that fails validation (wrong type, out of range, not in its
enum, or an empty `genre`/`search`).

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
owner/authentication scoping — for that, see the next endpoint.

### Tracks — v1, owner-scoped

**`GET /api/v1/me/tracks`** — **auth required** (`Authorization` header,
same raw-token convention as everywhere else), role `ARTIST` or `ADMIN`
(matches the existing convention on `POST /api/tracks/upload` /
`PUT` / `DELETE`).

Returns only tracks owned by the **authenticated caller** — ownership is
resolved entirely server-side (JWT → `req.user.id` → `ArtistProfile`
lookup → that profile's tracks). No request body or query parameter can
influence *whose* tracks are returned; a client-supplied `?artistId=`,
`?owner=`, `?userId=`, or `?uploadedBy=` is either ignored outright (the
first three aren't in the validated whitelist at all beyond `artistId`,
which — see below — is always overwritten) or has no effect.

Same query parameters as `GET /api/v1/tracks` (`page`, `limit`, `sort`,
`genre`, `subgenre`, `isMix`, `visibility`, `search`), with one
difference: **no default `visibility` filter**. Omitting `visibility`
returns the artist's tracks in every state — `draft`, `public`,
`unlisted`, `takedown` — since this is the owner managing their own
catalog, not the public feed. An explicit `?visibility=draft` (etc.)
still narrows it down.

Response shape is identical to `GET /api/v1/tracks`:
`{ data, pagination }`.

Errors:
- `401` — no/invalid token
- `403` — authenticated but not `ARTIST`/`ADMIN`
- `404 { error: { code: "ARTIST_PROFILE_NOT_FOUND" } }` — authenticated
  as `ARTIST`/`ADMIN` but no `ArtistProfile` exists yet for this
  account. Deliberately **not** auto-created here — a `GET` shouldn't
  have that side effect; profile creation stays exclusive to the upload
  flow (`trackController.uploadTrack`).
- `400 { error: { code: "VALIDATION_ERROR" } }` — same query validation
  as the public endpoint.

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
- `GET /api/v1/me/tracks` resolves ownership the same way: a
  client-supplied `?artistId=` is parsed by the shared query validator
  (so a malformed one still gets a clean 400) but is then
  unconditionally overwritten with the server-resolved value in
  `controllers/v1/meController.js` before the query ever runs — the
  parsed value is never trusted, only ever discarded.
- `GET /api/v1/artists` follows the same query whitelist/type-check and
  regex-escaping rules as `GET /api/v1/tracks` (see
  `middleware/validateArtistQuery.js`), and additionally never returns
  `userId` — `services/artistService.js` selects an explicit public-field
  list at the MongoDB query level, so no internal field can reach the
  response regardless of what the `ArtistProfile` schema grows to
  contain later.

## Known limitations / natural next steps

- `GET /api/v1/tracks?visibility=draft` (etc.) still has no owner-scoped
  authentication — it's exactly as open as the legacy endpoint for any
  explicitly-requested visibility. Use `GET /api/v1/me/tracks` for the
  authenticated, owner-scoped equivalent (added — see above). The
  frontend Studio (`client/src/pages/StudioPage.js`) does not consume it
  yet; it still fetches everything from `GET /api/tracks` and filters by
  `artistId` client-side. Migrating it is a separate, frontend-only
  follow-up.
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
