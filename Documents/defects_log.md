# Gordon Ramsay Restaurant Reservation System - Defects Log

> **Status:** Active
> **Owner:** Qdreon
> **Purpose:** Track QA defects found during Phase 7 verification and release readiness checks.

---

## 2026-05-13 - QA Kickoff

| ID | Date | Area | Severity | Description | Status | Notes |
|----|------|------|----------|-------------|--------|-------|
| DEF-001 | 2026-05-13 | RBAC / QDR-55 | None | Automated RBAC verification passed with no defects. | Closed | Customer and admin access control behaved as expected after environment variables were loaded. |
| DEF-002 | 2026-05-13 | Auth / Sign Out | Medium | Customer sign-out fails; logout request aborted and user remains on dashboard. | Open | Browser console shows `net::ERR_ABORTED` on POST to Supabase logout endpoint and a `Multiple GoTrueClient instances` warning. |
| DEF-003 | 2026-05-13 | Email / DMARC | High | Booking confirmation emails blocked by recipient DMARC policy due to unauthenticated sender domain. | Open | **Issue:** Email sent via SendGrid Web API to mickel.castroverde0@gmail.com was rejected with DMARC bounce: `550 5.7.26 Unauthenticated email from usc.edu.ph is not accepted due to domain's DMARC policy.` **Root Cause:** Sender address `24102411@usc.edu.ph` is not SPF/DKIM authenticated with SendGrid; email originated from SendGrid IP (149.72.123.24), not USC infrastructure. **Impact:** Production emails will be bounced if sent from institutional email that is not authenticated. **Resolution:** (1) Use SendGrid-authenticated sender domain (e.g., noreply@grr.com or SendGrid-provided domain); (2) Configure SPF/DKIM records for usc.edu.ph with SendGrid; (3) Use SMTP relay instead (if SPF allows). **QA Note:** Dev/QA testing can use generic domain or SendGrid's test address; production must use verified domain. |
