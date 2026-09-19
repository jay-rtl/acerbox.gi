# Acerbox feature completion report

## 1. Status

Completed for local review and testing. Hostinger staging/production deployment remains explicitly unperformed and requires approval. Physical-device Safari/Android QA and verification of the actual hosting runtime are still release checklist items.

## 2. Architecture used

Existing Vite/vanilla frontend + small same-origin PHP API + PDO/MySQL-compatible InnoDB storage. No framework replacement, Laravel, WordPress, React, Firebase, Supabase, Node application backend, CRM, payments, or customer portal.

Only `public/api/index.php` is public PHP. Backend source and credentials belong outside the public web root. Browser/admin pages use explicit API DTOs; sensitive management actions are authorized server-side. [Full architecture and setup](FEATURES.md).

## 3. Existing stack discovered

One-page HTML, modern CSS, JavaScript ES modules, GSAP/ScrollTrigger, Vite 7 and npm. Main/responsive/animation styles use Acerbox's existing variables, Inter/Space Grotesk, orange accent, editorial headings, dark backgrounds, and motion conventions. Existing contact is email/social links, not a form/email backend. No prior database, authentication, admin area, automated tests, or staging environment.

## 4. Testimonial feature

- Public name, 1–5 native radio star selector, and plain-text review form.
- Name 2–100 characters; integer rating 1–5; review 10–2,000 characters; validation in browser and PHP.
- Submissions persist as pending, even if a visitor sends an approved status.
- Jake can approve, unpublish, and permanently delete reviews.
- Only approved name/rating/review text appear in the public endpoint and editorial quote layout. No pending rows, fingerprints, IPs, or admin metadata are returned.
- Honest awaiting-approval success message, loading/validation/network/error states, honeypot, minimum submission time, rate limits, duplicate checks, and safe output rendering.
- No fake testimonials seeded into the development preview or static content.

## 5. Booking feature

- Consultation Call or Shoot Day; choose date, available time/window, name/email, optional phone/notes.
- Accessible native service/time selectors and a lightweight custom month/date interface. Dates indicate available, booked, unavailable/blocked/past. Selected date/time reset when the type changes or availability refreshes.
- Date-specific windows controlled by Jake; configurable consultation duration defaults to 30 minutes. Shoot windows explicitly reserve 1–12 hours, not a pretending-to-be-30-minute shoot slot.
- All schedule UI uses America/New_York (South Florida); intervals persist in UTC.
- Requests default to pending and reserve the complete interval until cancellation. Success does not falsely claim confirmation.
- Transactional global booking-row lock, overlap detection across types, server-side revalidation, and active-slot unique constraint prevent double booking. Independent-worker concurrent requests are tested.
- Confirm/cancel management and private contact/notes details; public availability exposes no customer data.

## 6. Admin management

Local compiled management URL: http://127.0.0.1:8084/admin.html

Vite development management URL: http://127.0.0.1:5173/admin.html

Open the ignored local `.local/admin-credentials.txt` for Jake's randomly generated local sign-in details. Password is not printed in this report or embedded in frontend code.

After sign-in:

- Reviews: Pending/Approved/All filters; Approve, Unpublish, Delete.
- Bookings: Upcoming/Pending/Confirmed/Cancelled/All filters; expand details, Confirm, Cancel/reject.
- Availability: add consultation/shoot windows, remove windows, block dates, unblock dates.
- Sign out clears displayed private data and removes server authorization.

Removing/blocking availability does not silently cancel existing requests. Cancelled requests cannot be reopened accidentally. No automatic email is sent; Jake follows up directly.

## 7. Database/storage

Separate local `acerbox_dev` and `acerbox_test` databases on loopback port 3307; tests never use live production or reset development data.

Additive/idempotent `backend/migrations/001_features.sql` creates:

| Table | Important constraints/indexes |
| --- | --- |
| ab_reviews | Rating CHECK, unique duplicate fingerprint, pending/approved enum, status/publication index |
| ab_slots | Unique type/start/end, end-after-start CHECK, active/date index |
| ab_bookings | Slot FK, status enum, generated active reservation UNIQUE, interval/status index |
| ab_blocked_dates | Date primary key |
| ab_booking_lock | Singleton row for transactional serialization |
| ab_rate_limits | HMAC bucket primary key and expiry index |
| ab_migrations | Additive migration identifier |

Production migration was not run. DDL can auto-commit; rollback should retain tables/submissions. Dropping feature tables destroys data and needs separate authorization. Runtime PDO uses parameterized statements and UTC database time.

## 8. API/backend changes

Entrypoint: `api/index.php?route=ROUTE`.

