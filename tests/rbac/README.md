# RBAC Testing Suite (QDR-55)

This directory contains comprehensive tests for Role-Based Access Control (RBAC) enforcement in the Gordon Ramsay Restaurant Reservation System.

## Overview

RBAC is implemented at two levels:

1. **Middleware Level** (`middleware.ts`) -- Route protection based on user role
2. **Database Level** (RLS policies) -- Row-level security policies in Supabase

## Test Files

| File | Purpose |
|------|---------|
| `setup-test-accounts.sql` | SQL script to create test user accounts with different roles |
| `test-scenarios.md` | Manual test scenarios for route access and RLS verification |
| `middleware-routes.test.ts` | (Optional) Jest tests for middleware route protection |

## Quick Start

### 1. Create Test Accounts

Execute the SQL script in the Supabase SQL Editor:

```bash
# Copy contents of setup-test-accounts.sql
# Paste into Supabase dashboard > SQL Editor > Run
```

This creates:
- **test-customer@example.com** with role `customer`
- **test-admin@example.com** with role `admin`

Both use password: `TestPassword123!`

### 2. Test Route Access (Middleware)

Follow the manual test scenarios in `test-scenarios.md`:
- Unauthenticated access to protected routes
- Customer access to `/customer/*` (should pass)
- Customer access to `/admin/*` (should fail)
- Admin access to `/admin/*` (should pass)

### 3. Verify RLS Policies (Optional)

Use `supabase-js` client with test accounts to verify table-level access:
- `signIn()` as customer → query `public.reservations` (own only)
- `signIn()` as admin → query `public.reservations` (all)

## Test Results Template

```markdown
## RBAC Test Results -- [Date]

### Middleware Tests

- [x] Unauthenticated /customer/dashboard → Redirect to /auth/login
- [x] Customer /customer/dashboard → Success (200)
- [x] Customer /admin/floorplan → Redirect to /auth/login
- [x] Admin /admin/floorplan → Success (200)

### RLS Policy Tests (Database Level)

- [x] Customer role SELECT users (own only) ✓
- [x] Admin role SELECT users (all) ✓
- [x] Customer role INSERT reservations (own) ✓
- [x] Customer role UPDATE reservations (own only) ✓

### Conclusion

RBAC enforcement: **PASS** ✓

**Verified by:** [Your Name]
**Date:** [Date]
**Status:** QDR-55 Complete
```

## Troubleshooting

**Issue:** `role` column is NULL after signup
- **Cause:** Auth trigger `on_auth_user_created` may not have fired
- **Fix:** Manually update `public.users` SET role = 'customer' WHERE id = 'user-uuid'

**Issue:** `/admin/*` redirects to login even for admin account
- **Cause:** Middleware cannot fetch role from database
- **Fix:** Check Supabase server credentials in `.env.local`; verify `public.users` table has row for user

**Issue:** "Row Level Security violation" on SELECT query
- **Cause:** User role does not match RLS policy
- **Fix:** Check RLS policies in Supabase > Authentication > Policies; verify `is_admin()` function exists

## Next Steps

After RBAC testing passes:
1. Move to QDR-39: Implement Checkout Modal (5-minute timer)
2. Expand Phase 3 tasks (QDR-59-61, QDR-82)
