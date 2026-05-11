# RBAC Test Scenarios (QDR-55)

## Manual Testing Guide

This document outlines step-by-step test scenarios to verify RBAC enforcement at both middleware and database levels.

---

## Test Environment Setup

**Prerequisites:**
- Local development server running: `npm run dev` (port 3000)
- Test accounts created: see `setup-test-accounts.sql`
- Browser with developer tools (F12 for console, Network tab)

**Test Accounts:**

| Account | Email | Password | Expected Role |
|---------|-------|----------|----------------|
| Customer | test-customer@example.com | TestPassword123! | `customer` |
| Admin | test-admin@example.com | TestPassword123! | `admin` |

---

## Test Suite 1: Middleware Route Protection

### Scenario 1.1 -- Unauthenticated Access to Protected Routes

**Test:** Attempt to access `/customer/dashboard` without logging in

**Steps:**
1. Open browser: `http://localhost:3000/customer/dashboard`
2. Observe the redirect

**Expected Result:**
- ✅ PASS: Redirected to `/auth/login` immediately
- ✅ URL shows `localhost:3000/auth/login`

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 1.2 -- Unauthenticated Access to Admin Routes

**Test:** Attempt to access `/admin/floorplan` without logging in

**Steps:**
1. Open browser: `http://localhost:3000/admin/floorplan`
2. Observe the redirect

**Expected Result:**
- ✅ PASS: Redirected to `/auth/login`
- ✅ URL shows `localhost:3000/auth/login`

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

## Test Suite 2: Customer Role Access

### Scenario 2.1 -- Customer Login & Dashboard Access

**Test:** Sign in as customer, verify access to `/customer/dashboard`

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter credentials:
   - Email: `test-customer@example.com`
   - Password: `TestPassword123!`
3. Click "Sign In"
4. Observe the redirect and page

**Expected Result:**
- ✅ PASS: Redirected to `/customer/dashboard`
- ✅ Page displays "Welcome to Your Account" with customer email
- ✅ Browser console shows no errors
- ✅ Session cookie present (F12 > Application > Cookies > localhost)

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 2.2 -- Customer Blocked from Admin Routes

**Test:** Sign in as customer, attempt to access `/admin/floorplan`

**Steps:**
1. (Continue from Scenario 2.1 with customer logged in)
2. Navigate to `http://localhost:3000/admin/floorplan`
3. Observe the redirect

**Expected Result:**
- ✅ PASS: Redirected to `/auth/login`
- ✅ Session cookie is NOT cleared (customer is still logged in)
- ✅ URL shows `localhost:3000/auth/login`

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 2.3 -- Customer Can Sign Out

**Test:** Verify sign-out functionality clears session

**Steps:**
1. (Continue from Scenario 2.1 with customer on dashboard)
2. Click "Sign Out" button
3. Observe redirect and session state

**Expected Result:**
- ✅ PASS: Redirected to landing page (`/`)
- ✅ Session cookie cleared
- ✅ Attempting to access `/customer/dashboard` redirects to login

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

## Test Suite 3: Admin Role Access

### Scenario 3.1 -- Admin Login & Dashboard Access

**Test:** Sign in as admin, verify access to `/admin/floorplan`

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter credentials:
   - Email: `test-admin@example.com`
   - Password: `TestPassword123!`
3. Click "Sign In"
4. Observe redirect and page

**Expected Result:**
- ✅ PASS: Redirected to `/admin/floorplan`
- ✅ Page displays "Floor Plan Dashboard" with QDR-69/70 feature list
- ✅ Browser console shows no errors

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 3.2 -- Admin Can Access Customer Routes

**Test:** Verify admins can access customer pages if needed (implementation dependent)

**Steps:**
1. (Continue from Scenario 3.1 with admin logged in)
2. Navigate to `http://localhost:3000/customer/dashboard`
3. Observe the result

**Expected Result:**
- ℹ️ NOTE: Behavior depends on middleware design.
  - **Option A (Strict Separation):** Redirected to `/auth/login` (recommended)
  - **Option B (Admin Override):** Allowed access to see customer dashboard
- ℹ️ Document which option is implemented

**Actual Result:**
- [ ] Strict Separation (redirected)
- [ ] Admin Override (allowed)
- [ ] FAIL (describe):

---

### Scenario 3.3 -- Admin Can Access Public Routes

**Test:** Verify admin access to public landing page

**Steps:**
1. (Continue from Scenario 3.1 with admin logged in)
2. Navigate to `http://localhost:3000/`
3. Observe the result

**Expected Result:**
- ✅ PASS: Landing page loads without redirect
- ✅ Admin remains logged in (session persists)

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

## Test Suite 4: RLS Policy Verification (Database Level)

### Scenario 4.1 -- Customer Role: SELECT Own User Record

**Test:** Verify customer can query their own user record

**Prerequisites:**
- Supabase project dashboard open
- Service role key available (for comparison queries)