| Method | Routes |
| --- | --- |
| GET public/session | context, reviews, availability |
| POST public/session | reviews, bookings, login |
| POST authenticated | logout |
| GET authenticated | admin/reviews, admin/bookings, admin/availability |
| POST authenticated reviews | admin/reviews/approve, admin/reviews/unpublish, admin/reviews/delete |
| POST authenticated bookings | admin/bookings/confirm, admin/bookings/cancel |
| POST authenticated availability | admin/availability/add, admin/availability/remove, admin/availability/block, admin/availability/unblock |

Every mutation requires session CSRF, exact Origin matching when an Origin is supplied, JSON request size/type checks, and appropriate authorization. Generic errors expose no credentials, SQL, or stack traces. [Endpoint behavior/statuses](FEATURES.md#api-surface).

## 9. Frontend changes

- Acerbox-native review display and review submission form.
- Accessible star rating fieldset.
- Booking service/calendar/date/time/contact flow and state feedback.
- Book anchor in desktop/mobile navigation.
- Separate lightweight management page with authentication, moderation, booking lists, and availability controls.
- Feature/admin styles reuse existing variables and buttons. GSAP public reveals and reduced-motion behavior are retained; admin imports the reduced-motion rules too.
- Existing unrelated content, portraits, premium film controls, logo, portfolio, footer, contact links, and animations were not rewritten.

## 10. Files created

```text
admin.html
backend/api.php
backend/bootstrap.php
backend/reviews.php
backend/availability.php
backend/bookings.php
backend/config.example.php
backend/bin/migrate.php
backend/bin/password-hash.php
backend/migrations/001_features.sql
public/api/index.php
scripts/local-setup.php
scripts/php-router.php
scripts/php-built-router.php
scripts/test-setup.php
scripts/start-database.ps1
scripts/start-local.ps1
scripts/start-browser-test.ps1
scripts/start-built-preview.ps1
src/css/features.css
src/css/admin.css
src/js/api.js
src/js/features.js
src/js/admin.js
tests/backend.test.mjs
tests/browser.mjs
tests/build-smoke.mjs
tests/db-tools.php
docs/FEATURES.md
docs/COMPLETION-REPORT.md
```

Ignored runtime-only additions: `backend/config.local.php`, portable MariaDB/data, generated local admin credentials, sessions, logs, Chrome profile, and screenshots under `.local`. None belong in a commit or hosting upload.

## 11. Files modified

`.gitignore`, `README.md`, `index.html`, `package.json`, `src/js/main.js`, `vite.config.js`.

No changes to `.github/workflows/deploy-pages.yml`, the original main/responsive/animation CSS, original animation/navigation/media modules, production data, DNS, or hosting files. Historical `acerbox-hostinger.zip` intentionally unchanged.

## 12. Dependencies added

Zero npm/PHP package dependencies added. PHP/PDO and Node's built-in test/fetch/WebSocket support suffice. Existing installed Chrome supplies headless browser QA through CDP, avoiding a calendar/admin framework or browser-testing package. The approved portable MariaDB download is an ignored local tool, not a frontend dependency/system service. Existing Herd PHP was reused.

## 13. Security controls

Password hashing/verification on the server; no frontend credential checks. HttpOnly/SameSite=Strict sessions, Secure cookies in production, strict session mode, session/CSRF regeneration at sign-in, idle/absolute timeout, logout, password-hash rotation invalidating old admin sessions. Server authorization on every management route.

CSRF/Origin protection; 8 KiB JSON limit; server validation; prepared SQL; no-store responses; generic safe errors; DOM textContent rendering and escaped JSON transport; honeypot; two-second minimum session age; database-backed rate limits and review duplicate fingerprint. Rate-limit metadata stores keyed HMAC buckets, not raw IPs; forwarded IP headers are not implicitly trusted. Expired buckets cleaned in bounded batches.

Private config/backend source excluded from public build. Vite denies serving private source/config and ignores locked local files. Test reset helpers refuse non-loopback, wrong-port, wrong-name, or non-test targets. No production connection is built into local setup/tests.

## 14. Responsive/manual QA results

Chrome checked public and management pages at 320, 375, 390, 430, 768, 1024, 1280, and 1440px: no horizontal overflow. Review radios accept actual keyboard input. Native required/email validation and visible feedback verified. Contact focus restoration and mobile menu checked.

Captured mobile and desktop screenshots were visually reviewed for Acerbox-native typography/spacing/form/calendar presentation. Screenshots: `.local/screenshots/public-mobile.png` and `.local/screenshots/booking-desktop.png`.

Chrome viewport emulation is not physical-device Safari or Android testing. Those engines/devices remain a pre-release QA requirement, not claimed as passed.

## 15. Automated test results

| Suite | Passed | Failed |
| --- | ---: | ---: |
| PHP/MySQL backend integration (`npm run test:backend`) | 54 | 0 |
| Chrome UI/regression (`npm run test:browser`) | 40 | 0 |
| Compiled PHP/asset/privacy smoke (`npm run test:build`) | 6 | 0 |
| Total | 100 | 0 |

Backend covers pending/approved privacy, invalid ratings/name/text, honeypot/minimum time/rate limits, CSRF/Origin, oversized bodies, authorization, approve/unpublish/delete, XSS-as-text, booking validation, forged slot/date/status, past/unavailable/blocked windows, cross-type overlap, simultaneous worker conflicts, confirmation/cancellation, private DTOs, login/logout, and login abuse limits.

Browser covers real public submissions and honest pending messages; moderation/approval/public display/deletion; service/date/time selection; management confirm/cancel; availability add/block/unblock; network error/retry; keyboard stars; responsive layouts; sign-out; reduced/normal-motion regression; no uncaught browser exceptions.

Compiled smoke checks relative JS/CSS paths, management assets, real PHP private-backend resolution, anonymous admin denial, no public config/local files, and existing logo/portrait/video paths.

## 16. Build result

`npm run build` passed. Vite builds public/admin pages plus static assets and the public PHP loader. No private backend/config/secrets enter dist. Main JS approximately 125 KB (49 KB gzip); admin JS approximately 5 KB (2 KB gzip), loaded only on management page. No calendar framework added.

PHP source syntax checks and `git diff --check` passed. No existing lint/formatter script was present, so none is falsely reported as run. No dependency install was necessary.

## 17. Regression result

Homepage structure, navigation/mobile menu, premium film playback without native controls, portfolio presence, contact dialog/focus restore, CTA/social/email links, footer, canonical presence, and existing entrance animation checked. Build-relative asset paths checked against a PHP-served compiled preview. No uncaught browser exceptions.

Existing missing placeholder hero/work media remain existing intentional fallback behavior; no unrelated assets/content replaced. Canonical/social/sitemap/robots URLs still target GitHub Pages, as discovered in the audit; no production SEO configuration changed.

## 18. Local preview

- Compiled frontend + PHP: http://127.0.0.1:8084/
- Compiled Jake management: http://127.0.0.1:8084/admin.html
- Vite development frontend: http://127.0.0.1:5173/
- Vite Jake management: http://127.0.0.1:5173/admin.html

Both review previews use `acerbox_dev`. Configure availability in Jake's local management page to test booking. Local-only sign-in details are in `.local/admin-credentials.txt`. [Restart commands](FEATURES.md#restart-after-closing-the-local-processes).

Test-only UI/server ports are 5174/8081/8082/8083. Do not mistake test fixtures for actual clients. No staging site deployed.

## 19. Environment variables

Equivalent example: `backend/config.example.php`; generated development config is ignored. Host configuration requires env/origin, DB host/port/name/user/password, admin username/password hash, private application key, timezone, optional session path and consultation minutes. The public loader also accepts a private backend directory override. [Exact variable names](FEATURES.md#private-configuration). No SMTP variables are required because no email infrastructure was added.

## 20. Deployment requirements

Explicit approval, backed-up host files/data, verified supported PHP/DB versions/extensions, separate staging DB/user, private backend folder outside public_html, new host-specific secrets/Jake password hash, HTTPS, manual additive migration, built static files/public PHP loader, and staging security/functional/concurrency checks before any later approved production rollout.

Do not deploy through the current GitHub Pages workflow. Do not upload local configs/tools/tests or use the old static ZIP for this release. Keep a restricted runtime DB user; use separate migration privileges. [Detailed staging/deployment checklist and directory layout](FEATURES.md#staging--eventual-deployment-checklist--manual-approval-required).

## 21. Known limitations

No automatic email, recurring availability engine, overnight shoots, automatic pending expiry, Google/Teams integration, 2FA/password-recovery email, multi-admin roles, payments, or CRM. Pending reservations need Jake's timely review. Public reviews cap 50; public availability/admin lists cap 500; add pagination if needed. Strong single-account credentials and host-level staging access restrictions are required. Physical devices and actual Hostinger staging remain untested. Proxy-aware rate limiting must be explicitly reviewed if hosting hides visitor addresses behind one proxy IP. Production-domain SEO migration remains separate.

## 22. Future-ready items

Booking creation, availability/conflict logic, review management, API transport, and UI are separated. Future notifications/calendar/meeting adapters can consume successful UTC bookings/status transitions after transaction commit. Add durable outbox/idempotency for remote side effects; never hold reservation locks while calling Google Calendar/Meet/Teams. No integration implemented speculatively.

## 23. Production status

**Nothing was deployed or pushed to production.**

No GitHub push, main-branch push, workflow trigger, commit, live database creation/modification, production upload, DNS change, or change to acerboxbuilds.com. All source changes remain local/uncommitted for review. Existing user work was clean at start and no destructive Git operation was used.
