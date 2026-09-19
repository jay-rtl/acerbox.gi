# Reviews and booking: local setup and safe staging

Availability now defaults to open future dates with owner-managed date/time blocks. See DEFAULT-AVAILABILITY.md for current behavior; it supersedes the original manual-only slot setup below. Owner email setup is described in BOOKING-EMAIL.md.

These features have NOT been deployed. No GitHub push is required for local work. Do not push `main`: the existing workflow deploys it automatically.

## Architecture

The existing Vite/vanilla frontend and GSAP are retained. `public/api/index.php` is the only publicly deployed PHP file. It loads a separate private PHP backend using PDO/MySQL. Runtime PHP and database credentials must remain **outside the public web root**.

Requirements: PHP 8.2+ with PDO/MySQL, mbstring, JSON, sessions, password hashing; MySQL 8.0+ or MariaDB 10.6+ with InnoDB. Node is required only to build/test the static frontend, not to host it. No new packages were installed.

## Verified local environment

- Existing Herd PHP 8.4.25 and `pdo_mysql` are used. Herd does not imply that this project uses Laravel.
- Approved portable MariaDB 11.4.12 is in `.local/mariadb-11.4.12-winx64/`.
- It listens ONLY on `127.0.0.1:3307`; there is no Windows service, firewall change, or production connection.
- `acerbox_dev` is for preview; `acerbox_test` is for automated tests.
- Separate database users are scoped to those databases. The local bootstrap root password exists only for the private portable instance; never reuse it on staging/production.
- All data files, logs, sessions, screenshots, and generated credentials are ignored under `.local/`. `backend/config.local.php` is also ignored.

Current preview: http://127.0.0.1:5173/

Jake management: http://127.0.0.1:5173/admin.html

Compiled PHP-served preview: http://127.0.0.1:8084/ and http://127.0.0.1:8084/admin.html (same development database). Start it after building with `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-built-preview.ps1`; verify it with `npm run test:build`. Unlike `npm run preview` alone, this server actually executes the PHP entrypoint.

Read `.local/admin-credentials.txt` for the randomly generated **local-only** username/password. No credential is embedded in the frontend or example config. The development database has no seeded testimonials or booking requests. Sign in and create availability to try booking.

### Restart after closing the local processes

From the project root in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-database.ps1
php backend/bin/migrate.php
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

Run `php scripts/local-setup.php` only if the generated local config is missing. This loopback-only script creates dev/test users and private credentials; it does not contact production. Do not rerun start scripts while their ports are occupied. Do not upload `scripts/` or `.local/` to hosting.

The PHP API runs on 8080; Vite on 5173 proxies `/api`. Vite excludes `.local` and backend files from its watcher and denies serving private files. PHP uses a development router which serves API routes only, not private source files.

### Automated checks

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -Tests
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-browser-test.ps1
npm run test:backend
npm run test:browser
npm run build
git diff --check
```

Tests reset ONLY `acerbox_test` on `127.0.0.1:3307`. This reset uses ordered DELETE statements, not DROP/TRUNCATE; it never resets the development database. Clearly fake fixtures remain in the isolated test database only. Run suites sequentially because each resets the same test database.

Backend workers: 8081 and 8082, with allowed Origin `http://127.0.0.1:8081`. Independent workers exercise simultaneous reservation requests.

Browser QA: frontend 5174 proxies test-only API 8083; neither connects to the development or production database. Headless installed Chrome is driven using Node's built-in WebSocket/CDP support, with an ignored local profile and screenshots. Optional `PHP_BINARY` and `CHROME_BINARY` environment variables override binary paths on other machines. The default Windows PHP test path matches this verified Herd installation.

No test/lint/formatting framework existed before this work. PHP syntax validation is `php -l` on PHP files. Browser tests are Chrome desktop with mobile-sized viewport emulation, not physical-device Safari testing.

## Jake's management flow

1. Sign in at `/admin.html`. This is a real server-authenticated session; hiding a frontend panel is not authorization.
2. Reviews: filter Pending/Approved/All; Approve publishes, Unpublish returns to pending, Delete permanently removes the review (confirmation required).
3. Bookings: filter Upcoming/Pending/Confirmed/Cancelled/All. Expand contact/project details. Confirm pending requests or Cancel/reject pending/confirmed requests. Cancelled requests cannot be reopened; request a new slot instead.
4. Availability: add individual consultation slots or longer shoot windows. Consultations default to 30 minutes, configurable to 15/30/45/60. Shoot windows are manually chosen, 1–12 hours within one day. All dates/times are America/New_York. Windows must start within the next 90 days.
5. Remove a window to stop accepting requests for that time. Block a date to stop new bookings for that date; Unblock restores it. Removing/blocking availability does **not** silently cancel existing requests.
6. Confirm/cancel and follow up directly by email/phone. No automatic mail is sent.

Pending requests reserve their whole interval until Jake cancels them; confirmation preserves that reservation. Overlaps are checked across both booking types, not just identical slot IDs. No recurring rules, overnight windows, staff assignment, CRM, billing, payments, automatic meetings, or calendars are introduced.

