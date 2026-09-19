# Email-only booking (current flow)

This supersedes the automatic owner-email and dashboard-submission flow in earlier documents.

Customers choose an available date/time on the existing calendar and fill out the form. Continue to email prepares a mailto draft addressed to Acerbox27@gmail.com with the service, date/time/timezone and contact/project details. Customers MUST click Send in their own email application. Jake replies manually. The website cannot verify the draft opened or the email was sent.

No customer booking data is POSTed to the API, saved in the booking database, queued as an owner notification or used to reserve time. The old public POST bookings route returns HTTP 410 so old clients cannot create reservations inadvertently. Reviews and their moderation are unchanged. Existing pre-change bookings remain manageable and continue to affect availability; no historic data was deleted.

The protected owner dashboard is now review-only, as explicitly requested: no booking list, confirmation/cancellation controls, availability forms or booking/availability fetches. Existing database records are preserved, and protected backend compatibility endpoints remain; no data was deleted. The homepage calendar still reads default availability and respects existing blocks/reservations. There is currently no dashboard UI to change those blocks. After agreeing an appointment by email, Jake manages his schedule manually outside this dashboard. Multiple customers can request the same currently open time by email; this flow has no atomic reservation/double-booking guarantee. Availability is indicative until Jake confirms it.

No hosting email sender or automatic-mail configuration is required for this flow. The calendar, availability management and reviews still need the same-origin PHP/MySQL backend. Keep automatic mail disabled and do not configure/run the old email retry cron for this email-only version. If replacing an already deployed version, explicitly stop its retry cron and review pending historic notifications without deleting bookings/reviews.

Form values stay in the page for retry; they are not persisted in localStorage. Customers can copy the complete draft to Gmail or another email service if no email app is configured. Long encoded drafts use copy/paste instead of risking mailto truncation. Clipboard-denied browsers can select/copy the readonly draft manually. Email application behavior varies; actual device/email-app testing remains required before launch.

Local verification commands: npm run test:email-draft, npm run test:backend, npm run test:browser, npm run build, npm run test:build. Run database suites sequentially with the verified isolated local environment. Old internal reservation/queue tests describe legacy compatibility, not the current public flow.

Verified locally for the initial email-only update: 4 email-draft checks, 41 backend integration checks, 42 browser checks and 6 compiled-build checks passed (93 total). Frontend build, PHP syntax and JavaScript syntax checks passed. Browser tests intercepted mailto navigation rather than launching a real mail application; actual customer-device/email-app testing remains outstanding. This implementation is included in the feature-branch handoff, not a production deployment.

Subsequent review-only dashboard update: frontend rebuild passed, all 39 current browser checks and 6 compiled-build checks passed, including review approval/deletion, authenticated login/logout, review-only DOM, email-only draft/copy flows and mobile widths. Admin JavaScript syntax and diff whitespace checks passed. Admin no longer fetches booking/availability data. This UI change did not delete database data.

Separate user-approved local cleanup later removed the two old booking records and one linked email entry from the original PC's loopback development database, after saving a verified private backup. Reviews and availability were checked unchanged. This was local database maintenance, not a migration: GitHub does not include that database, its backup or the cleanup script, and pulling this branch does not delete records on another PC or host.
