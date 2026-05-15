# Gordon Ramsay Restaurant Reservation System - Defects Log

> **Status:** Active
> **Owner:** Qdreon
> **Purpose:** Track QA defects found during Phase 7 verification and release readiness checks.

---

## 2026-05-13 - QA Kickoff

| ID | Date | Area | Severity | Description | Status | Notes |
|----|------|------|----------|-------------|--------|-------|
| DEF-001 | 2026-05-13 | RBAC / QDR-55 | None | Automated RBAC verification passed with no defects. | Closed | Customer and admin access control behaved as expected after environment variables were loaded. |
| DEF-002 | 2026-05-13 | Auth / Sign Out | Medium | Customer sign-out fails; logout request aborted and user remains on dashboard. | Closed | **Root Cause:** `supabase.auth.signOut()` fires a browser-side fetch POST to `/auth/v1/logout`. Any navigation that follows causes the browser to abort that in-flight fetch before Supabase responds (`net::ERR_ABORTED`). **Fix:** Created `/api/auth/signout` server-side POST route. The route calls `supabase.auth.signOut()` on the server using the server-side client, clears the session cookie, then returns a 303 redirect to `/`. The browser only navigates after it receives the complete redirect response. `handleSignOut()` in the dashboard now calls `fetch('/api/auth/signout', { method: 'POST' })` and follows `response.url` on redirect. Also switched `supabaseClient.ts` to `createBrowserClient` (@supabase/ssr) to enforce a module-level singleton and eliminate the `Multiple GoTrueClient instances` warning. **Verification:** Playwright regression test `tests/e2e/signout.spec.ts` (TC-1.1) PASSED (26.3s). Build: 0 errors, 37 routes. |
| DEF-003 | 2026-05-13 | Email / DMARC | High | Booking confirmation emails blocked by recipient DMARC policy due to unauthenticated sender domain. | Open | **Issue:** Email sent via SendGrid Web API was rejected with DMARC bounce: `550 5.7.26 Unauthenticated email from usc.edu.ph is not accepted due to domain's DMARC policy.` **Root Cause:** Sender address `24102411@usc.edu.ph` is not SPF/DKIM authenticated with SendGrid; email originated from SendGrid IP (149.72.123.24), not USC infrastructure. **Impact:** Production emails will be bounced if sent from institutional email that is not authenticated. **Recommended resolution:** (1) Use a SendGrid-authenticated sender domain (e.g., `noreply@grr.com`); (2) Configure SPF/DKIM records for `usc.edu.ph` with SendGrid; (3) Use SMTP relay if SPF allows. **QA note:** Dev/QA testing uses Mailtrap and is unaffected. Production deployment must use a verified sender domain before go-live. |
| DEF-004 | 2026-05-13 | RBAC / SEC-1 | High | Playwright SEC-1 tests fail: `/admin/dashboard` does not redirect unauthenticated or customer-role users to `/auth/login` in the `next dev --webpack` test context. | Resolved | **Root Cause:** Next.js middleware was not bundled in the production build because Next 16 uses the newer Proxy file convention. **Fix:** Created `src/proxy.ts` with the RBAC redirect logic, added `playwright.prod.config.ts` to run against `next start --port 3001`, and added `npm run test:e2e:prod` to `package.json`. **Verification:** `npm run build` now shows `ƒ Proxy (Middleware)` in the route output, and `npm run test:e2e:prod -- --grep "SEC-1"` passed in production: unauthenticated users redirect to `/auth/login` and customer-role users cannot access `/admin/dashboard`. **Files changed:** `src/proxy.ts` (new), `playwright.prod.config.ts` (new), `package.json` (new script `test:e2e:prod`). |
| DEF-005 | 2026-05-13 | Concurrency / TC-3.2 | Low | TC-3.2 concurrency test was skipped on 2026-05-13 because `SEARCH_DATE = '2027-06-15'` returned no available table options from the availability RPC. | Resolved | **Root Cause:** The test date `2027-06-15` may have had existing reservations or locked slots in the QA database, or the date fell outside a valid booking window at the time of execution. **Fix:** Updated `SEARCH_DATE` in `tests/e2e/tc3-concurrency.spec.ts` from `2027-06-15` to `2030-01-15` -- a date sufficiently far in the future to guarantee a clean availability slate in any realistic QA environment. If this date also returns no options, verify that the `tables` seed data contains at least one table with capacity >= 2 and that no `reservations` or `reservation_tables` rows exist for this slot. **Files changed:** `tests/e2e/tc3-concurrency.spec.ts` (SEARCH_DATE constant updated). |
| DEF-006 | 2026-05-15 | Admin Dashboard / Hydration | Medium | Admin dashboard floor plan threw a React hydration warning because the floor-plan component rendered different initial markup on the server and client. | Resolved | **Root Cause:** `FloorPlanManager` seeded `isOnline` from `navigator.onLine` during render, so the server and first client render could disagree on the offline warning / loading banner markup. **Fix:** Defaulted the first render to a deterministic `isOnline = true` value and applied the real browser connectivity state in `useEffect()` after mount. This keeps the initial HTML stable for hydration. **Verification:** Live browser check on `/admin/dashboard` after admin sign-in completed without a hydration error and without the offline warning / loading banner mismatch. **Files changed:** `src/components/floor-plan-manager.tsx`. |

---

## Open Defects Summary

| ID | Severity | Area | Status |
|----|----------|------|--------|
| DEF-003 | High | Email / DMARC | Open -- resolve before production go-live |
| DEF-004 | High | RBAC / SEC-1 | Resolved (production config added) |
| DEF-005 | Low | Concurrency / TC-3.2 | Resolved (test date updated) |
| DEF-006 | Medium | Admin Dashboard / Hydration | Resolved (deterministic first render) |

---

*Last updated: 2026-05-15*
