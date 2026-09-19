# Available by default

Every day in the next 90 days now has default time slots, without the owner having to add availability first. Defaults: 9 AM–5 PM America/New_York, 30-minute consultations and two four-hour shoot windows. These are starting assumptions, configurable through private availability_start_hour, availability_end_hour, consultation_minutes and shoot_minutes. Default hours are not 24/7 availability.

The owner can block a whole date or a same-day time range from the protected dashboard, and unblock it later. Time ranges apply to both services: any overlapping slot is blocked. Existing pending/confirmed requests remain reserved and are not silently cancelled by blocking. Cancel a request separately to release its interval. Removing an individual time window is also persistent; regeneration does not reactivate it. Add that exact window again to restore it.

Apply migration 003_blocked_windows.sql after 001 and 002 on an approved isolated staging database before deploying this version. Reviews are unchanged. Email setup still follows BOOKING-EMAIL.md. No production files, production databases or GitHub main were changed.

Default intervals are persisted as slots when the calendar is loaded. Public responses cover the full horizon rather than truncating at 500 slots; authenticated management lists show the next 500 future windows. Blocking forms work for all dates in the horizon, even outside that list. Changing configuration creates new default intervals but does not erase existing intervals or owner exclusions: review existing availability before changing durations/hours on a deployed database.

Local test: `php tests/default-availability.php` resets only the isolated loopback acerbox_test database, verifies defaults, full horizon, time/date blocks, overlap protection, unblocking and persistence of removed slots. Run separately from other test suites. No real email is sent.

Verification for this update: 9 default-availability checks, 10 fake-email checks, 56 backend integration checks, 40 browser checks and 6 compiled-build checks passed (121 total), plus frontend build and PHP syntax checks. These results describe the original local PC. The feature-branch handoff includes this implementation; nothing has been deployed to production. Verify the environment and rerun relevant tests on the next PC.