**Steps:**
1. Open browser DevTools Console (F12)
2. Create a Supabase client with customer session (anonKey)
3. Execute query:
   ```typescript
   const { data, error } = await supabase
     .from('users')
     .select('*')
     .single();
   
   console.log(data, error);
   ```
4. Observe result

**Expected Result:**
- ✅ PASS: Query returns only the customer's user record
- ✅ No error; data.id matches logged-in user
- ✅ data.email === 'test-customer@example.com'

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 4.2 -- Customer Role: SELECT Other Users (Should Fail)

**Test:** Verify customer cannot query other users

**Steps:**
1. (Continue from Scenario 4.1)
2. Execute query:
   ```typescript
   const { data, error } = await supabase
     .from('users')
     .select('*')
     .neq('id', supabase.auth.user().id); // Try to get other users
   
   console.log(data, error);
   ```
3. Observe result

**Expected Result:**
- ✅ PASS: Query returns empty array (no rows) or RLS policy error
- ✅ Customer cannot see other user records

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 4.3 -- Admin Role: SELECT All Users

**Test:** Verify admin can query all user records

**Steps:**
1. Sign out customer, sign in as admin (test-admin@example.com)
2. Open DevTools Console
3. Execute query:
   ```typescript
   const { data, error } = await supabase
     .from('users')
     .select('*');
   
   console.log(data?.length, error);
   ```
4. Observe result

**Expected Result:**
- ✅ PASS: Query returns all users (>= 2 for test accounts)
- ✅ data.length >= 2 (at least customer and admin test accounts)

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 4.4 -- Customer Role: INSERT Own Reservation

**Test:** Verify customer can insert a reservation

**Steps:**
1. Sign in as customer
2. Open DevTools Console
3. Execute query:
   ```typescript
   const { data, error } = await supabase
     .from('reservations')
     .insert({
       customer_id: '<customer_uuid>',
       reservation_date: '2026-05-15',
       start_time: '2026-05-15T19:00:00Z',
       end_time: '2026-05-15T21:00:00Z',
       party_size: 4,
       status: 'pending_payment'
     })
     .select()
     .single();
   
   console.log(data, error);
   ```
4. Observe result

**Expected Result:**
- ✅ PASS: Reservation is inserted successfully
- ✅ data.customer_id === logged-in user's UUID

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

### Scenario 4.5 -- Customer Role: Cannot INSERT Reservation for Another Customer

**Test:** Verify customer cannot create reservations for other users

**Steps:**
1. (Continue as customer from Scenario 4.4)
2. Get another customer's UUID (e.g., admin test account)
3. Execute query with different customer_id:
   ```typescript
   const { data, error } = await supabase
     .from('reservations')
     .insert({
       customer_id: '<OTHER_CUSTOMER_UUID>',  // NOT the logged-in user
       reservation_date: '2026-05-15',
       start_time: '2026-05-15T19:00:00Z',
       end_time: '2026-05-15T21:00:00Z',
       party_size: 4,
       status: 'pending_payment'
     })
     .select()
     .single();
   
   console.log(data, error);
   ```
4. Observe result

**Expected Result:**
- ✅ PASS: INSERT fails with RLS policy violation error
- ✅ error.code === 'PGRST301' (or similar policy error)
- ✅ No reservation is created

**Actual Result:**
- [ ] PASS
- [ ] FAIL (describe):

---

## Test Summary Template

Fill out this section after running all tests:

```markdown
## QDR-55: RBAC Testing Summary

### Test Run Date
[Date]

### Tester Name
[Your Name]

### Overall Status
- [ ] **ALL TESTS PASSED** ✅
- [ ] **SOME TESTS FAILED** ⚠️
- [ ] **CRITICAL FAILURES** ❌

### Test Results Breakdown

**Middleware Tests (Suite 1):**
- Scenario 1.1: [PASS / FAIL]
- Scenario 1.2: [PASS / FAIL]

**Customer Access (Suite 2):**
- Scenario 2.1: [PASS / FAIL]
- Scenario 2.2: [PASS / FAIL]
- Scenario 2.3: [PASS / FAIL]

**Admin Access (Suite 3):**
- Scenario 3.1: [PASS / FAIL]
- Scenario 3.2: [PASS / FAIL]
- Scenario 3.3: [PASS / FAIL]

**RLS Policies (Suite 4):**
- Scenario 4.1: [PASS / FAIL]
- Scenario 4.2: [PASS / FAIL]
- Scenario 4.3: [PASS / FAIL]
- Scenario 4.4: [PASS / FAIL]
- Scenario 4.5: [PASS / FAIL]

### Issues Found

[List any failures or unexpected behavior]

### Resolved

[List fixes applied]

### Sign-Off

RBAC verification complete. Implementation meets SEC-1 requirements.

**Status:** QDR-55 Complete ✅
```

---

*Last Updated: May 12, 2026*
