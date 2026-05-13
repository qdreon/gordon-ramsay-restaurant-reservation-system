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