## Private configuration

Use `backend/config.example.php` as the equivalent of `.env.example`. Copy to a private `config.local.php`, or provide environment variables (these override that file). Never upload a development config as production config.

| Environment variable | Purpose |
| --- | --- |
| `ACERBOX_PRIVATE_DIR` | Absolute private backend directory; optional if using the sibling layout below |
| `ACERBOX_ENV` | development/test/production; production makes session cookies Secure |
| `ACERBOX_ORIGIN` | Exact frontend origin including scheme/port, no path; HTTPS on production |
| `ACERBOX_TIMEZONE` | America/New_York by default |
| `ACERBOX_DB_HOST`, `ACERBOX_DB_PORT` | Database connection address |
| `ACERBOX_DB_NAME`, `ACERBOX_DB_USER`, `ACERBOX_DB_PASSWORD` | Private database credentials |
| `ACERBOX_ADMIN_USERNAME` | Jake's login username |
| `ACERBOX_ADMIN_PASSWORD_HASH` | Server-side password hash, never a plaintext password |
| `ACERBOX_APP_KEY` | At least 32 random characters; rate-limit HMAC key |
| `ACERBOX_CONSULTATION_MINUTES` | 15/30/45/60; default 30 |
| `ACERBOX_SESSION_PATH` | Optional private writable PHP session directory |

For a new strong admin password, feed it privately through stdin to `php backend/bin/password-hash.php`. Store only the resulting hash in private configuration. Rotate the application key separately. A changed password hash invalidates existing admin sessions on the next request.

Production session cookies are HttpOnly, SameSite=Strict, Secure. Admin sessions regenerate on login, rotate CSRF tokens, expire after 30 minutes idle or 8 hours absolute, and lose authorization on logout/password rotation. The example file and local files must not be publicly downloadable.

## API surface

All routes use `api/index.php?route=ROUTE`. GET is read-only; POST accepts JSON and requires session CSRF (`X-CSRF-Token`). Public successful submissions return 201. Validation errors are 422, CSRF/origin failures 403, unauthenticated admin access 401, reservation/duplicate conflicts 409, rate limits 429, oversized bodies 413, and backend outages 503.

| Method | Route | Access / behavior |
| --- | --- | --- |
| GET | context | Session CSRF, current authentication boolean, timezone, booking types |
| GET | reviews | Only approved name/rating/plain review text; maximum 50 |
| POST | reviews | Submit pending review; caller status is ignored |
| GET | availability | Public windows/statuses, blocked dates, timezone; no customer details |
| POST | bookings | Submit pending booking, validating the stored slot and entire interval |
| POST | login | Rate-limited credential verification and session regeneration |
| POST | logout | Authenticated sign-out |
| GET | admin/reviews | Authenticated moderation list |
| POST | admin/reviews/approve | Authenticated publication |
| POST | admin/reviews/unpublish | Authenticated return to pending |
| POST | admin/reviews/delete | Authenticated permanent deletion |
| GET | admin/bookings | Authenticated private booking details |
| POST | admin/bookings/confirm | Authenticated pending-to-confirmed |
| POST | admin/bookings/cancel | Authenticated cancellation/rejection |
| GET | admin/availability | Authenticated window/block management data |
| POST | admin/availability/add | Authenticated creation/reactivation of a window |
| POST | admin/availability/remove | Authenticated deactivation of a window |
| POST | admin/availability/block | Authenticated blocked date |
| POST | admin/availability/unblock | Authenticated removal of date block |

All admin lists are capped at 500 records. Add pagination if volume reaches that point. Public availability is limited to 500 windows in the 90-day horizon.

## Storage and concurrency

Migration `backend/migrations/001_features.sql` creates only prefixed feature tables:

- `ab_reviews`: pending/approved statuses, rating CHECK, duplicate fingerprint UNIQUE, public-status index.
- `ab_slots`: availability intervals in UTC, unique type/start/end window, active/date index.
- `ab_bookings`: private contact details, notes, pending/confirmed/cancelled statuses, copied reserved interval, slot foreign key. Generated `reservation_slot` is unique while pending/confirmed; cancelled rows do not retain that reservation.
- `ab_blocked_dates`: date primary key.
- `ab_booking_lock`: singleton row serializes reservation and availability/booking-status mutations.
- `ab_rate_limits`: privacy-preserving HMAC buckets and expiration index; expired records cleaned in bounded batches during requests.
- `ab_migrations`: additive migration record.

InnoDB transaction + `SELECT ... FOR UPDATE` on the shared lock row prevents concurrent overlapping reservations even when requests target different overlapping slots. Availability is checked again inside the transaction; the frontend calendar is never trusted. Intervals use half-open overlap logic, so adjacent non-overlapping bookings are allowed. Timezones convert to UTC for storage, local South Florida time for selection. Invalid/nonexistent local date/time values are rejected.

