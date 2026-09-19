# Continue on another PC or Codex account

This branch contains the local PHP/MySQL reviews and booking implementation. It is not a production deployment. Do not merge or push to `main`: the existing GitHub workflow deploys `main` automatically.

## Download

Clone this repository and check out `feature/php-booking-reviews`. Run `npm ci`, then `npm run build`. Node is needed for the frontend build, not the production backend.

Local PHP, MariaDB binaries, database contents, sessions, and generated credentials are deliberately NOT in GitHub. A fresh clone does not have a working database or admin password. On the new PC, first check for existing PHP 8.2+ and MySQL/MariaDB support (Herd, Docker, XAMPP, Laragon or equivalent). Do not install software without approval or connect to production for testing. Follow `docs/FEATURES.md`; its verified Windows paths describe the original PC and may need adapting. Do not run local bootstrap scripts against an unrelated database.

## Give the next Codex session this instruction

> Read docs/HANDOFF.md, docs/FEATURES.md and docs/COMPLETION-REPORT.md first. Keep the Vite/vanilla frontend and same-origin PHP/PDO/MySQL architecture. Verify this PC's development environment before running backend setup. Work on the feature branch only. Do not push main, trigger production deployment, upload production files, or access/modify production databases. Never commit credentials. Help me finish an isolated Hostinger staging preview, one step at a time.

## Hosting progress

Latest availability behavior: future dates are available by default, with owner-managed date/time blocks. Read DEFAULT-AVAILABILITY.md and apply migration 003 after 001/002 on approved staging. This supersedes the original manual-only availability setup.

The user created `staging.acerboxbuilds.com` in Hostinger. Its document root was shown as `public_html/staging`. No feature files or database were deployed by Codex. File Manager currently redirects the user to an expired-session login screen; Hostinger support may be needed to restore access.

IMPORTANT: That staging directory is nested inside the live site's public root. The generic sibling-folder deployment example in FEATURES.md assumes a document root named public_html. Do NOT place private backend files or credentials beside this nested staging folder: they could be exposed through the live domain. Before any staging upload, arrange genuinely private storage outside the entire public_html tree and adapt the API loader's private path (or ACERBOX_PRIVATE_DIR) to the staging backend. Keep staging database credentials, sessions and secrets separate from production.

The old acerbox-hostinger.zip is not the new full-stack release. GitHub Pages cannot execute this PHP backend. Production SEO URLs also need updating as part of a separately approved release.

## Verification record

The original PC passed 54 backend checks, 40 browser checks and 6 compiled-build checks (100 total), plus the Vite build and syntax checks. This is a previous-machine result, not proof of correctness on a new machine or Hostinger. Repeat relevant tests after environment setup. Physical iPhone Safari/Android QA remains outstanding.

Owner booking email notifications have since been implemented; see BOOKING-EMAIL.md for the new migration, private configuration, retry cron and mail-host verification requirements. They are disabled locally by default and have not been tested for real inbox delivery. No automatic customer email or external calendar integration is enabled. Reviews are pending until Jake approves them. Pending bookings reserve capacity until confirmed or cancelled. See FEATURES.md for the full operational details.
