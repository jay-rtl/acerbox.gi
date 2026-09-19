# Owner booking emails

Customers use the existing homepage calendar, select an owner-published available date/time, fill in contact/project details and submit. The request and notification queue entry are saved in one transaction. Pending reservations continue to prevent double-booking. Reviews are unchanged.

The owner receives a plain-text notification at `Acerbox27@gmail.com`. Its Reply-To is the customer's validated email address, so the owner can click Reply in their email app and respond manually. No automatic customer email is sent. The homepage footer now links to the authenticated owner dashboard. This link does not bypass login.

## Enable on an approved staging deployment first

1. Import both migration SQL files in order into the separate staging database, or run the private migration CLI. Existing installations must apply `002_booking_mail.sql` before deploying the new booking code. No review schema or review data is changed.
2. In private `config.local.php`, set `mail_to` to the owner mailbox, `mail_from` to a real domain mailbox approved by Hostinger's email service, and `mail_enabled` to true. Use `env => production` on HTTPS staging, with its exact origin. Do not use a customer address as From, expose private config, or copy local credentials.
3. Confirm PHP mail delivery support and sender-domain authentication (SPF/DKIM) with Hostinger. This implementation uses the hosting PHP mail transport, not Gmail credentials. If the host requires authenticated SMTP instead, configure an appropriate transport before enabling delivery; do not assume PHP/database support proves mail support.
4. New submissions attempt delivery after the database commit. Configure an approved private CLI cron job every five minutes to retry failures: `php /absolute/private/path/bin/send-booking-mail.php --allow-send`. Never expose this script as a web endpoint. Configure its PHP binary and path for the host, not the original PC.
5. Verify a staging request reaches the owner's inbox, Reply goes to the customer, and rejection/retry preserves the request. Restrict staging access. No real emails or production changes were performed during local implementation.

Development/test configurations never send real emails. Email transport acceptance does not prove inbox delivery; check spam/bounces and the dashboard regularly. Queue status `accepted` means the transport accepted the message. A crash after transport acceptance but before the database update can result in a duplicate on retry (at-least-once delivery). The five-minute lease avoids ordinary concurrent duplicate sends. Failed notifications remain pending; monitor the private queue and host mail logs. Existing requests are not retrospectively emailed.

## Local tests

After verifying the isolated local PHP/MySQL environment, run the existing backend/browser/build suites and `php tests/booking-mail.php`. This extra test uses a fake sender and resets ONLY `acerbox_test` on loopback port 3307. Run sequentially with the other suites. It checks queue creation, safe local mode, failure/retry, owner recipient/Reply-To, content, accepted-message deduplication, unchanged pending status and header-injection rejection.

The previous completion report describes the initial version without notifications. This document supersedes only its email limitation. The private staging-path warning in HANDOFF.md still applies.

Verified locally for the initial email update: 10 fake-email checks, 54 backend integration checks, 40 browser checks and 6 compiled-build checks passed (110 total). Vite build and PHP syntax checks passed. No real email delivery was attempted. The feature-branch handoff includes this implementation; it is not a production deployment. See DEFAULT-AVAILABILITY.md for the latest combined verification results.