SQL DDL may auto-commit on MySQL/MariaDB. The migration is idempotent/additive but not advertised as transactionally reversible. Back up first before any later approved deployment. Roll back code while keeping tables and submissions; dropping these tables would destroy feature data and requires separate explicit authorization.

Prepared statements follow [PHP PDO guidance](https://www.php.net/manual/en/pdo.prepared-statements.php). Transactional lock behavior follows [MariaDB FOR UPDATE documentation](https://mariadb.com/docs/server/reference/sql-statements/data-manipulation/selecting-data/for-update).

## Security and privacy

Server repeats required/type/length/rating/email/date/time/notes validation. It never trusts caller statuses, admin flags, or availability. JSON bodies are capped at 8 KiB. Review text is 10–2,000 characters; names 2–100; notes max 2,000; email max 254; optional phone max 40 with conservative character validation.

Visitors must have a valid same-origin session CSRF token; foreign Origin headers are rejected. No CORS allowance is added. A honeypot and two-second minimum session age deter simple bots. IP-based database-backed limits are 6 review attempts and 8 booking attempts per ten-minute bucket after validation; login is 5 attempts per 15-minute bucket. Duplicate review text/name/rating is rejected. Raw IP addresses are not stored; only keyed HMAC buckets. Forwarded IP headers are never implicitly trusted. If the host reverse-proxies all requests through one IP, assess trusted proxy configuration separately rather than trusting arbitrary visitor headers.

Visitor text is rendered with DOM `textContent`; JSON transport escapes HTML-sensitive characters. Pending reviews, fingerprints, and private booking contact details never appear in public DTOs. API errors expose no stack traces/SQL/credentials; private logs use non-sensitive reference IDs. Sensitive responses are no-store. No mail provider, analytics, CAPTCHA, or other external submission dependency is introduced.

## Staging / eventual deployment checklist — manual, approval required

1. Obtain explicit deployment approval. Do not push `main` to deploy these PHP features: GitHub Pages hosts only static assets and will not execute this API.
2. Create a separate staging subdomain/site and **separate staging database/user** in Hostinger; do not point staging at production data. Use HTTPS and an exact staging origin. Isolate session storage and use different secrets/passwords from production.
3. Back up existing files/data before any approved production rollout. Confirm PHP and DB versions/extensions and host session storage.
4. Apply the additive SQL migrations in filename order (001_features.sql, 002_booking_mail.sql, 003_blocked_windows.sql) manually to the intended staging database, using migration privileges. Prefer a separate runtime user limited to SELECT/INSERT/UPDATE/DELETE on the feature tables after setup. See BOOKING-EMAIL.md for owner email configuration and retry setup.
5. Build locally with `npm run build`. Copy the contents of `dist/` into the staging document root ONLY after approval.
6. Copy backend source files/migrations to a private sibling folder, excluding `config.local.php`. Example:

```text
domain/
  public_html/
    index.html
    admin.html
    api/index.php
    assets/...
  acerbox-private/
    api.php
    bootstrap.php
    reviews.php
    bookings.php
    availability.php
    config.local.php   <-- newly configured host credentials, never local ones
    migrations/...
    bin/...
```

The public loader defaults to this sibling folder. If using another path, set `ACERBOX_PRIVATE_DIR`. Never put credentials under public_html or rely only on `.htaccess` to conceal them.

7. Configure production env/origin, private app key, new Jake password hash, restricted DB credentials, timezone, and private writable session storage. Test that config/backend paths are inaccessible publicly.
8. Verify HTTPS, secure session cookies, CSRF, moderation, public DTO privacy, availability, simultaneous requests, and asset paths on staging. Configure Jake's actual availability manually; no fake reviews should be imported.
9. SEO canonical/social/robots/sitemap URLs in the existing repository still point to GitHub Pages. Plan their change to the correct domain separately as part of an approved final rollout; no production SEO/DNS was changed here. Protect staging from indexing and restrict access at hosting level.
10. Do not upload `.local`, scripts, tests, node_modules, a development config, or the historical `acerbox-hostinger.zip`. That existing static archive was intentionally left unchanged and does not represent this full backend release.

## Limitations / future extension

- Owner booking notification emails are implemented but require private host mail configuration and delivery testing; see BOOKING-EMAIL.md. No automatic customer email or meeting link. Jake replies manually; the UI honestly says pending request.
- Date-specific windows only; no recurring rule engine, automated pending expiry, or overnight shoots.
- Pending requests require Jake's timely review; cancellation releases capacity.
- Single admin account; no user portal, password recovery email, roles, or 2FA. Protect the account with a strong unique password and limit staging access.
- Bounded management/public lists; pagination can be added as volume grows.
- Real iPhone Safari/Android-device testing remains a release checklist item; Chrome viewport emulation is not equivalent to testing those engines.
- No Node server or installed MariaDB service on production; use Hostinger PHP/database support.
- Google Calendar/Meet/Teams can later connect through a separate integration/notification adapter after successful booking transaction completion. Reuse stored UTC intervals and statuses; add an outbox/idempotency layer for external side effects rather than doing remote calls while holding the reservation lock.
